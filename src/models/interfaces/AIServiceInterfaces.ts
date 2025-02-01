import { ArticleType, POV, ToneOfVoice } from "../BlogPostCoreSettings";
import { IBlogContentInput } from "./BlogPostInterfaces";

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
    title: string;
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
} 