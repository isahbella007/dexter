import Joi from "joi";
import { SYSTEM_PLATFORM } from "../../models/BlogPost";

export const schedulePostSchema = Joi.object({ 
    blogPostId: Joi.string().required(),
    siteId: Joi.number().optional(),
    platform: Joi.string().valid(...Object.values(SYSTEM_PLATFORM)).required(),
    scheduledDates: Joi.array()
    .items(Joi.date())
    .min(1)
    .required()
    .messages({
        'array.min': 'At least one scheduled date is required'
    })
})