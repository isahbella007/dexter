import { BlogPost } from "../../../models/BlogPost";
import { IUser } from "../../../models/interfaces/UserInterface";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { asyncHandler } from "../../../utils/helpers/asyncHandler";
import { Request, Response } from "express";
import { BlogPostSettingsService, blogPostSettingsService } from "./blogSettings.service";
import { ResponseFormatter } from "../../../utils/errors/ResponseFormatter";
import { wordpressService } from "../../../utils/services/wordpress.service";

export const blogSettingsController = { 
    updateSettings: asyncHandler(async (req: Request, res: Response) => {
        const blogPostId = req.query.blogPostId as string;
        const userId = (req.user as IUser)._id;

        // Analyze the changes
        const analysis = await blogPostSettingsService.handleRegenerationChange(blogPostId, userId, req.body)


        ResponseFormatter.success(res, analysis, 'done')
    }),

    fetchWordPressSites: asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as IUser)._id;
        const wpAccessToken = (req?.user as IUser).oauth?.wordpress?.accessToken

        if(!wpAccessToken) throw ErrorBuilder.badRequest('Please connect your wordpress account to fetch your sites')
        const sites = await wordpressService.fetchAndStoreSites(userId, wpAccessToken)


        ResponseFormatter.success(res, sites, 'WordPress sites fetched successfully')
    }),

    getWordPressPosts: asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as IUser)._id;
        const siteUrl = req.query.siteUrl as string;
        const page = req.query.page as string;

        if(!siteUrl) throw ErrorBuilder.badRequest('Site URL is required')
        const subDomains = await wordpressService.getPostUrls(userId, siteUrl, page as unknown as number || 1)

        ResponseFormatter.success(res, subDomains, 'Sub domains fetched successfully')

    })
}