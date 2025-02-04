import { Anthropic } from '@anthropic-ai/sdk';
import { AiModel } from "../../../models/BlogPostCoreSettings";
import { BaseAIService, ISectionEditInput, RegenerationConfig } from '../../../models/interfaces/AIServiceInterfaces';
import { IBlogContentInput } from "../../../models/interfaces/BlogPostInterfaces";
import { AI_MODEL_CONFIGS } from "../../constants/settings.constants";
import { ErrorBuilder } from "../../errors/ErrorBuilder";
import { AIPromptBuilder } from './AIPromptBuilder';

export class AnthropicService implements BaseAIService {
    private anthropic: Anthropic | null = null;
    private apiKey: string | null = null;

    constructor(apiKey?: string) {
        if (apiKey) {
            this.init(apiKey);
        }
    }

    private init(apiKey: string) {
        this.apiKey = apiKey;
        this.anthropic = new Anthropic({
            apiKey: apiKey
        });
    }

    async validateAPIKey(apiKey: string): Promise<boolean> {
        try {
            const anthropic = new Anthropic({
                apiKey: apiKey
            });

            await anthropic.messages.create({
                model: 'claude-3-haiku',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Test' }]
            });

            return true;
        } catch (error) {
            throw ErrorBuilder.badRequest('Invalid Anthropic API key');
        }
    }

    private async generateCompletion(prompt: string, model: string, systemPrompt?: string, keywordPresent?: boolean): Promise<string> {
        if (!this.anthropic) {
            throw ErrorBuilder.badRequest('Anthropic client not initialized');
        }

        const modelConfig = AI_MODEL_CONFIGS[model as AiModel];
        if (!modelConfig || modelConfig.provider !== 'anthropic') {
            throw ErrorBuilder.badRequest('Invalid Anthropic model specified');
        }

        try {
            const response = await this.anthropic.messages.create({
                model: model,
                max_tokens: 1000,
                temperature: 0.7,
                system: systemPrompt || 'You are a professional content writer.',
                messages: [{ role: 'user', content: prompt }]
            });

            if (response.content[0].type === 'text') {
                return response.content[0].text;
            }
            throw ErrorBuilder.internal('Unexpected response format from Anthropic API');
        } catch (error: any) {
            if (error.status === 401) {
                throw ErrorBuilder.unauthorized('Invalid API key or authentication failed');
            }
            if (error.status === 429) {
                throw ErrorBuilder.tooManyRequests('Rate limit exceeded');
            }
            throw ErrorBuilder.internal('Failed to generate content with Anthropic');
        }
    }

    async generateRelatedKeywords(mainKeyword: string, count: number, model: string): Promise<string[]> {
        const prompt = AIPromptBuilder.buildKeywordGenerationPrompt(mainKeyword, count);
        const response = await this.generateCompletion(prompt, model);

        if (!response) {
            throw ErrorBuilder.internal("Failed to generate keywords");
        }

        return response
            .split(',')
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0)
            .slice(0, count);
    }

    async generateBlogTitle(keyword: string | string[], model: string): Promise<string> {
        const prompt = AIPromptBuilder.buildTitleGenerationPrompt(keyword);
        const response = await this.generateCompletion(prompt, model);

        if (!response) {
            throw ErrorBuilder.internal("Failed to generate title");
        }

        const title = response.trim().replace(/["']/g, '');
        return title.length > 100 ? title.substring(0, 97) + '...' : title;
    }

    async generateBlogContent(article: IBlogContentInput, model: string): Promise<string> {
        const { systemPrompt, userPrompt } = AIPromptBuilder.buildBlogContentPrompts(article);
        return await this.generateCompletion(userPrompt, model, systemPrompt);
    }

    async generateSectionEdit(input: ISectionEditInput, model: string): Promise<string> {
        const { systemPrompt, userPrompt } = AIPromptBuilder.buildSectionEditPrompts(input);
        return await this.generateCompletion(userPrompt, model, systemPrompt);
    }

    async regenerateBlogContent(config: RegenerationConfig): Promise<string> {
        try {
            const systemPrompt = AIPromptBuilder.buildSystemPrompt(config);
            const {userPrompt, keywordPresent} = AIPromptBuilder.buildUserPrompt(config);
            return await this.generateCompletion(userPrompt, config.aiModel, systemPrompt, keywordPresent);

        } catch (error) {
            throw ErrorBuilder.internal("Failed to regenerate blog content");
        }
    }


    async generateHook(hookType: string, mainKeyword: string, model: string): Promise<string> {
        const {systemPrompt, userPrompt} = AIPromptBuilder.buildGenerateHookPrompt(hookType, mainKeyword)
        return await this.generateCompletion(userPrompt, model, systemPrompt)
    }


    async estimateTokens(text: string): Promise<number> {
        // Anthropic's tokenizer is not publicly available, so this is an estimation
        return Math.ceil(text.length / 4);
    }
}

export const anthropicService = new AnthropicService(); 