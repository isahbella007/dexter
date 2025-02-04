import { ArticleType, AiModel, ToneOfVoice, POV } from "../../models/BlogPostCoreSettings";
import { HOOK_TYPE } from "../../models/BlogPostStructure";

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export interface LanguageConfig {
    code: SupportedLanguage;
    display: string;
    isDefault: boolean;
    region?: string;
}

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
    en: { code: 'en', display: 'English', isDefault: true },
    es: { code: 'es', display: 'Spanish', isDefault: false },
    fr: { code: 'fr', display: 'French', isDefault: false },
    de: { code: 'de', display: 'German', isDefault: false }
};

export interface AIModelConfig {
    model: AiModel;
    maxTokens: number;
    costPer1kTokens: number;
    supportedArticleSizes: ArticleType[];
    isPopular?: boolean;
    provider: 'openai' | 'anthropic';
    contextWindow: number;
}

export const AI_MODEL_CONFIGS: Record<AiModel, AIModelConfig> = {
    [AiModel.GPT_3_5]: {
        model: AiModel.GPT_3_5,
        maxTokens: 4096,
        costPer1kTokens: 0.002,
        supportedArticleSizes: [ArticleType.SMALL, ArticleType.MEDIUM],
        isPopular: true,
        provider: 'openai',
        contextWindow: 16385
    },
    [AiModel.GPT_4]: {
        model: AiModel.GPT_4,
        maxTokens: 8192,
        costPer1kTokens: 0.03,
        supportedArticleSizes: [ArticleType.SMALL, ArticleType.MEDIUM, ArticleType.LARGE],
        provider: 'openai',
        contextWindow: 8192
    },
    [AiModel.GPT_4O]: {
        model: AiModel.GPT_4O,
        maxTokens: 8192,
        costPer1kTokens: 0.03,
        supportedArticleSizes: [ArticleType.SMALL, ArticleType.MEDIUM, ArticleType.LARGE],
        provider: 'openai',
        contextWindow: 8192
    },
    [AiModel.GPT_4O_MINI]: {
        model: AiModel.GPT_4O_MINI,
        maxTokens: 4096,
        costPer1kTokens: 0.01,
        supportedArticleSizes: [ArticleType.SMALL, ArticleType.MEDIUM],
        isPopular: true,
        provider: 'openai',
        contextWindow: 4096
    },
    [AiModel.CLAUDE_3_HAIKU]: {
        model: AiModel.CLAUDE_3_HAIKU,
        maxTokens: 200000,
        costPer1kTokens: 0.25,
        supportedArticleSizes: [ArticleType.SMALL, ArticleType.MEDIUM],
        isPopular: true,
        provider: 'anthropic',
        contextWindow: 200000
    },
    [AiModel.CLAUDE_3_SONNET]: {
        model: AiModel.CLAUDE_3_SONNET,
        maxTokens: 200000,
        costPer1kTokens: 0.50,
        supportedArticleSizes: [ArticleType.SMALL, ArticleType.MEDIUM, ArticleType.LARGE],
        provider: 'anthropic',
        contextWindow: 200000
    },
    [AiModel.CLAUDE_3_OPUS]: {
        model: AiModel.CLAUDE_3_OPUS,
        maxTokens: 200000,
        costPer1kTokens: 1.50,
        supportedArticleSizes: [ArticleType.SMALL, ArticleType.MEDIUM, ArticleType.LARGE],
        provider: 'anthropic',
        contextWindow: 200000
    }
};

export const TOKEN_CALCULATIONS = {
    [ArticleType.SMALL]: { min: 1200, max: 1800, tokens: 2340 },
    [ArticleType.MEDIUM]: { min: 2400, max: 3000, tokens: 3900 },
    [ArticleType.LARGE]: { min: 4800, max: 6000, tokens: 7800 }
};

export interface ValidationRule {
    validate: (value: any) => boolean;
    errorMessage: string;
}

export const SETTINGS_VALIDATION_RULES: Record<string, ValidationRule> = {
    language: {
        validate: (value: string) => SUPPORTED_LANGUAGES.includes(value as SupportedLanguage),
        errorMessage: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
    },
    articleSize: {
        validate: (value: string) => Object.values(ArticleType).includes(value as ArticleType),
        errorMessage: `Article size must be one of: ${Object.values(ArticleType).join(', ')}`
    },
    toneOfVoice: {
        validate: (value: string) => Object.values(ToneOfVoice).includes(value as ToneOfVoice),
        errorMessage: `Tone must be one of: ${Object.values(ToneOfVoice).join(', ')}`
    },
    pointOfView: {
        validate: (value: string) => Object.values(POV).includes(value as POV),
        errorMessage: `Point of view must be one of: ${Object.values(POV).join(', ')}`
    },
    aiModel: {
        validate: (value: string) => Object.values(AiModel).includes(value as AiModel),
        errorMessage: `AI model must be one of: ${Object.values(AiModel).join(', ')}`
    }
}; 

export const STRUCTURE_VALIDATION_RULES: Record<string, ValidationRule> = {
    hookType: {
        validate: (value: string) => Object.values(HOOK_TYPE).includes(value as HOOK_TYPE),
        errorMessage: `Hook type must be one of: ${Object.values(HOOK_TYPE).join(', ')}`
    },
    includeH3: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include H3 must be a boolean.'
    },
    includeTables: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include tables must be a boolean.'
    },
    includeConclusion: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include conclusion must be a boolean.'
    },
    includeLists: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include lists must be a boolean.'
    },
    includeItalics: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include italics must be a boolean.'
    },
    includeQuotes: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include quotes must be a boolean.'
    },
    includeKeyTakeaways: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include key takeaways must be a boolean.'
    },
    includeFAQs: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include FAQs must be a boolean.'
    },
    includeBold: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include bold must be a boolean.'
    },
    includeBulletPoints: {
        validate: (value: any) => typeof value === 'boolean',
        errorMessage: 'Include bullet points must be a boolean.'
    }
};