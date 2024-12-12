import { openai } from "../../config/openai";
import { IBlogContentInput, IGenerationBatchArticle } from "../../models/interfaces/BlogPostInterfaces";
import { ErrorBuilder } from "../errors/ErrorBuilder";

interface IKeywordGenerationResponse {
    keywords: string[];
}

// interface ISectionEditInput {
//     selectedSection: string;
//     AIPrompt: string;
//     surroundingContext: {
//         previousSection?: string;
//         nextSection?: string;
//     };
//     mainKeyword: string | string[];
//     title: string;
// }

interface ISectionEditInput {
    selectedText: string;
    AIPrompt: string;
    surroundingContext: {
        nextText: string;
    };
    mainKeyword: string | string[];
    title: string;
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

    async generateBlogTitle(keyword: string| string[], model: string): Promise<string> {
        // Format keywords for prompt
        const keywords = Array.isArray(keyword) 
            ? keyword.join(', ')
            : keyword;
        const prompt = `Generate a compelling, SEO-optimized blog title for the keyword "${keywords}". 
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

    // async generateBlogContent(article: {mainKeyword: string, title: string}, model: string): Promise<string> {
    //     const systemPrompt = `You are a professional blog writer. 
    //     Format your response in Markdown with the following structure:
    //     - Use ## for main headings
    //     - Use ### for subheadings
    //     - Include bullet points where appropriate
    //     - Format important text in **bold**
    //     - Use *italic* for emphasis
    //     - Include a table if relevant
    //     - End with an FAQ section if relevant`;

    //     const response = await openai.chat.completions.create({
    //         model,
    //         messages: [
    //             { role: "system", content: systemPrompt },
    //             { role: "user", content: `Write a blog post about ${article.mainKeyword}. Title: ${article.title}` }
    //         ],
    //         temperature: 0.7, 
    //         max_tokens: 1200
    //     });

    //     return response.choices[0].message?.content || '';
    // }

    async generateBlogContent(article: IBlogContentInput, model: string): Promise<string> {
        // Format keywords for prompt
        const keywords = Array.isArray(article.mainKeyword) 
            ? article.mainKeyword.join(', ')
            : article.mainKeyword;

        const defaultSystemPrompt = `You are a professional blog writer. 
        Format your response in Markdown with the following structure:
        - Use ## for main headings
        - Use ### for subheadings
        - Include bullet points where appropriate
        - Format important text in **bold**
        - Use *italic* for emphasis
        - Include a table if relevant
        - End with an FAQ section if relevant`;

        const userPrompt = `Write a comprehensive blog post about ${keywords}. 
        Title: ${article.title}
        ${article.AIPrompt ? `\nAdditional Instructions: ${article.AIPrompt}` : ''}
        
        Ensure to naturally incorporate all these keywords in the content: ${keywords}`;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: defaultSystemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1200
        });

        return response.choices[0].message?.content || '';
    }

    // async generateSectionEdit(input: ISectionEditInput, model: string): Promise<string> {
    //     const keywords = Array.isArray(input.mainKeyword) 
    //         ? input.mainKeyword.join(', ')
    //         : input.mainKeyword;

    //     const systemPrompt = `You are a professional blog content editor.
    //     Your task is to rewrite a section of content while maintaining:
    //     1. Consistency with surrounding content
    //     2. The overall tone and style
    //     3. Natural inclusion of keywords
    //     4. Markdown formatting
        
    //     The content should seamlessly fit between the previous and next sections.`;

    //     const userPrompt = `Title: ${input.title}
    //     Keywords to include: ${keywords}
        
    //     CONTEXT:
    //     ${input.surroundingContext.previousSection ? 
    //       `Previous section:\n${input.surroundingContext.previousSection}\n` : 
    //       'This is the starting section.\n'}
        
    //     SECTION TO EDIT:
    //     ${input.selectedSection}
        
    //     ${input.surroundingContext.nextSection ? 
    //       `Next section:\n${input.surroundingContext.nextSection}` : 
    //       'This is the ending section.'}
        
    //     User Instructions: ${input.AIPrompt}
        
    //     Please rewrite the SECTION TO EDIT while maintaining flow with surrounding content.`;

    //     const response = await openai.chat.completions.create({
    //         model,
    //         messages: [
    //             { role: "system", content: systemPrompt },
    //             { role: "user", content: userPrompt }
    //         ],
    //         temperature: 0.7,
    //         max_tokens: 1000
    //     });

    //     return response.choices[0].message?.content || '';
    // }
    async generateSectionEdit(input: ISectionEditInput, model: string): Promise<string> {
        const keywords = Array.isArray(input.mainKeyword) 
            ? input.mainKeyword.join(', ')
            : input.mainKeyword;

        const systemPrompt = `You are a professional blog content editor.
        If the section you're editing includes or should include any of these elements, maintain proper Markdown formatting:
        - Use ## for main headings (if editing a main section)
        - Use ### for subheadings (if editing a subsection)
        - Include bullet points where relevant
        - Format important terms or emphasis in **bold**
        - Use *italic* for subtle emphasis
        - Include a table if data comparison is relevant
        - If editing a concluding section, consider adding an FAQ

        IMPORTANT: Only use these formatting elements if they fit naturally with the section being edited.
        Maintain the same heading level and formatting style as the original text where applicable.`;


        const userPrompt = `You are editing a section of a blog post titled "${input.title}".
        
        EDIT THIS TEXT:
        ${input.selectedText}
        
        The text that follows (for context only, DO NOT include in your response):
        ${input.surroundingContext.nextText}
        
        User's instructions: ${input.AIPrompt}
        
        IMPORTANT:
        1. ONLY rewrite the text between "EDIT THIS TEXT". Do not include any of the following context
        2. Ensure your response flows naturally into the following context
        3. Include these keywords where natural: ${keywords}
        4. Maintain any existing markdown formatting style
        
        Return ONLY the edited text, without any additional content.`;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });

        return response.choices[0].message?.content || '';
    }
}

export const openAIService = new OpenAIService();
