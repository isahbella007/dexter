import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from "../../../models/BlogPost";
import { GenerationBatch } from "../../../models/GenerationBatch";
import { IBlogPost, IPostMetrics } from "../../../models/interfaces/BlogPostInterfaces";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { mainKeywordFormatter } from "../../../utils/helpers/formatter";
import { openAIService } from "../../../utils/services/openAIService";
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService";
import { blogPostService } from "../blog.service";

interface ISectionEditRequest {
    selectedText: string;        // The exact text they selected
    AIPrompt: string;           // Their instructions for changing this text
}

export class BlogPostCrudService { 

    async getBlogPost(userId: string, platform?: string, siteId?: string,  batchId?:string){ 
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

    async getBlogPostHistory(userId: string, page: number, platform?: string, siteId?: string) { 
        if (platform && !Object.values(SYSTEM_PLATFORM).includes(platform as SYSTEM_PLATFORM)) {
            throw ErrorBuilder.badRequest(
                `Invalid platform.`
            );
        }

        const limit = 10;
        const skip = (page - 1) * limit;
        
        // Build query object based on provided filters
        const query: any = { userId }; // Start with userId as base filter
        
        if (platform && siteId) {
            query['platformPublications.platform'] = platform;
            query['platformPublications.publishedSiteId'] = siteId;
        } else if (platform) {
            query['platformPublications.platform'] = platform;
        }

        // Use the same query object for both finding and counting
        const [postHistory, total] = await Promise.all([
            BlogPost.find(query)
                .select([
                    'title',
                    'mainKeyword',
                    'keywords',
                    'createdAt',
                    'status',
                    'seoScore',
                    'metadata',
                    'seoAnalysis',
                    'platformPublications'
                ])
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            BlogPost.countDocuments(query)
        ]);
        const metrics = await this.getPostMetrics(userId, platform as SYSTEM_PLATFORM)
       // Create a map of metrics by postId for efficient lookup
        const metricsMap = metrics.reduce((acc, metric) => {
            acc[metric.postId] = metric;
            return acc;
        }, {} as Record<string, IPostMetrics>);

        // Combine posts with their metrics using postId
        const postsWithMetrics = postHistory.map(post => ({
            ...post.toObject(),
            metrics: metricsMap[post._id.toString()] || {}
        }));

        return { 
            posts: postsWithMetrics, 
            total, 
            hasMore: total > skip + postHistory.length,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getPostMetrics(userId: string, platform?: SYSTEM_PLATFORM, siteId?: string){ 
        // Only get metrics for published posts
        const query: any = {
            userId,
            'platformPublications.status': PUBLISH_STATUS.published
        };

        if (platform) {
            query['platformPublications.platform'] = platform;
        }
        if (siteId) {
            query['platformPublications.publishedSiteId'] = siteId;
        }

        const publishedPosts = await BlogPost.find(query)
            .select(['platformPublications'])
            .lean();

        // console.log('get post metrics -> publishedPOst', JSON.stringify(publishedPosts, null, 2))
        const metrics = await Promise.all(
            publishedPosts.map(post => this.getMetricsForPost(post, platform))
        )
        return metrics 
    }

    async getMetricsForPost(post: any, platform?: SYSTEM_PLATFORM){ 
        // console.log('the post passed in getMetricsForPost', post )
        const defaultMetrics:IPostMetrics = {
            postId: post._id.toString(),
            views: 0,
            engagement: 0,
            traffic: 0,
            averagePosition: 0,
            crawlError: 0,
            organicTraffic: 0,
            bounceRate: 0,
            pagesPerSession: 0
        };
    
        if (!platform) {
            return defaultMetrics;
        }
        try {
            let metrics: IPostMetrics;
            switch (platform) {
                case SYSTEM_PLATFORM.wordpress:
                    metrics = defaultMetrics;
                    // metrics = await this.getWordPressMetrics(post);
                    break;
                case SYSTEM_PLATFORM.shopify:
                    metrics = defaultMetrics;
                    // metrics = await this.getShopifyMetrics(post);
                    break;
                case SYSTEM_PLATFORM.wix:
                    metrics = defaultMetrics;
                    break;
                default:
                    metrics = defaultMetrics;
            }
            return { ...metrics, postId: post._id.toString() }; // Ensure postId is included
        } catch (error) {
            console.error(`Failed to fetch metrics for post: ${post._id}`, error);
            return defaultMetrics;
        }
    }
    async getSingleBlogPost(userId: string, blogPostId: string){ 
        const blogPost = await BlogPost.findOne({_id: blogPostId, userId})
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }
        return blogPost
    }

    async updateBlogPost(userId:string, blogPostId: string, data: Partial<IBlogPost>){ 
        //update the content of the post and then recalculate the metadata 
        // !!TODO: work on the SEO analysis after the content is edited 
        const blogPost = await BlogPost.findOne({_id: blogPostId, userId})
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }
        const mainKeyword = Array.isArray(blogPost.mainKeyword) ? blogPost.mainKeyword[0] : blogPost.mainKeyword
        const title = blogPost.title
        blogPost.content = data.content as unknown as string
        blogPost.structure = blogPostService.detectStructureFeatures(data.content as unknown as string)
        blogPost.metadata = blogPostService.calculateMetaData(data.content as unknown as string, {mainKeyword, title})
        await blogPost.save()
        return blogPost
    }

    async deleteBlogPost(userId: string, blogPostId: string){ 
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }
        // delete the blog post 
        await blogPost.deleteOne({_id: blogPostId})
    }

    async editBlogPostSection(userId: string, blogPostId: string, data: ISectionEditRequest){ 
        const blogPost = await BlogPost.findOne({_id: blogPostId, userId})
        if(!blogPost){ 
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

        // Generate new content for the selected text
        const newContent = await openAIService.generateSectionEdit({
            selectedText: data.selectedText,
            AIPrompt: data.AIPrompt,
            surroundingContext,
            mainKeyword: blogPost.mainKeyword,
            title: blogPost.title
        }, aiModel);

        // // Replace the old text with the new content
        const updatedContent = blogPost.content.replace(data.selectedText, newContent);
        
        blogPost.content = updatedContent;
        blogPost.metadata = blogPostService.calculateMetaData(blogPost.content, {mainKeyword: mainKeywordFormatter(blogPost.mainKeyword), title: blogPost.title})
        blogPost.structure = blogPostService.detectStructureFeatures(blogPost.content)
        await blogPost.save();

        return {surroundingContext, newContent, blogPost}
    }
}

export const crudBlogPostService = new BlogPostCrudService(); 