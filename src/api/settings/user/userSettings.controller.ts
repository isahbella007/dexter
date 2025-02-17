import { asyncHandler } from "../../../utils/helpers/asyncHandler";
import { Response, Request } from "express";
import { addBusinessDetails } from "./user.schema";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { userSettingsService } from "./userSettings.service";
import { IUser } from "../../../models/interfaces/UserInterface";
import { ResponseFormatter } from "../../../utils/errors/ResponseFormatter";
import { authService } from "../../auth/auth.service";
import { GoogleAnalyticsService } from "../../../utils/services/googleAnalytics.service";
import { platformManagementService } from "../../../utils/services/platformManagement.service";
export const UserSettingsController = { 

    addBusinessDetails: asyncHandler(async (req: Request, res:Response) => { 
        const {value, error} = addBusinessDetails.validate(req.body)
        if(error){ 
            throw ErrorBuilder.badRequest(error.details[0].message)
        }
        const response = userSettingsService.handleBusinessDetails((req.user as IUser)._id, value)
        ResponseFormatter.success(res, response, "Business details added ")
    }),

    getCurrentData: asyncHandler(async (req:Request, res:Response) =>{ 
        const response = await authService.getCurrentDataForUser((req.user as IUser)._id)
        console.log('current data controller call')
        ResponseFormatter.success(res, response, 'User current data ')
    } ), 

    fetchUserAccounts: asyncHandler(async (req:Request, res:Response) => { 
        const user = req.user as IUser
        if(!user.oauth?.google.accessToken || !user.oauth?.google.refreshToken || !user.oauth?.google.expiryDate){ 
            throw ErrorBuilder.badRequest('Please link your google account to continue')
        }
        const googleAnalyticsService = new GoogleAnalyticsService(user.oauth?.google.accessToken, user.oauth?.google.refreshToken, user.oauth?.google.expiryDate)
        const response = await googleAnalyticsService.fetchUserAccounts()
        ResponseFormatter.success(res, response, 'User accounts ')
    } ),

    fetchAllAccountProperties: asyncHandler(async (req:Request, res:Response) => { 
        const user = req.user as IUser
        if(!user.oauth?.google.accessToken || !user.oauth?.google.refreshToken || !user.oauth?.google.expiryDate){ 
            throw ErrorBuilder.badRequest('Please link your google account to continue')
        }
        const {accountId} = req.body
        if(!accountId){ 
            throw ErrorBuilder.badRequest('Account id is required')
        }
        const googleAnalyticsService = new GoogleAnalyticsService(user.oauth?.google.accessToken, user.oauth?.google.refreshToken, user.oauth?.google.expiryDate)
        const response = await googleAnalyticsService.fetchAllAccountProperties(accountId)
        ResponseFormatter.success(res, response, 'User current data ')
    } ),

    fetchAllGA4Properties: asyncHandler(async (req:Request, res:Response) => { 
        const user = req.user as IUser
        if(!user.oauth?.google.accessToken || !user.oauth?.google.refreshToken || !user.oauth?.google.expiryDate){ 
            throw ErrorBuilder.badRequest('Please link your google account to continue')
        }
        const {propertyId} = req.body
        const googleAnalyticsService = new GoogleAnalyticsService(user.oauth?.google.accessToken, user.oauth?.google.refreshToken, user.oauth?.google.expiryDate)
        const response = await googleAnalyticsService.fetchAllGA4Properties(propertyId)
        ResponseFormatter.success(res, response, 'User current data ')
    } ),

    // if they decide to link it manually, verify the token they are passing 
    verifyGA4Token: asyncHandler(async (req:Request, res:Response) => { 
        const user = req.user as IUser
        if(!user.oauth?.google.accessToken || !user.oauth?.google.refreshToken || !user.oauth?.google.expiryDate){ 
            throw ErrorBuilder.badRequest('Please link your google account to continue')
        }
        const {propertyId} = req.body
        const googleAnalyticsService = new GoogleAnalyticsService(user.oauth?.google.accessToken, user.oauth?.google.refreshToken, user.oauth?.google.expiryDate)
        const response = await googleAnalyticsService.verifyGA4Property(propertyId)
        if(response){ 
            ResponseFormatter.success(res, response, 'We can save this in the db for the site Id they passed ')
        } else { 
            throw ErrorBuilder.badRequest('Token is not valid')
        }
    } ), 

    saveTrackingCode: asyncHandler(async (req:Request, res:Response) => { 
        const {code, siteId, platform} = req.body
        const user = req.user as IUser
        if(!user.oauth?.google.accessToken || !user.oauth?.google.refreshToken || !user.oauth?.google.expiryDate){ 
            throw ErrorBuilder.badRequest('Please link your google account to continue')
        }
        if(!platform) { 
            throw ErrorBuilder.badRequest('Platform is required')
        }
        const response = await platformManagementService.saveGA4TrackingCode(user._id, code, siteId, platform)
        ResponseFormatter.success(res, response, 'Tracking code saved ')
    } )
}