import { BlogPost } from "../../../models/BlogPost";
import { GenerationBatch } from "../../../models/GenerationBatch";
import { IBlogPost, IGenerationBatchArticle } from "../../../models/interfaces/BlogPostInterfaces";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { openAIService } from "../../../utils/services/openAIService";
import { subscriptionFeatureService } from "../../../utils/subscription/subscriptionService";
import { blogPostService } from "../blog.service";

interface IKeywordWithTraffic {
    mainKeyword: string;
    estimatedMonthlyTraffic: number;
}

export class BulkBlogPostService { 
    async generateMainKeywords(userId: string, data: Partial<IBlogPost>): Promise<IKeywordWithTraffic[]> {
        // TODO: Integrate with AI/SEO API to generate related keywords
        const aiModel = await subscriptionFeatureService.getAIModel(userId)
        const keyWordCount = await subscriptionFeatureService.getMaxKeywords(userId)
        const canGenerate = await subscriptionFeatureService.canCreateBulkPosts(userId)
        if(!canGenerate.canCreate){ 
            throw ErrorBuilder.badRequest(canGenerate.message)
        }

        const keywords = await openAIService.generateRelatedKeywords(data.mainKeyword as unknown as string, keyWordCount, aiModel)
        
        // Map keywords to include traffic estimates
        const relatedKeywords: IKeywordWithTraffic[] = await Promise.all(
            keywords.map(async (keyword) => ({
                mainKeyword: keyword,
                estimatedMonthlyTraffic: await blogPostService.getTrafficEstimate(keyword)
            }))
        );
        
        return relatedKeywords;
    }

    async generateBulkTitle(userId: string, data: Partial<IBlogPost>){ 
        if (!data.mainKeyword || !Array.isArray(data.mainKeyword)) {
            throw ErrorBuilder.badRequest("Keywords array is required");
        }
    
        const canGenerate = await subscriptionFeatureService.canCreateBulkPosts(userId)
        if(!canGenerate.canCreate){ 
            throw ErrorBuilder.badRequest(canGenerate.message)
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

    async generateBulkKeywords(userId: string, data: Partial<IBlogPost>) {
        if (!data.mainKeyword || !Array.isArray(data.mainKeyword)) {
            throw ErrorBuilder.badRequest("Main keywords array is required");
        }
    
        if (!data.title || !Array.isArray(data.title)) {
            throw ErrorBuilder.badRequest("Titles array is required");
        }
    
        if (data.mainKeyword.length !== data.title.length) {
            throw ErrorBuilder.badRequest("Number of main keywords must match number of titles");
        }
    
        const canGenerate = await subscriptionFeatureService.canCreateBulkPosts(userId)
        if(!canGenerate.canCreate){ 
            throw ErrorBuilder.badRequest(canGenerate.message)
        }
        // Get user's AI model and keyword limit based on subscription
        const aiModel = await subscriptionFeatureService.getAIModel(userId);
        const keywordLimit = await subscriptionFeatureService.getMaxKeywords(userId);
    
        // Generate keywords for each main keyword + title pair
        const bulkKeywords = await Promise.all(
            data.mainKeyword.map(async (keyword, index) => {
                try {
                    const title = data.title?.[index];
                    const keywords = await openAIService.generateRelatedKeywords(
                        `${keyword} ${title}`, // Combine keyword and title for better context
                        keywordLimit,
                        aiModel
                    );
                    
                    return {
                        mainKeyword: keyword,
                        title: title,
                        relatedKeywords: keywords
                    };
                } catch (error) {
                    console.error(`Failed to generate keywords for: ${keyword}`, error);
                    return {
                        mainKeyword: keyword,
                        title: data.title?.[index],
                        relatedKeywords: []
                    };
                }
            })
        );
    
        return bulkKeywords;
    }

    async initiateBulkGeneration(userId: string, articles: IGenerationBatchArticle[], domainId?: string) {
        const canCreate = await subscriptionFeatureService.canCreateBulkPosts(userId)
        if(!canCreate.canCreate){ 
            throw ErrorBuilder.forbidden(canCreate.message);
        }
        const batch = new GenerationBatch({
            userId,
            totalArticles: articles.length,
            articles: articles.map(article => ({
                ...article,
                status: 'pending'
            })),
            domainId: domainId || null
        });

        await batch.save();
        this.processBatch(batch._id as unknown as string);
        return { batchId: batch._id as unknown as string, status: 'processing' };
    }

    async processBatch(batchId: string) {
        const batch = await GenerationBatch.findById(batchId)
        if (!batch) throw new Error('Batch not found');

        // get the user's ai model 
        const aiModel = await subscriptionFeatureService.getAIModel(batch.userId as unknown as string)

        // Process articles sequentially
        for (let index = 0; index < batch.articles.length; index++) {
            try {
                console.log(`Processing article ${index + 1}/${batch.articles.length}`);

                
                const content = await openAIService.generateBlogContent(batch.articles[index], aiModel);
                
                await this.updateArticleStatus(batchId, index, 'ready', content);

                batch.completedArticles += 1
                await batch.save()
            } catch (error) {
                console.error(`Error processing article ${index + 1}:`, error);
                await this.updateArticleStatus(batchId, index, 'failed');
            }
        }
        // await Promise.all(batch.articles.map(async (article, index) => {
        //     try {
        //         const content = await openAIService.generateBlogContent(article, aiModel);
        //         await this.updateArticleStatus(batchId, index, 'ready', content);
        //     } catch (error) {
        //         await this.updateArticleStatus(batchId, index, 'failed');
        //         console.error(`Error generating content for article ${index}:`, error);
        //     }
        // }))

        // update the batch status to completed 
        batch.status = 'completed'
        await batch.save()
    }

    async createBlogPost(article: IGenerationBatchArticle, content: string, domainId: string, userId: string, batchId: string) {
        
        const metadata = blogPostService.calculateMetaData(content, {mainKeyword: article.mainKeyword, title: article.title})

        const blogPost = new BlogPost({
            userId,
            domainId: domainId || null,
            batchId,
            mainKeyword: article.mainKeyword,
            title: article.title,
            keywords: article.keywords,
            content,
            generationType: 'bulk',
            status: 'ready', 
            metadata, 
            structure: blogPostService.detectStructureFeatures(content), 
            seoAnalysis: blogPostService.analyzeSEO(content, article.mainKeyword)
        });
        await blogPost.save();
    }

    async updateArticleStatus(batchId: string, index: number, status: string, content?: string) {
        const batch = await GenerationBatch.findById(batchId)
        if(!batch){ 
            throw ErrorBuilder.notFound("Batch not found");
        }
        if (content) {
             // Use findOneAndUpdate to atomically increment completedArticles for promise
            // await GenerationBatch.findByIdAndUpdate(
            //     batchId,
            //     {
            //         $set: { [`articles.${index}.status`]: status },
            //         $inc: { completedArticles: 1 }
            //     },
            //     { new: true }
            // );
            await this.createBlogPost(batch.articles[index], content, batch.domainId as unknown as string, batch.userId as unknown as string, batchId);
        }
        // still part of promise
        else{ 
            await GenerationBatch.findByIdAndUpdate(
                batchId,
                { $set: { [`articles.${index}.status`]: status } }
            );
        }
    }
}   

export const bulkBlogPostService = new BulkBlogPostService()