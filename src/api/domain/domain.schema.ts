import Joi from "joi";

export const createDomainSchema = Joi.object({
    url: Joi.string().required()
});