import mongoose, { Schema, model } from 'mongoose';
import { IBlogPost, IMediaSettings, IPerformanceMetrics, IPlatformPublication, IPostSettings, IStructureSettings } from './interfaces/BlogPostInterfaces';
import { blogPostSettingsSchema } from './BlogPostCoreSettings';
import { blogPostPerformanceSchema } from './BlogPostPerformance';
import { blogPostMediaSchema, BlogPostMediaSettings } from './BlogPostMediaSettings';
import { blogPostStructureSchema } from './BlogPostStructure';
import { blogPostLinkingSchema } from './BlogPostLinkingSettings';
import { blogPostAdvancedSchema } from './BlogPostAdvancedSettings';

export enum SYSTEM_PLATFORM {
    wordpress = 'wordpress',
    wix = 'wix', 
    shopify = 'shopify',
    none = 'none'
}

export enum POST_STATUS {
    draft = 'draft',
    ready = 'ready',
    published = 'published',
    archived = 'archived',
    none = 'none'
}

export enum GENERATION_TYPE {
    single = 'single',
    bulk = 'bulk',
    demo = 'demo',
    none = 'none'
}

export enum PUBLISH_STATUS { 
    pending = 'pending', 
    published = 'published',
    failed = 'failed',
    completed = 'completed'
}

const blogPostSchema = new Schema<IBlogPost>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'GenerationBatch', required: false },
    mainKeyword: { type: [String], required: true },
    title: { type: String, required: true, maxlength: 100 },
    keywords: [{ type: String }],
    estimatedMonthlyTraffic: { type: Number, default: 0 },
    content: { type: String },
    status: { 
        type: String, 
        enum: Object.values(POST_STATUS),
        default: POST_STATUS.draft, 
        required: false
    },
    generationType: {type: String,enum: Object.values(GENERATION_TYPE),required: true},
    seoScore: { type: Number, default: 0 },
    metadata:{
        wordCount: {type: Number},
        characterCount: {type: Number},
        mainKeyword: {type: String},
        AIPrompt: {type: String},
        metaTitle: {type: String},
        metaDescription: {type: String},
        readingTime: {type: Number},
    },
    seoAnalysis:{
        mainKeywordDensity: {type: Number},
        contentLength: {type: Number},
        readabilityScore: {type: Number},
        mainKeywordPositions: {
            metaTitle: {type: Boolean},
            metaDescription: {type: Boolean},
            h1Headers: {type: Number},
            h2Headers: {type: Number},
            h3Headers: {type: Number},
            content: {type: [Number]},
        },
    },
    settings: {type: blogPostSettingsSchema, default: () => ({})},
    mediaSettings: {type: blogPostMediaSchema, default: () => ({})},
    structure: {type: blogPostStructureSchema, default: () => ({})},
    performance: {type: blogPostPerformanceSchema, default: () => ({})},
    platformPublications: [{
        platform: { 
            type: String, 
            enum: Object.values(SYSTEM_PLATFORM),
            required: false 
        },
        status: { 
            type: String, 
            enum: Object.values(PUBLISH_STATUS),
            default: PUBLISH_STATUS.pending
        },
        publishedSiteId: {type: Number},
        publishedUrl: { type: String },
        publishedSlug: { type: String },
        publishedAt: { type: Date },
        error: { type: String }
    }],
    linking: {type: blogPostLinkingSchema, default: () => ({})},
    // advanced: {type: blogPostAdvancedSchema, default: () => ({})},
    connectToWeb: {
        scrappedInsights: {type: [String]},
        enhanceWithWebData: {type: Boolean, default: false}
    }
    
}, { timestamps: true });


export const BlogPost = model<IBlogPost>('BlogPost', blogPostSchema);
