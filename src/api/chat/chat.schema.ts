import Joi from "joi";

export const generateResponseSchema = Joi.object({
    message: Joi.string().trim().min(1).max(2000).required(), 
    chatId: Joi.string().optional()
});

export const getChatDetailSchema = Joi.object({
    chatId: Joi.string().required()
});

