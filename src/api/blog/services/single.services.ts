import { BlogPost, GENERATION_TYPE, POST_STATUS } from "../../../models/BlogPost"
import { AiModel } from "../../../models/BlogPostCoreSettings"
import { IBlogPost } from "../../../models/interfaces/BlogPostInterfaces"
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder"
import { mainKeywordFormatter } from "../../../utils/helpers/formatter"
import { AIServiceFactory } from "../../../utils/services/aiServices/AIServiceFactory"
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService"
import { blogPostService } from "../blog.service"

export class SingleBlogPostService {
    async generateTitle(userId: string, data: Partial<IBlogPost>) {
        const canGenerate = await subscriptionFeatureService.canCreateSinglePost(userId)
        if (!canGenerate.canCreate) {
            throw ErrorBuilder.badRequest(canGenerate.message)
        }
        const aiModel = await subscriptionFeatureService.getAIModel(userId)
        const aiService = AIServiceFactory.createService(aiModel as AiModel);
        const title = await aiService.generateBlogTitle(mainKeywordFormatter(data.mainKeyword as unknown as string), aiModel)
        return title
    }

    async generateMonthlyTraffic(userId: string, data: Partial<IBlogPost>) {
        const canGenerate = await subscriptionFeatureService.canCreateSinglePost(userId)
        if (!canGenerate.canCreate) {
            throw ErrorBuilder.badRequest(canGenerate.message)
        }
        return blogPostService.getTrafficEstimate(data.mainKeyword as unknown as string)
    }

    async generateSingleArticle(userId: string, data: Partial<IBlogPost>) {
        // check if the user can generate a single article 
        const canGenerate = await subscriptionFeatureService.canCreateSinglePost(userId)
        if (!canGenerate.canCreate) {
            throw ErrorBuilder.badRequest(canGenerate.message)
        }
        const aiModel = await subscriptionFeatureService.getAIModel(userId)
        const aiService = AIServiceFactory.createService(aiModel as AiModel);

        // generate the article from the keyword and title 
        const articlePrompt = {
            mainKeyword: mainKeywordFormatter(data.mainKeyword!),
            title: data.title as unknown as string,
            AIPrompt: data.aiPrompt as unknown as string
        }
        const article = await aiService.generateBlogContent(articlePrompt, aiModel)
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