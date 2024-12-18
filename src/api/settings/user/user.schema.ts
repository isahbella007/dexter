import Joi from 'joi'

export const addBusinessDetails = Joi.object({ 
    business: Joi.object({
        name: Joi.string().optional(), 
        description: Joi.string().optional(), 
        services: Joi.array().items(Joi.string()).optional()
    })
})