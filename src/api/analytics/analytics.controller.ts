import { asyncHandler } from "../../utils/helpers/asyncHandler";
import { Request, Response } from 'express';
import { ErrorBuilder } from '../../utils/errors/ErrorBuilder';
import { analyticsService } from "./analytics.service";
import { IUser } from "../../models/interfaces/UserInterface";
import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";

export const AnalyticsController = { 
    fetchAnalytics: asyncHandler(async(req: Request, res: Response) => { 
        const platform = req.query?.platform as string || undefined;
        const siteId = req.query?.siteId as string || undefined;
        if(!platform) { 
            throw ErrorBuilder.badRequest('Platform is required')
        }
        const response = await analyticsService.fullSEOAnalysis((req.user as IUser)._id, platform, siteId)
        ResponseFormatter.success(res, response, 'Dashboard analytics fetched')
    })
}