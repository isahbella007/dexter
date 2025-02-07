import { WixService } from '../../../utils/services/wix.service';
import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from '../../../models/BlogPost';
import { ErrorBuilder } from '../../../utils/errors/ErrorBuilder';
import { marked } from 'marked';
import { ErrorType } from '../../../utils/errors/errorTypes';
import { AppError } from '../../../utils/errors/AppError';
import { User } from '../../../models/User';
import { IWixSite } from '../../../models/interfaces/UserInterface';
import { markdownToWixContent } from '../../../utils/markdownToWixContent';

export class WixPublishService {
  private wixService: WixService;

  constructor() {
    this.wixService = new WixService();
  }

  private convertMarkdownToHTML(markdown: string): string {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    return marked(markdown) as string;
  }


  async publishPost(userId: string, blogPostId: string, siteId: string) {
    try {
        const blogPost = await BlogPost.findOne({ 
        _id: blogPostId,
        userId 
        });

        if (!blogPost) {
        throw ErrorBuilder.notFound('Blog post not found');
        }

        // check for the user and the wix platform to confirm they have an accessToken for the siteId passed 
        const user = await User.findById(userId)
        if(!user) throw ErrorBuilder.notFound('User not found')

        const wixPlatform = user.platforms?.wix
        if(!wixPlatform) throw ErrorBuilder.notFound('Wix platform not found')

        const wixSite = wixPlatform.sites.find((site: IWixSite) => site.siteId === siteId)
        if(!wixSite) throw ErrorBuilder.notFound('Wix site not found')

        const accessToken = wixSite.siteAccessToken
        const ownerMemberId = wixSite.ownerMemberId
        
        if(!accessToken || !ownerMemberId) throw ErrorBuilder.notFound('Wix access token or owner member id not found')
        // Convert markdown content to HTML
        const htmlContent = markdownToWixContent(blogPost.content);
        // const otherContent = this.convertMarkdownToHTML(blogPost.content)


        // return htmlContent
        // get the new access token for the site 
        const newAccessToken = await this.wixService.getNewAccessToken(userId, wixSite)
        console.log('newAccessToken =>', newAccessToken)

        const publishedData = await this.wixService.publishBlogPostToWix(
            blogPost.title,
            htmlContent,
            newAccessToken,
            ownerMemberId
        );


        console.log('wix response =>', publishedData)
        // Update blog post with publication status

        await BlogPost.findByIdAndUpdate(blogPostId, {
          $push: {

            platformPublications: {
              platform: SYSTEM_PLATFORM.wix,
              status: PUBLISH_STATUS.published,
              publishedSiteId: String(siteId),
              publishedUrl: `${publishedData?.url?.base}${publishedData?.url?.path}`,
              publishedSlug: publishedData?.url.path,
              publishedAt: new Date()


            }
          }
        });
    } catch (error:any) {
        // Update blog post with failed status
        await BlogPost.findByIdAndUpdate(blogPostId, {
            $push: {
            platformPublications: {
                platform: SYSTEM_PLATFORM.wix,
                status: PUBLISH_STATUS.failed,
                error: error.message
            }
            }
        });
        throw new AppError(error.message, ErrorType.CONFLICT, error.status || 500)
    }
  }
} 

export const wixPublishService = new WixPublishService()