import { BlogPost, IBlogPost } from "../../models/BlogPost";
import { Domain } from "../../models/Domain";
import { User } from "../../models/User";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { openAIService } from "../../utils/services/openAIService";
import { subscriptionFeatureService } from "../../utils/subscription/subscriptionService";

interface IGenerateSingleBlogPostInput{ 
    data: Partial<IBlogPost>, 
    AIPrompt?: string;
}
interface IKeywordWithTraffic {
    mainKeyword: string;
    estimatedMonthlyTraffic: number;
}

export class BlogPostService {
    // get started with the single post generation this happens when they are in the title
    async createTemporaryBlogPost(userId: string, data: Partial<IBlogPost>) {
        if(!data.domainId){ 
            throw ErrorBuilder.badRequest('There is no domain passed')
        }
        const user = await User.findById(userId)
        if(!user){ 
            throw ErrorBuilder.notFound("User not found");
        }

        // check if the domain belongs to the user 
        const domainCheck = await Domain.findOne({_id: data.domainId, userId})
        if(!domainCheck){ 
            throw ErrorBuilder.notFound("Domain does not belong to the user");
        }
        const canCreate = await subscriptionFeatureService.canCreateSinglePost(userId)
        if(!canCreate.canCreate){ 
            throw ErrorBuilder.forbidden(canCreate.message);
        }
    
        
         // Check if mainKeyword is defined and has a length
        if(Array.isArray(data.mainKeyword) && data.mainKeyword.length > 80){ 
            throw ErrorBuilder.badRequest("Main keyword cannot be more than 80");
        }

        if(data.title && data.title.length > 100){ 
            throw ErrorBuilder.badRequest("Title cannot be more than 100 characters");
        }
        // call the API to get the monthly estimate of the keywords from here 
        const monthlyTrafficEstimate = 7000
        // here now, create the blog post. 
        const blogPost = new BlogPost({ 
            userId, 
            domainId: data.domainId,
            mainKeyword: Array.isArray(data.mainKeyword)? data.mainKeyword[0] : data.mainKeyword, 
            keywords: data.mainKeyword,
            estimatedMonthlyTraffic: monthlyTrafficEstimate,
            title: data.title, 
            generationType: 'single', 
            singleFormTemporary: true, 
            singleFormExpiresAt: new Date(Date.now() + 3 * 60 * 1000), // 1 minutes from now
            isTemporary: canCreate.isTemporary, 
            status: 'draft'
        })
        await blogPost.save()
       

        // I can return just the estimated monthly traffic 
        return blogPost
    }

    // update the main keywords and the keyword followed by the estimated monthly traffic 
    // !!TODO: Add a rate limiter here to avoid calling it too many times
    async blogPostKeyWordsUpdate(userId: string, blogPostId: string, data: Partial<IBlogPost>){ 
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }
        // check the length of the keyword they are sending 
        if(Array.isArray(data.mainKeyword) && data.mainKeyword.length > 80){ 
            throw ErrorBuilder.badRequest("Main keyword cannot be more than 80");
        }
        // update the blog post 
        const mainKeyword = Array.isArray(data.mainKeyword) 
            ? data.mainKeyword[0] 
            : data.mainKeyword;
        blogPost.mainKeyword = mainKeyword as unknown as string
        blogPost.keywords = Array.isArray(data.mainKeyword)? data.mainKeyword : [data.mainKeyword as string]
        // call the API to get the monthly traffic again 
        const estimatedMonthlyTraffic = 45500
        blogPost.estimatedMonthlyTraffic = estimatedMonthlyTraffic
        await blogPost.save()

        // return the estimated monthly traffic 
        return blogPost
    }

    async generateSingleBlogPost(userId: string, blogPostId: string, data:IGenerateSingleBlogPostInput){ 
        // need to check if they can generate the single blog post 
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }
        const user = await User.findById(userId)
        if(!user){ 
            throw ErrorBuilder.notFound("User not found");
        }

        // call the AI that will generate the prompt using the keywords they send 
        const prompt = 'We have to generate the blog post for the user making use of the title and the main keyword'
        blogPost.content = prompt
        blogPost.status = 'ready',
        // !!TODO:: generate blog post access to not allow them or make use of the isTemporary for this
        blogPost.singleFormTemporary = false
        await blogPost.save()

        user.singleBlogPostCount = 1
        await user.save()
        return blogPost._id
    }
    
    // this is if they x the modal on the frontend
    async deleteBlogPost(userId: string, blogPostId: string){ 
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }
        // delete the blog post 
        await blogPost.deleteOne({_id: blogPostId})
    }

    async generateTitle(userId: string, blogPostId: string, data: Partial<IBlogPost>){ 
        const blogPost = await BlogPost.findOne({ _id: blogPostId, userId })
        if(!blogPost){ 
            throw ErrorBuilder.notFound("Blog post not found");
        }

        const title = 'Rewritten title'
        blogPost.title = title
        await blogPost.save()
        return blogPost
    }

    async generateMainKeywords(userId: string, data: Partial<IBlogPost>): Promise<IKeywordWithTraffic[]> {
        // TODO: Integrate with AI/SEO API to generate related keywords
        const aiModel = await subscriptionFeatureService.getAIModel(userId)
        const keyWordCount = await subscriptionFeatureService.getMaxKeywords(userId)

        console.log('things passing', aiModel, keyWordCount, data.mainKeyword as unknown as string)
        // return [{keyword: 'test', estimatedMonthlyTraffic: 1000}]
        // generate the keywords with OPENAI
        const keywords = await openAIService.generateRelatedKeywords(data.mainKeyword as unknown as string, keyWordCount, aiModel)
        
        // Map keywords to include traffic estimates
        const relatedKeywords: IKeywordWithTraffic[] = await Promise.all(
            keywords.map(async (keyword) => ({
                mainKeyword: keyword,
                estimatedMonthlyTraffic: await this.getTrafficEstimate(keyword)
            }))
        );
        
        return relatedKeywords;
    }

    async generateBulkTitle(userId: string, data: Partial<IBlogPost>){ 
        if (!data.mainKeyword || !Array.isArray(data.mainKeyword)) {
            throw ErrorBuilder.badRequest("Keywords array is required");
        }
    
        // Get user's AI model based on subscription
        const aiModel = await subscriptionFeatureService.getAIModel(userId);
    
        // Generate titles for each keyword
        const titles = await Promise.all(
            data.mainKeyword.map(async (keyword) => {
                try {
                    const title = await openAIService.generateBlogTitle(keyword, aiModel);
                    return title;
                } catch (error) {
                    // If individual title generation fails, return a placeholder
                    console.error(`Failed to generate title for keyword: ${keyword}`, error);
                    return `Title for: ${keyword}`;
                }
            })
        );
    
        return titles;
    }

    async generateBulkKeywords(userId: string, data: Partial<IBlogPost>){ 
        // call the AI to generate the keywords from the main keyword passed. It is to be an array of string and for each position, we get the keywords for it 
        // so something like this 
        const keywords = ['keyword1', 'keyword2', 'keyword3']
        return keywords
    }

    private async getTrafficEstimate(keyword: string): Promise<number> {
        // TODO: Integrate with SEO API to get real traffic estimates
        return Math.floor(Math.random() * 10000);
    }
}

export const blogPostService = new BlogPostService(); 