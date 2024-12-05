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