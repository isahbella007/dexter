import Joi from "joi";

export const generateSingleTemplate = Joi.object({ 
    title: Joi.string().trim().min(1).max(100).required(), 
    mainKeyword: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string()).max(80)
    )
})

export const blogPostKeyWordsUpdate = Joi.object({ 
    mainKeyword: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string()).max(80)
    ), 
    
})

export const generateBlogPost = Joi.object({ 
    mainKeyword: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string()).max(80)
    ), 
    title: Joi.string().trim().min(1).max(100).required(), 
    aiPrompt: Joi.string().trim().min(1).max(1000).optional()
})

export const generateBulkTitle = Joi.object({ 
    mainKeyword: Joi.array().items(Joi.string()).max(10).required()
})

export const generateBulkKeywords = Joi.object({ 
    mainKeyword: Joi.array().items(Joi.string()).max(10).required(),
    title: Joi.array().items(Joi.string()).max(10).required()
})

export const generateBulkArticles = Joi.object({ 
    articles: Joi.array().items(Joi.object({
        mainKeyword: Joi.string().required(),
        title: Joi.string().required(), 
        keywords: Joi.array().items(Joi.string()).max(10).required()
    })).required()
})

export const updateBlogPost = Joi.object({ 
    // blogPostId: Joi.string().required(),
    mainKeyword: Joi.string().optional(),
    title: Joi.string().optional(),
    content: Joi.string().required()
})

export const updateBlogPostSection = Joi.object({ 
    selectedText: Joi.string().required(),
    AIPrompt: Joi.string().required()
})

export const getBlogPostSchema = Joi.object({ 
    batchId: Joi.string().optional(),
    userId: Joi.string().optional(),
    platform: Joi.string().optional(),
    siteId: Joi.string().optional(), 
    page: Joi.string().optional()
})

export const generateHook = Joi.object({ 
    hookType: Joi.string().required(),
    blogPostId: Joi.string().required(),
    
})

export const refreshBlogImage = Joi.object({ 
    blogPostId: Joi.string().required(), 
    identifier: Joi.string().required()
})