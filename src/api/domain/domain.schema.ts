import Joi from "joi";

export const createDomainSchema = Joi.object({
    link: Joi.string().required()
});