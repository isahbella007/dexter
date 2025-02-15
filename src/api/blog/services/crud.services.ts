import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from "../../../models/BlogPost";
import { AiModel } from "../../../models/BlogPostCoreSettings";
import { GenerationBatch } from "../../../models/GenerationBatch";
import { IBlogPost, IPostAnalytics, IPostMetrics } from "../../../models/interfaces/BlogPostInterfaces";
import { User } from "../../../models/User";
import { AppError } from "../../../utils/errors/AppError";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { ErrorType } from "../../../utils/errors/errorTypes";
import { mainKeywordFormatter } from "../../../utils/helpers/formatter";
import { GoogleAnalyticsService } from "../../../utils/services/googleAnalytics.service";
import { AIServiceFactory } from "../../../utils/services/aiServices/AIServiceFactory";
import { platformManagementService } from "../../../utils/services/platformManagement.service";
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService";
import { blogPostService } from "../blog.service";
import { calculatePostScore, classifyScore } from "../../../utils/helpers/metricsGraders";

interface ISectionEditRequest {
    selectedText: string;        // The exact text they selected
    AIPrompt: string;           // Their instructions for changing this text
}

export class BlogPostCrudService {

    async getBlogPost(userId: string, platform?: string, siteId?: string, batchId?: string) {
        let blogPost;
        // Validate platform if provided
        if (platform && !Object.values(SYSTEM_PLATFORM).includes(platform as SYSTEM_PLATFORM)) {
            throw ErrorBuilder.badRequest(
                `Invalid platform.`
            );
        }
        // Handle batch processing case
        if (batchId) { 
            console.log('batchId', batchId)
            const batch = await GenerationBatch.findById(batchId);
            if (!batch) {
                throw ErrorBuilder.notFound("Batch not found");
            }
            if (batch.status === 'processing') {
                return {
                    blogPost,
                    metrics: {
                        totalArticles: batch.totalArticles,
                        completedArticles: batch.completedArticles,
                        progress: (batch.completedArticles / batch.totalArticles) * 100
                    }
                };
            }else{ 
                blogPost = await BlogPost.find({userId, batchId})
                return {blogPost}
            }
        }

        // Handle different query scenarios
        if (platform && siteId) {
            // Both platform and site provided
            blogPost = await BlogPost.find({
                userId,
                'platformPublications.platform': platform,
                'platformPublications.publishedSiteId': siteId
            });
        } else if (platform) {
            // Only platform provided
            blogPost = await BlogPost.find({
                userId,
                'platformPublications.platform': platform
            });
        } else {
            // No filters, return all user's posts
            blogPost = await BlogPost.find({ userId });
        }

        return { blogPost };
    }

    async getBlogPostHistory(userId: string, platform: string, siteId?: string){ 
        try {
            let site
            const user = await User.findById(userId)   
            if(!user) { 
                throw ErrorBuilder.notFound('User not found')
            }
            // Validate platform
            if (!Object.values(SYSTEM_PLATFORM).includes(platform as SYSTEM_PLATFORM)) {
                throw ErrorBuilder.badRequest('Invalid platform');
            }

            // Build query
            const query: any = {
                'platformPublications.platform': platform
            };

            // Add siteId to query if provided
            if (siteId) {
                // verify that the siteId matches the platform
                site = await platformManagementService.validateSiteId(userId, siteId, platform)
                if(!site) { 
                    throw ErrorBuilder.notFound('Site not found')
                }
                query['platformPublications.publishedSiteId'] = siteId;
            }

            // Fetch blog posts
            const blogPosts = await BlogPost.find(query)

            if(!user.oauth?.google?.accessToken || !user.oauth?.google?.refreshToken || !user.oauth?.google?.expiryDate) { 
                console.log('we still want to be able to tell them that we are unable to fetch history for them or something')
                return {blogPosts, analytics: [], aggregatedAnalytics: {}}
            }

            const googleAnalyticsService = new GoogleAnalyticsService(
                user?.oauth?.google?.accessToken as string, 
                user?.oauth?.google?.refreshToken as string, 
                user?.oauth?.google?.expiryDate as number
            );

            // const siteUrl = ['https://bestdogresources.com/frenchie-pee-on-bed/']
            // const slugs = ['is-pine-straw-good-for-dog-bedding', 'can-dogs-eat-vegetables', 'top-10-vegetables-for-dogs-a-guide-to-nutritious-canine-diets-2', 'frenchie-pee-on-bed']
            const {updatedPosts, analytics, aggregatedAnalytics} = await this.processPlatformAnalytics(blogPosts, platform, siteId, site?.ga4TrackingCode, googleAnalyticsService)

            // Save updated posts
            await Promise.all(updatedPosts.map(post => (post as any).save()));

            return {
                blogPosts,
                analytics,
                aggregatedAnalytics
            };
        } catch (error: any) {
            // If the error is already an AppError or ErrorBuilder error, rethrow it
            if (error instanceof AppError || error.name === 'AppError') {
                throw error;
            }
            // For other errors, wrap them in an AppError
            throw new AppError(error.message, ErrorType.UNKNOWN, error.status || 500);
        }
    }

    async getSingleBlogPost(userId: string, blogPostId: string){ 
        const blogPost = await BlogPost.findOne({_id: blogPostId, userId})
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }
        return blogPost
    }

    async updateBlogPost(userId: string, blogPostId: string, data: Partial<IBlogPost>) {
        //update the content of the post and then recalculate the metadata 
        // !!TODO: work on the SEO analysis after the content is edited 
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if (!blogPost) {
            throw ErrorBuilder.notFound("Blog post not found");
        }
        const mainKeyword = Array.isArray(blogPost.mainKeyword) ? blogPost.mainKeyword[0] : blogPost.mainKeyword
        const title = blogPost.title
        blogPost.content = data.content as unknown as string
        blogPost.structure = blogPostService.detectStructureFeatures(data.content as unknown as string)
        blogPost.metadata = blogPostService.calculateMetaData(data.content as unknown as string, { mainKeyword, title })
        await blogPost.save()
        return blogPost
    }

    async deleteBlogPost(userId: string, blogPostId: string) {
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if (!blogPost) {
            throw ErrorBuilder.notFound("Blog post not found");
        }
        // delete the blog post 
        await blogPost.deleteOne({ _id: blogPostId })
    }

    async editBlogPostSection(userId: string, blogPostId: string, data: ISectionEditRequest) {
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if (!blogPost) {
            throw ErrorBuilder.notFound("Blog post not found");
        }

        // Check if the selected text exists in the content
        if (!blogPost.content.includes(data.selectedText)) {
            throw ErrorBuilder.badRequest("Selected text not found in content");
        }

        // Get some context by grabbing a bit before and after the selection
        const selectedIndex = blogPost.content.indexOf(data.selectedText);
        const contextWindow = 500; // Number of characters for context

        const surroundingContext = {
            previousText: blogPost.content.substring(
                Math.max(0, selectedIndex - contextWindow),
                selectedIndex
            ),
            nextText: blogPost.content.substring(
                selectedIndex + data.selectedText.length,
                Math.min(blogPost.content.length, selectedIndex + data.selectedText.length + contextWindow)
            )
        };
        const aiModel = await subscriptionFeatureService.getAIModel(userId);
        const aiService = AIServiceFactory.createService(aiModel as AiModel);


        // Generate new content for the selected text
        const newContent = await aiService.generateSectionEdit({
            selectedText: data.selectedText,
            AIPrompt: data.AIPrompt,
            surroundingContext,
            mainKeyword: blogPost.mainKeyword,
            title: blogPost.title
        }, aiModel);

        // // Replace the old text with the new content
        const updatedContent = blogPost.content.replace(data.selectedText, newContent);

        blogPost.content = updatedContent;
        blogPost.metadata = blogPostService.calculateMetaData(blogPost.content, { mainKeyword: mainKeywordFormatter(blogPost.mainKeyword), title: blogPost.title })
        blogPost.structure = blogPostService.detectStructureFeatures(blogPost.content)
        await blogPost.save();

        return { surroundingContext, newContent, blogPost }
    }

    private async processPlatformAnalytics(
        blogPosts: IBlogPost[],
        platform: string,
        siteId: string | undefined,
        ga4TrackingCode: string | undefined | null,
        googleAnalyticsService: GoogleAnalyticsService
    ) {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const updatedPosts: IBlogPost[] = [];
        const analytics: IPostAnalytics[] = [];
        // Add aggregation logic
        const aggregatedAnalytics = {
            platform,
            siteId,
            organicTraffic: { total: 0 , improvements: 0},
            pagesPerSession: { total: 0 },
            bounceRate: { total: 0 },
            crawlError: { total: 0 },
            avgPosition: { total: 0 },
            postCount: 0,
            score: 0,
            classification: ''
        };
    
        if (!ga4TrackingCode) {
            return {
                updatedPosts: [],
                analytics: blogPosts.flatMap(post =>
                    post.platformAnalytics.filter(pa => pa.platform === platform && (!siteId || pa.siteId === siteId))
                ),
                aggregatedAnalytics
            };
        }

        // Calculate max values for normalization
        const maxValues = {
            organicTraffic: Math.max(...blogPosts.map(post => post.platformAnalytics.reduce((max, pa) => Math.max(max, pa.organicTraffic.total), 0))),
            pagesPerSession: Math.max(...blogPosts.map(post => post.platformAnalytics.reduce((max, pa) => Math.max(max, pa.pagesPerSession.total), 0))),
            bounceRate: Math.max(...blogPosts.map(post => post.platformAnalytics.reduce((max, pa) => Math.max(max, pa.bounceRate.total), 0))),
            crawlError: Math.max(...blogPosts.map(post => post.platformAnalytics.reduce((max, pa) => Math.max(max, pa.crawlError.total), 0))),
            avgPosition: Math.max(...blogPosts.map(post => post.platformAnalytics.reduce((max, pa) => Math.max(max, pa.avgPosition.total), 0)))
        };
    
        console.log('the max values are', maxValues)
        // Process all blog posts
        await Promise.all(blogPosts.map(async (post) => {
            const platformAnalytics = post.platformAnalytics.find(
                pa => pa.platform === platform && (!siteId || pa.siteId === siteId)
            );
    
            // Get all slugs and URLs for the platform and site
            const slugs = post.platformPublications
                .filter(pub => pub.platform === platform && (!siteId || pub.publishedSiteId === siteId))
                .map(pub => pub.publishedSlug)
                .filter(slug => slug);
        
            const siteUrls = post.platformPublications
                .filter(pub => pub.platform === platform && (!siteId || pub.publishedSiteId === siteId))
                .map(pub => pub.publishedUrl)
                .filter(url => url);

            console.log(`the slugs and siteUrls for ${post._id} are`, slugs, siteUrls)
            if (!platformAnalytics || !platformAnalytics.lastUpdated || platformAnalytics.lastUpdated < twelveHoursAgo) {
                const metrics = await googleAnalyticsService.getPostMetrics(
                    ga4TrackingCode,
                    slugs as unknown as string[],
                    siteUrls as unknown as string[]
                );

                 // Calculate score and classification
                const score = calculatePostScore({
                    organicTraffic: metrics.organicTraffic.total,
                    pagesPerSession: metrics.pagesPerSession.total,
                    bounceRate: metrics.bounceRate.total,
                    crawlError: metrics.crawlError.total,
                    avgPosition: metrics.avgPosition.total
                }, maxValues);

                const classification = classifyScore(score);

                console.log('the metrics are', metrics)
    
                if (platformAnalytics) {
                    Object.assign(platformAnalytics, metrics, { lastUpdated: new Date(), improvements: metrics.organicTraffic.improvements || 0, score, classification });
                } else {
                    post.platformAnalytics.push({
                        platform: platform as SYSTEM_PLATFORM,
                        siteId: siteId || '',
                        lastUpdated: new Date(),
                        organicTraffic: metrics.organicTraffic || { total: 0, improvements: 0 },
                        pagesPerSession: metrics.pagesPerSession || { total: 0 },
                        bounceRate: metrics.bounceRate || { total: 0 },
                        crawlError: metrics.crawlError || { total: 0 },
                        avgPosition: metrics.avgPosition || { total: 0 },
                        score: score || 0,
                        classification: classification || ''
                    });
                }
    
                updatedPosts.push(post);
            }
    
            // Add to analytics array
            const currentAnalytics = post.platformAnalytics.find(
                pa => pa.platform === platform && (!siteId || pa.siteId === siteId)
            );
            if (currentAnalytics) {
                analytics.push(currentAnalytics);
                aggregatedAnalytics.organicTraffic.total += currentAnalytics.organicTraffic.total;
                aggregatedAnalytics.organicTraffic.improvements += currentAnalytics.organicTraffic.improvements;
                aggregatedAnalytics.pagesPerSession.total += currentAnalytics.pagesPerSession.total;
                aggregatedAnalytics.bounceRate.total += currentAnalytics.bounceRate.total;
                aggregatedAnalytics.crawlError.total += currentAnalytics.crawlError.total;
                aggregatedAnalytics.avgPosition.total += currentAnalytics.avgPosition.total;
                aggregatedAnalytics.postCount++;
                aggregatedAnalytics.score += currentAnalytics.score;
                aggregatedAnalytics.classification = currentAnalytics.classification;
            }
        }));
    
        return { updatedPosts, analytics, aggregatedAnalytics };
    }
}



export const crudBlogPostService = new BlogPostCrudService(); 