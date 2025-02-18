import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { openai } from "../../../config/openai";
import { BaseAIService, ISectionEditInput, RegenerationConfig } from "../../../models/interfaces/AIServiceInterfaces";
import { IBlogContentInput } from "../../../models/interfaces/BlogPostInterfaces";
import { ErrorBuilder } from "../../errors/ErrorBuilder";
import { AIPromptBuilder } from "./AIPromptBuilder";

export class OpenAIService implements BaseAIService {
    private async generateCompletion(prompt: string, model: string, systemPrompt?: string, keywordPresent?: boolean): Promise<string> {
        try {
            console.log('the system prompt', systemPrompt)
            const messages: ChatCompletionMessageParam[] = [
                { role: "user", content: prompt }
            ];

            if (systemPrompt) {
                messages.unshift({ role: "system", content: systemPrompt });
            }

            const completion = await openai.chat.completions.create({
                model: model,
                messages,
                temperature: 0.7,
                max_tokens: keywordPresent ? 2500 : 1500,
            });

            console.log('Content' , completion.choices[0].message?.content)
            return completion.choices[0].message?.content || '';
        } catch (error) {
            throw ErrorBuilder.internal("Failed to generate AI response");
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
        const { systemPrompt, userPrompt, keywordPresent } = AIPromptBuilder.buildBlogContentPrompts(article);
        return await this.generateCompletion(userPrompt, model, systemPrompt, keywordPresent);
    }

    async generateSectionEdit(input: ISectionEditInput, model: string): Promise<string> {
        const { systemPrompt, userPrompt } = AIPromptBuilder.buildSectionEditPrompts(input);
        return await this.generateCompletion(userPrompt, model, systemPrompt);
    }

    // regenerate the blog content
    async regenerateBlogContent(config: RegenerationConfig): Promise<string> {
        try {
            console.log('while regenerating the blog, you are using the openAIService in the aiService folder')
            const systemPrompt = AIPromptBuilder.buildSystemPrompt(config);
            const {userPrompt, keywordPresent} = AIPromptBuilder.buildUserPrompt(config);
            console.log('user promptu', userPrompt)
            return await this.generateCompletion(userPrompt, config.aiModel, systemPrompt, keywordPresent);

        } catch (error) {
            throw ErrorBuilder.internal("Failed to regenerate blog content");
        }
    }

    async generateHook(hookType: string, mainKeyword: string, model: string): Promise<string> {
        const {systemPrompt, userPrompt} = AIPromptBuilder.buildGenerateHookPrompt(hookType, mainKeyword);
        return await this.generateCompletion(userPrompt, model, systemPrompt);
    }

    async estimateTokens(text: string): Promise<number> {
        // OpenAI's tokenizer estimation (roughly 4 characters per token)
        return Math.ceil(text.length / 4);
    }

}
