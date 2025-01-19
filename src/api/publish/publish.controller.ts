import { IUser } from "../../models/interfaces/UserInterface";
import { wordpressService } from "../../utils/services/wordpress.service";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";
import { asyncHandler } from "../../utils/helpers/asyncHandler"
import { Request, Response } from "express";
import { wordpressPublishService } from "./services/wordpress.publish.service";
import { SYSTEM_PLATFORM } from "../../models/BlogPost";
import { schedulePostSchema } from "./publishSchema";
import { schedulePublishService } from "./services/schedule.publish.service";
import { shopifyPublishService } from "./services/shopify.publish.service";

export const publishController = {
    schedulePost: asyncHandler(async (req: Request, res: Response) => {
        const userId = req?.user as IUser
        const {blogPostId, siteId, platform, scheduledDates} = req.body

        const {value, error} = schedulePostSchema.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.message)
       
        // check if the platform is valid
        if(!Object.values(SYSTEM_PLATFORM).includes(platform)) throw ErrorBuilder.badRequest('Invalid platform')
        
        await schedulePublishService.schedulePost(userId._id, blogPostId, siteId, platform, scheduledDates)
        ResponseFormatter.success(res, {}, 'Post scheduled successfully')
    }),

    refreshWordPressSites: asyncHandler(async (req: Request, res: Response) => {
        const userId = req?.user as IUser
        const wpAccessToken = (req?.user as IUser).oauth?.wordpress?.accessToken

        if(!wpAccessToken) throw ErrorBuilder.badRequest('Please connect your wordpress account to refresh your sites')
        await wordpressService.fetchAndStoreSites(userId._id, wpAccessToken)

        const sites = (req?.user as IUser)?.platforms?.wordpress?.sites || []
        ResponseFormatter.success(res, sites, 'WordPress sites refreshed successfully')
    }),

    publishBlogPost: asyncHandler(async (req: Request, res: Response) => {
        const userId = req?.user as IUser
        const blogPostId = req?.query?.blogPostId as string
        const {siteId} = req.body


        const result = await wordpressPublishService.publishBlogPost(userId._id, siteId, blogPostId)
        if(result.success) {
            ResponseFormatter.success(res, result.publishedUrl.short_URL, 'Blog post published successfully')
        } else {
            ResponseFormatter.error(res, ErrorBuilder.badRequest('Failed to publish blog post'))
        }
    }), 

    publishShopifyPost: asyncHandler(async(req:Request, res:Response) => { 
        const userId = req?.user as IUser
        const blogPostId = req?.query?.blogPostId as string
        const {shopifyId} = req.body

        const result = await shopifyPublishService.publishBlogPost(userId._id, shopifyId, blogPostId)
        
        ResponseFormatter.success(res, result.publishedUrl, 'Blog post published successfully')
        
    })
}
