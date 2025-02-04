import Joi from "joi";

export const InternalLinkingSchema = Joi.array().items({  // Changed to array schema
    title: Joi.string().required(),
    url: Joi.string().uri().required()
})