import { ArticleType, POV, ToneOfVoice } from "../BlogPostCoreSettings";
import { IBlogContentInput, IStructureSettings } from "./BlogPostInterfaces";

export interface IKeywordGenerationResponse {
    keywords: string[];
}

export interface RegenerationConfig {
    language: string;
    articleSize: ArticleType;
    toneOfVoice: ToneOfVoice;
    pointOfView: POV;
    targetCountry?: string;
    humanizeText?: boolean;
    aiModel: string;
    customAPIKey?: string;
    tokenConfig: {
        minTokens: number;
        maxTokens: number;
        totalTokens: number;
    };
    mainKeyword: string | string[];
    keywords: string | string[];
    title: string;
    detailsToInclude?: string;
    extraKeywords?: string[];
    structure?: IStructureSettings;
    internalLinks?: { title: string, url: string }[];
    enhanceWithWebData?: boolean;
    scrappedInsights?:string[]
}



export interface ISectionEditInput {
    selectedText: string;
    AIPrompt: string;
    surroundingContext: {
        nextText: string;
    };
    mainKeyword: string | string[];
    title: string;
}

export interface BaseAIService {
    generateRelatedKeywords(mainKeyword: string, count: number, model: string): Promise<string[]>;
    generateBlogTitle(keyword: string | string[], model: string): Promise<string>;
    generateBlogContent(article: IBlogContentInput, model: string): Promise<string>;
    generateSectionEdit(input: ISectionEditInput, model: string): Promise<string>;
    regenerateBlogContent(config: RegenerationConfig): Promise<string>;
    validateAPIKey?(apiKey: string): Promise<boolean>;
    estimateTokens?(text: string): Promise<number>;
    generateHook(hookType: string, mainKeyword: string, model: string): Promise<string>;
}

export interface IScrapedInsight {
    keyword: string;
    title: string;
    snippet: string;
    source: string;
} 