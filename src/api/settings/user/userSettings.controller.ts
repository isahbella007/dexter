import { asyncHandler } from "../../../utils/helpers/asyncHandler";
import { Response, Request } from "express";
import { addBusinessDetails } from "./user.schema";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { userSettingsService } from "./userSettings.service";
import { IUser } from "../../../models/interfaces/UserInterface";
import { ResponseFormatter } from "../../../utils/errors/ResponseFormatter";
import { authService } from "../../auth/auth.service";
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
    } )
}