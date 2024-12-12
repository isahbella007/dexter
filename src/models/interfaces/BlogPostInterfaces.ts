import mongoose from "mongoose";

export interface IMediaSettings {
    includeImages: boolean;
    imageCount: number;
    imageStyle: string;
    imageSizes: string;
    includeVideos: boolean;
    videoCount: number;
}

export interface IPostSettings {
    language: string;
    articleSize: 'small' | 'medium' | 'large';
    toneOfVoice: string;
    aiModel: string;
    pointOfView: string;
    targetCountry: string;
    humanizeText: boolean;
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
    publishedUrl?: string;
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
    domainId: mongoose.Schema.Types.ObjectId | string;
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
    singleFormTemporary: boolean; //this holds the temp status of the form when doing single post generation 
    singleFormExpiresAt?:Date;
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
    domainId: string | mongoose.Schema.Types.ObjectId;
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
    AIPrompt?: string;
}