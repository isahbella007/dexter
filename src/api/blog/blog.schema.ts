import Joi from "joi";

export const generateSingleTemplate = Joi.object({ 
    title: Joi.string().trim().min(1).max(100).required(), 
    mainKeyword: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string()).max(80)
    ), 
    domainId: Joi.string().optional()
})

export const blogPostKeyWordsUpdate = Joi.object({ 
    mainKeyword: Joi.string().trim().min(1).max(100).required()
    
})

export const generateBlogPost = Joi.object({ 
    mainKeyword: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string()).max(80)
    ), 
    title: Joi.string().trim().min(1).max(100).required(), 
    aiPrompt: Joi.string().trim().min(1).max(1000).required()
})

export const generateBulkTitle = Joi.object({ 
    mainKeyword: Joi.array().items(Joi.string()).max(10).required()
})