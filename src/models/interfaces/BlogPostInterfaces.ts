import mongoose from "mongoose";
import { ArticleType, ArticleTypeMaxWords, POV, ToneOfVoice } from "../BlogPostCoreSettings";

export interface IMediaSettings {
    includeImages: boolean;
    imageCount: number;
    imageStyle: string;
    imageSizes: string;
    includeVideos: boolean;
    videoCount: number;
    keywordInFirstImage: boolean;
    customInstructions: string;
    autoPlacement: boolean;
    layoutOptions: string;
}

export interface IPostSettings {
    language: string;
    articleSize: ArticleType;
    articleMaxWords: ArticleTypeMaxWords;
    toneOfVoice: ToneOfVoice;
    aiModel: string;
    pointOfView: POV;
    targetCountry: string;
    humanizeText: boolean;
    customAPIKey?: string;
}

export interface IStructureSettings {
    includeHook: boolean;
    includeConclusion: boolean;
    includeTables: boolean;
    includeH3: boolean;
    includeLists: boolean;
    includeItalics: boolean;
    includeQuotes: boolean;
    includeKeyTakeaway: boolean;
    includeFAQ: boolean;
    includeBold: boolean;
    includeBulletpoints: boolean;
}

export interface IPerformanceMetrics {
    organicTraffic: number;
    pagesPerSession: number;
    bounceRate: number;
    averagePosition: number;
    crawlErrors: number;
}

export interface IPlatformPublication {
    platform: 'wordpress' | 'shopify' | 'wix';
    status: 'pending' | 'published' | 'failed';
    publishedSiteId: number
    publishedUrl?: string;
    publishedSlug?: string;
    publishedAt?: Date;
    error?: string;
} 

export interface IMetadata {
    wordCount: number;
    characterCount: number;
    mainKeyword: string;
    AIPrompt?: string;
    metaTitle: string;
    metaDescription: string;
    readingTime: number;
}

// export interface ISEOAnalysis {
//     mainKeywordDensity: number;
//     mainKeywordPositions: {
//         metaTitle: boolean;
//         metaDescription: boolean;
//         h1Headers: number;
//         h2Headers: number;
//         h3Headers: number;
//         content: number[];
//     };
//     contentLength: number;
//     readabilityScore: number;
// }
export interface ISEOAnalysis {
    mainKeywordDensity: number;
    contentLength: number;
    readabilityScore: number;
    keywordPositions: IKeywordPosition[];
}

export interface IKeywordPosition {
    type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'content';
    position: number;
    context: string; // The surrounding text or full line
    lineNumber: number;
}

export interface IBlogPost {
    _id: string;
    userId: mongoose.Schema.Types.ObjectId | string;
    batchId: mongoose.Schema.Types.ObjectId | string;
    mainKeyword: string[] | string;
    title: string;
    keywords: string[];
    aiPrompt: string;
    estimatedMonthlyTraffic: number;
    content: string;           // Markdown content
    metadata: IMetadata;
    seoAnalysis: ISEOAnalysis;
    featuredImage: {
        url: string;
        alt: string;
        caption?: string;
    };
    version: number;           // For tracking content versions
    lastEditedAt: Date;
    editHistory: Array<{
        timestamp: Date;
        userId: string;
        changes: string;       // Description of changes
    }>;
    status?: 'draft' | 'ready' | 'published' | 'archived';
    seoScore: number;
    metaTitle: string;
    metaDescription: string;
    settings: IPostSettings;
    mediaSettings: IMediaSettings;
    structure: IStructureSettings;
    performance: IPerformanceMetrics;
    platformPublications: IPlatformPublication[];
    linking: ILinkingSettings;
    advanced: IAdvancedSettings
    generationType: 'single' | 'bulk' | 'demo';
    createdAt: Date;
    updatedAt: Date;
}

export interface IGenerationBatchArticle {
    mainKeyword: string;
    title: string;
    keywords: string[];
    status: 'pending' | 'generating' | 'ready' | 'failed';
}

export interface IGenerationBatch {
    batchId: string;
    userId: string | mongoose.Schema.Types.ObjectId;
    totalArticles: number;
    completedArticles: number;
    status: 'processing' | 'completed' | 'failed';
    articles: IGenerationBatchArticle[];
    startedAt: Date;
    completedAt: Date;
}

export interface IBlogContentInput {
    mainKeyword: string | string[];
    title: string;
    keywords?: string | string[];
    AIPrompt?: string;
}

export interface ILinkingSettings {
    internal: {
        enabled: boolean;
        wordpressSite?: string;  // Selected WordPress site for internal linking
        autoIndex: boolean;      // Automatically index site for relevant links
    };
    external: {
        enabled: boolean;
        linkType: string;        // Dropdown selection for link types
        manualLinks?: string[];  // User-specified external links
        autoIntegrate: boolean;  // Automatically integrate authoritative links
    };
}

export interface IAdvancedSettings {
    webConnectivity: {
        enabled: boolean;
        searchDepth: string;     // Dropdown for search depth
    };
    outlineEditor: {
        enabled: boolean;
        magicBagEnabled: boolean;  // Generate real-time outline from top-ranking articles
        headlines: Array<{
            text: string;
            order: number;
        }>;
        aiModel: string;          // "GPT-4 128k turbo" as default
    };
    directory: {
        path: string;            // Directory path for saving changes
        name: string;            // Directory name
    };
}

export interface IPostMetrics{
    postId: string,
    engagement: number, 
    traffic: number,

    // **views should come from the platform
    views: number, 
    
    // ** from Google search console 
    averagePosition: number,

    // ** from search console
    crawlError: number, 

    // ** from Google Analytics 
    organicTraffic: number, 
    bounceRate: number, 
    pagesPerSession: number
}