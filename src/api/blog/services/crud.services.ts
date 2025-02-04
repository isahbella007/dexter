import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from "../../../models/BlogPost";
import { AiModel } from "../../../models/BlogPostCoreSettings";
import { GenerationBatch } from "../../../models/GenerationBatch";
import { IBlogPost, IPostMetrics } from "../../../models/interfaces/BlogPostInterfaces";
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
                return {blogPosts, analytics: []}
            }

            // Only fetch analytics for WordPress if siteId is provided
            if (platform === SYSTEM_PLATFORM.wordpress) {
                if (!siteId) {
                    throw ErrorBuilder.badRequest('Site ID is required for WordPress platform');
                }

                // Extract all slugs for the specified platform and site
                // const slugs = blogPosts.flatMap(post => 
                //     post.platformPublications
                //         .filter(pub => pub.platform === platform && pub.publishedSiteId.toString() === siteId)
                //         .map(pub => pub.publishedSlug)
                // ).filter(slug => slug); // Remove any undefined slugs

                // const siteUrls = blogPosts.flatMap(post => 
                //     post.platformPublications
                //         .filter(pub => pub.platform === platform && pub.publishedSiteId.toString() === siteId)
                //         .map(pub => pub.publishedUrl)
                // ).filter(url => url); // Remove any undefined urls

                const siteUrls = ['https://bestdogresources.com/frenchie-pee-on-bed/']
                const slugs = ['is-pine-straw-good-for-dog-bedding', 'can-dogs-eat-vegetables', 'top-10-vegetables-for-dogs-a-guide-to-nutritious-canine-diets-2', 'frenchie-pee-on-bed']
                console.log('slugs are', slugs);

                // Don't attempt to fetch analytics if there are no slugs
                if (slugs.length === 0) {
                    return {blogPosts, analytics: []};
                }

                const googleAnalyticsService = new GoogleAnalyticsService(
                    user?.oauth?.google?.accessToken as string, 
                    user?.oauth?.google?.refreshToken as string, 
                    user?.oauth?.google?.expiryDate as number
                );

                const analytics = await googleAnalyticsService.fetchAnalyticsForWordPress(slugs as unknown as string[], site?.ga4TrackingCode as string, siteUrls as unknown as string[]);
                return {blogPosts, analytics};
            }

            // For other platforms (e.g., Wix, Shopify), return blog posts without analytics for now
            return {blogPosts, analytics: []};

        } catch (error: any) {
            console.error('Error fetching blog posts by platform:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
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
}

export const crudBlogPostService = new BlogPostCrudService(); 