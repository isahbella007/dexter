import { openai } from "../../config/openai";
import { ErrorBuilder } from "../errors/ErrorBuilder";

interface IKeywordGenerationResponse {
    keywords: string[];
}

export class OpenAIService {
    private async generateCompletion(prompt: string, model: string) {
        try {
            const completion = await openai.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 500,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            throw ErrorBuilder.internal("Failed to generate AI response");
        }
    }

    async generateRelatedKeywords(mainKeyword: string, count: number, model: string): Promise<string[]> {
        const prompt = `Generate ${count} unique, SEO-optimized related keywords for the main keyword "${mainKeyword}". 
        The keywords should be relevant for blog content and maintain search intent.
        Return only the keywords as a comma-separated list, without numbers or bullet points.`;

        const response = await this.generateCompletion(prompt, model);
        if (!response) {
            throw ErrorBuilder.internal("Failed to generate keywords");
        }

        // Split response into array and clean up
        const keywords = response
            .split(',')
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0)
            .slice(0, count); // Ensure we only return requested number of keywords

        return keywords;
    }

    async generateBlogTitle(keyword: string, model: string): Promise<string> {
        const prompt = `Generate a compelling, SEO-optimized blog title for the keyword "${keyword}". 
        The title should be engaging, clear, and under 100 characters.
        Return only the title, without quotes or additional formatting.`;
    
        const response = await this.generateCompletion(prompt, model);
        if (!response) {
            throw ErrorBuilder.internal("Failed to generate title");
        }
    
        // Clean up the response and ensure it's not too long
        const title = response.trim().replace(/["']/g, '');
        return title.length > 100 ? title.substring(0, 97) + '...' : title;
    }
}

export const openAIService = new OpenAIService();
