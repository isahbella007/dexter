import { ArticleType, AiModel } from "../../models/BlogPostCoreSettings";
import { IPostSettings, IStructureSettings } from "../../models/interfaces/BlogPostInterfaces";
import { ErrorBuilder } from "../errors/ErrorBuilder";
import { AI_MODEL_CONFIGS, SETTINGS_VALIDATION_RULES, STRUCTURE_VALIDATION_RULES, TOKEN_CALCULATIONS } from "../constants/settings.constants";
import { anthropicService } from "./aiServices/anthropicService";
import { HOOK_TYPE } from "../../models/BlogPostStructure";
import { InternalLinkingSchema } from "../../api/settings/blog/blogSetting.schema";
import { webScrapingService } from "./webScraping.service";

export class SettingsValidationService {
    validateSettings(settings: Partial<IPostSettings>): void {
        // Validate each field if provided
        Object.entries(settings).forEach(([key, value]) => {
            if (value !== undefined && SETTINGS_VALIDATION_RULES[key]) {
                const rule = SETTINGS_VALIDATION_RULES[key];
                if (!rule.validate(value)) {
                    throw ErrorBuilder.badRequest(rule.errorMessage);
                }
            }
        });

        // Cross-field validations
        this.validateModelCompatibility(settings);
    }

    validateStructureSettings(settings: Partial<IStructureSettings>): void {
        Object.entries(settings).forEach(([key, value]) => {
            if (value !== undefined && STRUCTURE_VALIDATION_RULES[key]) {
                const rule = STRUCTURE_VALIDATION_RULES[key];
                if (!rule.validate(value)) {
                    throw ErrorBuilder.badRequest(rule.errorMessage);
                }
            }
        });
    }


    validateDetailsToInclude(detailsToInclude: string): void {
        if(detailsToInclude){

            if(detailsToInclude.length > 1000){
                throw ErrorBuilder.badRequest('Details to include cannot be longer than 1000 characters');
            }
        }
    }

    validateInternalLinks(internalLinks: { title: string, url: string }[]): void {
       const {value, error} = InternalLinkingSchema.validate(internalLinks)
       if(error){
        throw ErrorBuilder.badRequest(error.details[0].message)
       }

    }

    async validateConnectToWeb(connectToWeb: { enhanceWithWebData?: boolean, scrappedInsights?: string[] }, newSettingsExtraKeywords?: string[], originalExtraKeywords?: string[]): Promise<void> {
        console.log('connectToWeb', connectToWeb)
        if(connectToWeb.enhanceWithWebData && newSettingsExtraKeywords !== originalExtraKeywords){
            let keywordsToScrape: string[] = []
            if(newSettingsExtraKeywords){

                keywordsToScrape = newSettingsExtraKeywords
            }
            else{
                keywordsToScrape = originalExtraKeywords || []
            }
            console.log('keywordsToScrape', keywordsToScrape)
            const insights = await webScrapingService.enhanceBlogPost(keywordsToScrape)
            console.log('insights', insights)

        }
    }
    // decideOnKeywordsToUse(
    //     existingKeywords: string[],
    //     extraKeywords?: string | string[],
    //     mergeWithExisting: boolean = true 
    // ): string[] {
    //     // Validate extraKeywords
    //     const validatedExtraKeywords = this.validateKeywords(extraKeywords);


    //     // If mergeWithExisting is false, replace existing keywords with extraKeywords
    //     if (!mergeWithExisting) {
    //         return validatedExtraKeywords;
    //     }

    //     // Otherwise, combine existingKeywords and extraKeywords (remove duplicates)
    //     const combinedKeywords = [...new Set([...existingKeywords, ...validatedExtraKeywords])];

    //     return combinedKeywords;
    // }

    validateKeywords(keywords: string | string[]): string[] {
        if (!keywords) return [];
    
        // Convert to array if it's a comma-separated string
        const keywordArray = typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords;
    
        // Remove empty strings and duplicates
        const uniqueKeywords = [...new Set(keywordArray.filter(k => k.length > 0))];
    
        return uniqueKeywords;
    }

    validateModelCompatibility(settings: Partial<IPostSettings>): void {
        const { aiModel, articleSize } = settings;


        if (aiModel && articleSize) {
            const modelConfig = AI_MODEL_CONFIGS[aiModel as AiModel];
            if (!modelConfig) {
                throw ErrorBuilder.badRequest(`Invalid AI model: ${aiModel}`);
            }

            if (!modelConfig.supportedArticleSizes.includes(articleSize as ArticleType)) {
                throw ErrorBuilder.badRequest(
                    `Model ${aiModel} does not support article size ${articleSize}. Supported sizes: ${modelConfig.supportedArticleSizes.join(', ')}`
                );
            }
        }
    }

    calculateTokensAndCost(settings: Partial<IPostSettings>): { tokens: number; cost: number } {
        const { aiModel, articleSize } = settings;

        if (!aiModel || !articleSize) {
            return { tokens: 0, cost: 0 };
        }

        const modelConfig = AI_MODEL_CONFIGS[aiModel as AiModel];
        const tokenCalc = TOKEN_CALCULATIONS[articleSize as ArticleType];

        if (!modelConfig || !tokenCalc) {
            return { tokens: 0, cost: 0 };
        }

        const tokens = tokenCalc.tokens;
        const cost = (tokens / 1000) * modelConfig.costPer1kTokens;

        return { tokens, cost };
    }

    async validateCustomAPIKey(apiKey: string, model: AiModel): Promise<boolean> {
        if (!apiKey) return true; // Optional field

        const modelConfig = AI_MODEL_CONFIGS[model];
        if (!modelConfig) {
            throw ErrorBuilder.badRequest('Invalid AI model specified');
        }

        // Validate key format first
        const validFormat = /^[A-Za-z0-9_-]{32,}$/.test(apiKey);
        if (!validFormat) {
            throw ErrorBuilder.badRequest('Invalid API key format');
        }

        // Provider-specific validation
        if (modelConfig.provider === 'anthropic') {
            if (!apiKey.startsWith('sk-ant-')) {
                throw ErrorBuilder.badRequest('Invalid Anthropic API key format');
            }
            return await anthropicService.validateAPIKey(apiKey);
        }

        // Add other provider validations here
        throw ErrorBuilder.badRequest('Unsupported AI provider');
    }

    validateTokenLimit(content: string, model: AiModel): void {
        const modelConfig = AI_MODEL_CONFIGS[model];
        if (!modelConfig) {
            throw ErrorBuilder.badRequest('Invalid AI model specified');
        }

        const estimatedTokens = Math.ceil(content.length / 4); // Simple estimation
        if (estimatedTokens > modelConfig.maxTokens) {
            throw ErrorBuilder.badRequest(
                `Content exceeds token limit for ${model}. Maximum tokens: ${modelConfig.maxTokens}`
            );
        }
    }
}

export const settingsValidationService = new SettingsValidationService(); 