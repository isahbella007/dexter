import mongoose, { Schema, model } from 'mongoose';
import { IMediaSettings, IPerformanceMetrics, IPlatformPublication, IPostSettings, IStructureSettings } from './interfaces/BlogPostInterfaces';

export interface IBlogPost {
    _id: string;
    domainId: mongoose.Schema.Types.ObjectId | string;
    userId: mongoose.Schema.Types.ObjectId | string;
    mainKeyword: string;
    title: string;
    keywords: string[];
    content: string;
    status: 'draft' | 'ready' | 'published' | 'archived';
    seoScore: number;
    metaTitle: string;
    metaDescription: string;
    settings: IPostSettings;
    mediaSettings: IMediaSettings;
    structure: IStructureSettings;
    performance: IPerformanceMetrics;
    platformPublications: IPlatformPublication[];
    createdAt: Date;
    updatedAt: Date;
}

const blogPostSchema = new Schema<IBlogPost>({
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mainKeyword: { type: String, required: true },
    title: { type: String, required: true, maxlength: 100 },
    keywords: [{ type: String }],
    content: { type: String },
    status: { 
        type: String, 
        enum: ['draft', 'ready', 'published', 'archived'],
        default: 'draft' 
    },
    seoScore: { type: Number, default: 0 },
    metaTitle: { type: String },
    metaDescription: { type: String },
    settings: {
        language: { type: String, default: 'en' },
        articleSize: { 
            type: String, 
            enum: ['small', 'medium', 'large'],
            default: 'medium'
        },
        toneOfVoice: { type: String },
        aiModel: { type: String },
        pointOfView: { type: String },
        targetCountry: { type: String },
        humanizeText: { type: Boolean, default: true }
    },
    mediaSettings: {
        includeImages: { type: Boolean, default: true },
        imageCount: { type: Number, default: 1 },
        imageStyle: { type: String },
        imageSizes: { type: String },
        includeVideos: { type: Boolean, default: false },
        videoCount: { type: Number, default: 0 }
    },
    structure: {
        includeHook: { type: Boolean, default: true },
        includeConclusion: { type: Boolean, default: true },
        includeTables: { type: Boolean, default: false },
        includeH3: { type: Boolean, default: true },
        includeLists: { type: Boolean, default: true },
        includeItalics: { type: Boolean, default: true },
        includeQuotes: { type: Boolean, default: true },
        includeKeyTakeaway: { type: Boolean, default: true },
        includeFAQ: { type: Boolean, default: true },
        includeBold: { type: Boolean, default: true },
        includeBulletpoints: { type: Boolean, default: true }
    },
    performance: {
        organicTraffic: { type: Number, default: 0 },
        pagesPerSession: { type: Number, default: 0 },
        bounceRate: { type: Number, default: 0 },
        averagePosition: { type: Number, default: 0 },
        crawlErrors: { type: Number, default: 0 }
    },
    platformPublications: [{
        platform: { 
            type: String, 
            enum: ['wordpress', 'shopify', 'wix'],
            required: true 
        },
        status: { 
            type: String, 
            enum: ['pending', 'published', 'failed'],
            default: 'pending'
        },
        publishedUrl: { type: String },
        publishedAt: { type: Date },
        error: { type: String }
    }]
}, { timestamps: true });

export const BlogPost = model<IBlogPost>('BlogPost', blogPostSchema);
