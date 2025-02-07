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
        if(!siteUrl || !trackingCode) { 
            throw ErrorBuilder.badRequest('Site url and tracking code are required')
        }
        const response = await analyticsService.fullSEOAnalysis((req.user as IUser)._id, trackingCode, siteUrl )

        ResponseFormatter.success(res, response, 'Dashboard analytics fetched')
    })
}