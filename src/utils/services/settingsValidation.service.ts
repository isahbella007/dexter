import { ArticleType, AiModel } from "../../models/BlogPostCoreSettings";
import { IPostSettings } from "../../models/interfaces/BlogPostInterfaces";
import { ErrorBuilder } from "../errors/ErrorBuilder";
import { AI_MODEL_CONFIGS, SETTINGS_VALIDATION_RULES, TOKEN_CALCULATIONS } from "../constants/settings.constants";
import { anthropicService } from "./aiServices/anthropicService";

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