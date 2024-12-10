import { Request, Response } from 'express';
import { blogPostService } from './blog.service';
import { ErrorBuilder } from '../../utils/errors/ErrorBuilder';
import { IUser } from '../../models/interfaces/UserInterface';
import { ResponseFormatter } from '../../utils/errors/ResponseFormatter';
import { asyncHandler } from '../../utils/helpers/asyncHandler';
import { blogPostKeyWordsUpdate, generateBlogPost, generateBulkArticles, generateBulkKeywords, generateBulkTitle, generateSingleTemplate } from './blog.schema';

export const blogPostController = {
    createTempSinglePost: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateSingleTemplate.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await blogPostService.createTemporaryBlogPost((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Single blog post generated');
    }), 

    updateMainKeywords: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = blogPostKeyWordsUpdate.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        if(!req.query.blogPostId){ 
            throw ErrorBuilder.badRequest('Blog post id is required')
        }
        const blogPostId = req.query.blogPostId as string
        const response = await blogPostService.blogPostKeyWordsUpdate((req.user as IUser)._id, blogPostId, value)
        ResponseFormatter.success(res, response, 'Main keywords updated');
    }), 

    generateTitle: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = blogPostKeyWordsUpdate.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const blogPostId = req.query.blogPostId as string
        if(!req.query.blogPostId){ 
            throw ErrorBuilder.badRequest('Blog post id is required')
        }
        const response = await blogPostService.generateTitle((req.user as IUser)._id, blogPostId, value)
        ResponseFormatter.success(res, response, 'Title generated');
    }), 

    // delete blog post on x modal 
    deleteBlogPost: asyncHandler(async(req:Request, res:Response) => { 
        if(!req.query.blogPostId){ 
            throw ErrorBuilder.badRequest('Blog post id is required')
        }
        const blogPostId = req.query.blogPostId as string
        const response = await blogPostService.deleteBlogPost((req.user as IUser)._id, blogPostId)
        ResponseFormatter.success(res, response, 'Blog post deleted');
    }), 

    generateBlogPost: asyncHandler(async(req:Request, res:Response) => { 
        if(!req.query.blogPostId){ 
            throw ErrorBuilder.badRequest('Blog post id is required')
        }
        const {value, error} = generateBlogPost.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)
        const blogPostId = req.query.blogPostId as string
        const response = await blogPostService.generateSingleBlogPost((req.user as IUser)._id, blogPostId, value)
        ResponseFormatter.success(res, response, 'Blog post generated');
    }), 

    generateMainKeywords: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = blogPostKeyWordsUpdate.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await blogPostService.generateMainKeywords((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Main keywords generated');
    }), 

    generateBulkKeywords: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateBulkKeywords.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await blogPostService.generateBulkKeywords((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Bulk keywords generated');
    }),

    generateBulkTitles: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateBulkTitle.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await blogPostService.generateBulkTitle((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, 'Bulk titles generated');
    }), 

    getBlogPost: asyncHandler(async(req:Request, res:Response) => { 
        const response = await blogPostService.getBlogPost((req.user as IUser)._id, req.query.domainId as string, req.query.batchId as string)
        ResponseFormatter.success(res, response, 'Blog post fetched');
    }),

    initiateBulkGeneration: asyncHandler(async(req:Request, res:Response) => { 
        const {value, error} = generateBulkArticles.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)

        const response = await blogPostService.initiateBulkGeneration((req.user as IUser)._id, value.articles)
        ResponseFormatter.success(res, response, 'Bulk generation initiated');
    }),
}
