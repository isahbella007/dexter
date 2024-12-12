import { BlogPost } from "../../../models/BlogPost";
import { GenerationBatch } from "../../../models/GenerationBatch";
import { IBlogPost } from "../../../models/interfaces/BlogPostInterfaces";
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

    async getBlogPost(userId: string, domainId?: string, batchId?:string){ 
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