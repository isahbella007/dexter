import { asyncHandler } from "../../utils/helpers/asyncHandler";
import { Request, Response } from 'express';
import { ErrorBuilder } from '../../utils/errors/ErrorBuilder';
import { analyticsService } from "./analytics.service";
import { IUser } from "../../models/interfaces/UserInterface";
import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";

export const AnalyticsController = { 
    fetchAnalytics: asyncHandler(async(req: Request, res: Response) => { 
        const siteUrl = req.query?.siteUrl as string || undefined;
        const trackingCode = req.query?.trackingCode as string || undefined;
        const siteId = req.query?.siteId as string || undefined;
        if(!siteUrl || !trackingCode || !siteId) { 
            throw ErrorBuilder.badRequest('Site url, tracking code and site id are required')
        }

        // if the tracking code is null or does not start with properties/ throw an ereror
        if(trackingCode == null || !trackingCode.startsWith('properties/')){
            throw ErrorBuilder.badRequest('Invalid tracking code')
        }
        const response = await analyticsService.fullSEOAnalysis((req.user as IUser)._id, trackingCode, siteUrl, siteId )


        ResponseFormatter.success(res, response, 'Dashboard analytics fetched')
    }), 

    fetchSites: asyncHandler(async(req: Request, res: Response) => {
        const response = await analyticsService.fetchSites((req.user as IUser)._id)
        ResponseFormatter.success(res, response, 'Sites fetched')
    })
}