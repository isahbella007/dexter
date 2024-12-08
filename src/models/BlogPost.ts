import mongoose, { Schema, model } from 'mongoose';
import { IMediaSettings, IPerformanceMetrics, IPlatformPublication, IPostSettings, IStructureSettings } from './interfaces/BlogPostInterfaces';

export interface IBlogPost {
    _id: string;
    domainId: mongoose.Schema.Types.ObjectId | string;
    userId: mongoose.Schema.Types.ObjectId | string;
    mainKeyword: string[] | string;
    title: string;
    keywords: string[];
    estimatedMonthlyTraffic: number;
    content: string;
    status?: 'draft' | 'ready' | 'published' | 'archived';
    seoScore: number;
    metaTitle: string;
    metaDescription: string;
    settings: IPostSettings;
    mediaSettings: IMediaSettings;
    structure: IStructureSettings;
    performance: IPerformanceMetrics;
    platformPublications: IPlatformPublication[];
    isTemporary: boolean;
    singleFormTemporary: boolean; //this holds the temp status of the form when doing single post generation 
    singleFormExpiresAt?:Date;
    // expired AT is for free users who want to do the single post generation. we leave their post so that when they upgrade within 7 days, they still see it
    expiresAt?: Date;
    generationType: 'single' | 'bulk' | 'demo';
    createdAt: Date;
    updatedAt: Date;
}

const blogPostSchema = new Schema<IBlogPost>({
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mainKeyword: { type: [String], required: true },
    title: { type: String, required: true, maxlength: 100 },
    keywords: [{ type: String }],
    estimatedMonthlyTraffic: { type: Number, default: 0 },
    content: { type: String },
    status: { 
        type: String, 
        enum: ['draft', 'ready', 'published', 'archived'],
        default: 'draft', 
        required: false
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
    }], 
    // Add new fields for subscription features
    isTemporary: { 
        type: Boolean, 
        default: false 
    },
    singleFormTemporary: { 
        type: Boolean, 
        default: true 
    },
    singleFormExpiresAt:{
        type: Date, 
    },
    expiresAt: { 
        type: Date,
        // Only set for temporary content
        default: function(this: IBlogPost) {
            if (this.isTemporary) {
                const date = new Date();
                date.setDate(date.getDate() + 7); // 7 days from creation
                return date;
            }
            return undefined;
        }
    },
    generationType: {
        type: String,
        enum: ['single', 'bulk', 'demo'],
        required: true
    }
}, { timestamps: true });

// // TTL index for temporary content
// blogPostSchema.index(
//     { expiresAt: 1 }, 
//     { 
//         expireAfterSeconds: 0, // 7 days
//         partialFilterExpression: { isTemporary: true }
//     }
// );

blogPostSchema.index(
    {singleFormExpiresAt: 1}, 
    
    { 
        expireAfterSeconds: 180, 
        partialFilterExpression: { singleFormTemporary: true }
    }
)

export const BlogPost = model<IBlogPost>('BlogPost', blogPostSchema);
