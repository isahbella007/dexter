import { Request, Response } from 'express';
import { ErrorBuilder } from '../../utils/errors/ErrorBuilder';
import { IUser } from '../../models/interfaces/UserInterface';
import { ResponseFormatter } from '../../utils/errors/ResponseFormatter';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { blogPostKeyWordsUpdate, generateBlogPost, generateBulkArticles, generateBulkKeywords, generateBulkTitle, generateSingleTemplate, getBlogPostSchema, updateBlogPost, updateBlogPostSection } from './blog.schema';
import { singleBlogPostService } from './services/single.services';
import { bulkBlogPostService } from './services/bulk.services';
import { crudBlogPostService } from './services/crud.services';

export const blogPostController = {

    // single blog post generation
    generateTitle: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = blogPostKeyWordsUpdate.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)
        
        const response = await singleBlogPostService.generateTitle((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Title generated');
    }), 

    generateMonthlyTraffic: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = blogPostKeyWordsUpdate.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await singleBlogPostService.generateMonthlyTraffic((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Monthly traffic for keywords generated');
    }),
     
    generateSingleArticle: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateBlogPost.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await singleBlogPostService.generateSingleArticle((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Single article generated');
    }),
    // -------------------------------------------------------------------------------
    // bulk blog post generation
    generateMainKeywords: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = blogPostKeyWordsUpdate.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await bulkBlogPostService.generateMainKeywords((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Main keywords generated');
    }), 

    generateBulkKeywords: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateBulkKeywords.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await bulkBlogPostService.generateBulkKeywords((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Bulk keywords generated');
    }),

    generateBulkTitles: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateBulkTitle.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await bulkBlogPostService.generateBulkTitle((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Bulk titles generated');
    }), 

    initiateBulkGeneration: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateBulkArticles.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await bulkBlogPostService.initiateBulkGeneration((req.user as IUser)._id, value.articles)
        ResponseFormatter.success(res, response, 'Bulk generation initiated');
    }),

    //-------------------------------------------------------------------------------------
    // crud operations
    getBlogPost: asyncHandler(async(req:Request, res:Response) => {
        const {error, value} = getBlogPostSchema.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const platform = req.body?.platform || undefined;
        const siteId = req.body?.siteId || undefined;
        const batchId = req.body?.batchId || undefined;
        const response = await crudBlogPostService.getBlogPost((req.user as IUser)._id, platform, siteId, batchId )
        ResponseFormatter.success(res, response, 'Blog post fetched');
    }),

    getBlogPostHistory: asyncHandler(async(req:Request, res:Response) => { 
        const {error, value} = getBlogPostSchema.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const page = req.body?.page || 1
        const platform = req.body?.platform || undefined;
        const siteId = req.body?.siteId || undefined;
        const response = await crudBlogPostService.getBlogPostHistory((req.user as IUser)._id, page, platform, siteId )
        ResponseFormatter.success(res, response, 'Blog post history fetched');
    }),

    getSingleBlogPost: asyncHandler(async(req:Request, res:Response) => { 
        const response = await crudBlogPostService.getSingleBlogPost((req.user as IUser)._id, req.query.blogPostId as string)
        ResponseFormatter.success(res, response, 'Blog post fetched');
    }),
    
    updateBlogPost: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = updateBlogPost.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const blogPostId = req.query.blogPostId as string
        if(!blogPostId){ 
            throw ErrorBuilder.badRequest('Blog post id is required')
        }
        const response = await crudBlogPostService.updateBlogPost((req.user as IUser)._id, blogPostId, value)
        ResponseFormatter.success(res, response, 'Blog post updated');
    }),

    deleteBlogPost: asyncHandler(async(req:Request, res:Response) => { 
        if(!req.query.blogPostId){ 
            throw ErrorBuilder.badRequest('Blog post id is required')
        }
        const blogPostId = req.query.blogPostId as string
        const response = await crudBlogPostService.deleteBlogPost((req.user as IUser)._id, blogPostId)
        ResponseFormatter.success(res, response, 'Blog post deleted');
    }),

    updateBlogPostSection: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = updateBlogPostSection.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        if(!req.query.blogPostId){  
            throw ErrorBuilder.badRequest('Blog post id is required')
        }
        const blogPostId = req.query.blogPostId as string
        const response = await crudBlogPostService.editBlogPostSection((req.user as IUser)._id, blogPostId, value)
        ResponseFormatter.success(res, response, 'Blog post section updated');
    }),
}
