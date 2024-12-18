import { BlogPost } from "../../../models/BlogPost";
import { IUser } from "../../../models/interfaces/UserInterface";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { asyncHandler } from "../../../utils/helpers/asyncHandler";
import { Request, Response } from "express";
import { BlogPostSettingsService, blogPostSettingsService } from "./blogSettings.service";
import { ResponseFormatter } from "../../../utils/errors/ResponseFormatter";

export const blogSettingsController = { 
    updateSettings: asyncHandler(async (req: Request, res: Response) => {
        const blogPostId = req.query.blogPostId as string;
        const userId = (req.user as IUser)._id;

        // Analyze the changes
        const analysis = await blogPostSettingsService.handleRegenerationChange(blogPostId, userId, req.body)


        ResponseFormatter.success(res, analysis, 'done')
    })
}