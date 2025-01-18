import { BlogPost, GENERATION_TYPE, POST_STATUS } from "../../../models/BlogPost"
import { IBlogPost } from "../../../models/interfaces/BlogPostInterfaces"
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder"
import { mainKeywordFormatter } from "../../../utils/helpers/formatter"
import { openAIService } from "../../../utils/services/openAIService"
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService"
import { blogPostService } from "../blog.service"

export class SingleBlogPostService { 
    async generateTitle(userId: string, data: Partial<IBlogPost>){ 
        const canGenerate = await subscriptionFeatureService.canCreateSinglePost(userId)
        if(!canGenerate.canCreate){ 
            throw ErrorBuilder.badRequest(canGenerate.message)
        }
        const aiModel = await subscriptionFeatureService.getAIModel(userId)
        const title = await openAIService.generateBlogTitle(mainKeywordFormatter(data.mainKeyword as unknown as string), aiModel)
        return title
    }

    async generateMonthlyTraffic(userId: string, data: Partial<IBlogPost>){ 
        const canGenerate = await subscriptionFeatureService.canCreateSinglePost(userId)
        if(!canGenerate.canCreate){ 
            throw ErrorBuilder.badRequest(canGenerate.message)
        }
        return blogPostService.getTrafficEstimate(data.mainKeyword as unknown as string)
    }

    async generateSingleArticle(userId: string, data: Partial<IBlogPost>){ 
        // check if the user can generate a single article 
        const canGenerate = await subscriptionFeatureService.canCreateSinglePost(userId)
        if(!canGenerate.canCreate){ 
            throw ErrorBuilder.badRequest(canGenerate.message)
        }
        const aiModel = await subscriptionFeatureService.getAIModel(userId)

        // generate the article from the keyword and title 
        const articlePrompt = {
            mainKeyword: mainKeywordFormatter(data.mainKeyword!),
            title: data.title as unknown as string, 
            AIPrompt: data.aiPrompt as unknown as string
        }
        const article = await openAIService.generateBlogContent(articlePrompt, aiModel)
        // create the blog post in the db 
        const blogPost = new BlogPost({
           userId,
           mainKeyword: articlePrompt.mainKeyword,
           title: articlePrompt.title,
           content: article,
           generationType: GENERATION_TYPE.single,
           status: POST_STATUS.ready, 
           metadata: blogPostService.calculateMetaData(article, articlePrompt),
           structure: blogPostService.detectStructureFeatures(article),
           seoAnalysis: blogPostService.analyzeSEO(article, articlePrompt.mainKeyword)
        })
        await blogPost.save()
        return blogPost
    }
}

export const singleBlogPostService = new SingleBlogPostService()