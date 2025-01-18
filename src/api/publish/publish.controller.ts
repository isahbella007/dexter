import { IUser } from "../../models/interfaces/UserInterface";
import { wordpressService } from "../../utils/services/wordpress.service";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";
import { asyncHandler } from "../../utils/helpers/asyncHandler"
import { Request, Response } from "express";
import { wordpressPublishService } from "./services/wordpress.publish.service";

export const publishController = {
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
        const wpAccessToken = (req?.user as IUser).oauth?.wordpress?.accessToken
        const blogPostId = req?.query?.blogPostId as string
        const {siteId} = req.body

        if(!wpAccessToken) throw ErrorBuilder.badRequest('Please connect your wordpress account to publish your blog post')

        const result = await wordpressPublishService.publishBlogPost(userId._id, siteId, blogPostId)
        if(result.success) {
            ResponseFormatter.success(res, result.publishedUrl.short_URL, 'Blog post published successfully')
        } else {
            ResponseFormatter.error(res, ErrorBuilder.badRequest('Failed to publish blog post'))
        }
    })
}
