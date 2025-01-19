import { wordpressPublishService, WordPressPublishService } from './wordpress.publish.service';
import { PostSchedule } from '../../../models/PostSchedule';
import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from '../../../models/BlogPost';
import { ErrorBuilder } from '../../../utils/errors/ErrorBuilder';
import { User } from '../../../models/User';
import { IWordPressSite } from '../../../models/interfaces/UserInterface';
import { shopifyPublishService, ShopifyPublishService } from './shopify.publish.service';


export class SchedulePublishService {
  constructor(
    private wordpressPublishService: WordPressPublishService,
    // private wixPublishService: WixPublishService
    private shopifyPublishService: ShopifyPublishService
) {}

  async schedulePost(
    userId: string, 
    blogPostId: string, 
    siteId: string, 
    platform: SYSTEM_PLATFORM,
    scheduleDates: Date[]
  ) {
    // Validate dates are in future
    const now = new Date();
    const invalidDates = scheduleDates.map(date => new Date(date)).filter(date => date <= now);
    if (invalidDates.length > 0) {
      throw ErrorBuilder.badRequest('Schedule dates must be in the future');
    }

    // check if the siteId belongs to the user
    const user = await User.findById(userId)
    if(!user) throw ErrorBuilder.notFound('User not found')

    // Validate platform-specific requirements
    if (platform === SYSTEM_PLATFORM.wordpress) {
        // Check if user has WordPress platform and sites
        if (!user.platforms?.wordpress?.sites) {
            throw ErrorBuilder.badRequest('No WordPress sites found for user');
        }

        // Verify the site exists for this user
        const siteExists = user.platforms.wordpress.sites.some(
            (site: IWordPressSite) => site.siteId === Number(siteId)
        );
        
        if (!siteExists) {
            throw ErrorBuilder.badRequest('WordPress site not found or unauthorized');
        }
    }

    // validate if siteId belongs to user in the shopfity platform
    if(platform === SYSTEM_PLATFORM.shopify){ 
        const shopifyId = user?.oauth?.shopify.find((shop: any) => shop._id.toString() == siteId)
        if(!shopifyId) throw ErrorBuilder.notFound('Shopify ID not found')
    }

    // check if the blog post exists
    const blogPost = await BlogPost.findById(blogPostId)
    if(!blogPost) throw ErrorBuilder.badRequest('Blog post not found')

    
    // Create schedule entries
    const schedules = await Promise.all(
      scheduleDates.map(date => 
        PostSchedule.create({
          userId,
          blogPostId,
          siteId,
          platform,
          scheduledDate: date
        })
      )
    );

    return schedules;
  }

  // This will be called by your cron job
  async processScheduledPosts() {
    const now = new Date();
    const lockTimeout = new Date(Date.now() - 5 * 60000); // 5 minutes ago

    console.log('Processing scheduled posts at', now)
    const schedules = await PostSchedule.find({
      status: PUBLISH_STATUS.pending,
      scheduledDate: { $lte: now },
      $or:[
            { processingLock: { $exists: false } },
            { processingLock: { $lte: lockTimeout } }
        ]
    });

    for (const schedule of schedules) {
        // Add lock
        await PostSchedule.findByIdAndUpdate(schedule._id, {
            processingLock: new Date()
        });
      try {
        //** */ modify this to handle other platforms
        if(schedule.platform === SYSTEM_PLATFORM.wordpress){
            if(!schedule.siteId){
                throw ErrorBuilder.badRequest('Site ID is required for WordPress posts');
            }
          await this.wordpressPublishService.publishBlogPost(
            schedule.userId,
            schedule.siteId,
            schedule.blogPostId.toString()
          );
        }

        if(schedule.platform === SYSTEM_PLATFORM.shopify){ 
            if(!schedule.siteId){
                throw ErrorBuilder.badRequest('Site ID is required for Shopify posts');
            }
            
            await this.shopifyPublishService.publishBlogPost(
                schedule.userId,
                schedule.siteId,
                schedule.blogPostId.toString()
            )
        }

        await PostSchedule.findByIdAndUpdate(schedule._id, {
          status: PUBLISH_STATUS.completed,
          updatedAt: new Date(), 
          processingLock: null
        });
      } catch (error: any) {
        await PostSchedule.findByIdAndUpdate(schedule._id, {
          status: PUBLISH_STATUS.failed,
          error: error.message,
          updatedAt: new Date(), 
          processingLock: null
        });
      }
    }
  }
} 

export const schedulePublishService = new SchedulePublishService(wordpressPublishService, shopifyPublishService);