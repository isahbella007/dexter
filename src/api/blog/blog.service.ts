import { BlogPost } from "../../models/BlogPost";
import { Domain } from "../../models/Domain";
import { GenerationBatch } from "../../models/GenerationBatch";
import { IBlogPost, IGenerationBatchArticle, IKeywordPosition, IMetadata, IStructureSettings } from "../../models/interfaces/BlogPostInterfaces";
import { User } from "../../models/User";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { openAIService } from "../../utils/services/openAIService";
import { subscriptionFeatureService } from "../../utils/subscription/subscriptionService";
import { v4 as uuidv4 } from 'uuid';
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

    async getBlogPost(userId: string, domainId?: string, batchId?:string){ 
        // !!TODO: how about when they send batchId and domainId
        let blogPost 
        if(batchId ){ 
            if(domainId){ 
                blogPost = await BlogPost.find({ domainId, batchId, userId })
            }
            else{ 
                blogPost = await BlogPost.find({ batchId, userId })
            }
            const batch = await GenerationBatch.findById(batchId)
            if(!batch){ 
                throw ErrorBuilder.notFound("Batch not found");
            }
            if(batch.status === 'processing'){ 
                return{ 
                    blogPost, 
                    metrics: { 
                        totalArticles: batch.totalArticles, 
                        completedArticles: batch.completedArticles, 
                        progress: (batch.completedArticles / batch.totalArticles) * 100
                    }
                }
            }
        } else if(domainId){ 
            blogPost = await BlogPost.find({ domainId, userId })
        } else { 
            blogPost = await BlogPost.find({ userId })
        }
        return {blogPost}
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

    async createBlogPost(article: IGenerationBatchArticle, content: string, domainId: string, userId: string, batchId: string, isTemporary: boolean) {
        
        const metadata = this.calculateMetaData(content, {mainKeyword: article.mainKeyword, title: article.title})


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
            singleFormTemporary: false, 
            isTemporary: isTemporary, 
            metadata, 
            structure: this.detectStructureFeatures(content), 
            seoAnalysis: this.analyzeSEO(content, article.mainKeyword)
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
           
            
            // !!TODO:: come to this and check the people who can make use of the bulk creation
            const canCreate = await subscriptionFeatureService.canCreateBulkPosts(batch.userId as unknown as string)
            if(!canCreate.canCreate){ 
                throw ErrorBuilder.forbidden(canCreate.message);
            }

            const isTemporary = canCreate.isTemporary
            await this.createBlogPost(batch.articles[index], content, batch.domainId as unknown as string, batch.userId as unknown as string, batchId, isTemporary!);
        }
        // still part of promise
        else{ 
            await GenerationBatch.findByIdAndUpdate(
                batchId,
                { $set: { [`articles.${index}.status`]: status } }
            );
        }
    }

    private async getTrafficEstimate(keyword: string): Promise<number> {
        // TODO: Integrate with SEO API to get real traffic estimates
        return Math.floor(Math.random() * 10000);
    }

    private calculateMetaData(content: string, options: {
        mainKeyword: string;
        title: string;
    }): IMetadata {
        // Remove markdown syntax for accurate word count
        const plainText = this.stripMarkdown(content);
        
        const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
        const characterCount = plainText.length;
        const readingTime = Math.ceil(wordCount / 200);

        return {
            wordCount,
            characterCount,
            mainKeyword: options.mainKeyword,
            metaTitle: options.title,
            metaDescription: this.generateMetaDescription(plainText), // Use plain text for meta description
            readingTime
        };
    }

    private stripMarkdown(content: string): string {
        return content
            .replace(/#{1,6}\s/g, '') // Remove headers
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
            .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Remove links
            .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
            .replace(/^\s*[-+*]\s/gm, '') // Remove list markers
            .replace(/^\s*\d+\.\s/gm, '') // Remove numbered lists
            .replace(/\n{2,}/g, '\n') // Normalize line breaks
            .trim();
    }
    private detectStructureFeatures(content: string): IStructureSettings {
        return {
            includeHook: content.includes('Introduction') || content.startsWith('#'),
            includeConclusion: /##?\s*Conclusion/i.test(content),
            includeTables: content.includes('|'),
            includeH3: content.includes('###'),
            includeLists: /[-*+]\s/.test(content),
            includeItalics: /\*[^*]+\*/.test(content),
            includeQuotes: content.includes('>'),
            includeKeyTakeaway: /##?\s*Key Takeaway/i.test(content),
            includeFAQ: /##?\s*FAQ/i.test(content),
            includeBold: /\*\*[^*]+\*\*/.test(content),
            includeBulletpoints: /[-*+]\s/.test(content)
        };
    }

    private analyzeSEO(content: string, mainKeyword: string) {
        const lines = content.split('\n');
        const keywordPositions: IKeywordPosition[] = [];
        const keywordRegex = new RegExp(mainKeyword, 'gi');
    
        lines.forEach((line, lineNumber) => {
            // Determine the type of line
            let type: IKeywordPosition['type'] = 'content';
            if (line.match(/^#{1,6}\s/)) {
                const headerLevel = line.match(/^(#{1,6})\s/)?.[1].length;
                type = `h${headerLevel}` as IKeywordPosition['type'];
            }
    
            // Find all keyword matches in the line
            let match;
            while ((match = keywordRegex.exec(line)) !== null) {
                keywordPositions.push({
                    type,
                    position: match.index,
                    context: line.trim(),
                    lineNumber
                });
            }
        });
    
        return {
            mainKeywordDensity: (keywordPositions.length / content.length) * 100,
            contentLength: content.length,
            readabilityScore: 0,
            keywordPositions
        };
    }

    private generateMetaDescription(content: string): string {
        // TODO: Implement meta description generation logic
        return 'Meta description';
    }
}

export const blogPostService = new BlogPostService(); 