import { openai } from "../../config/openai";
import { ArticleType, POV, ToneOfVoice } from "../../models/BlogPostCoreSettings";
import { IBlogContentInput, IGenerationBatchArticle, SEOAnalysis } from "../../models/interfaces/BlogPostInterfaces";
import { AppError } from "../errors/AppError";
import { ErrorBuilder } from "../errors/ErrorBuilder";
import { ErrorType } from "../errors/errorTypes";

interface IKeywordGenerationResponse {
    keywords: string[];
}

interface RegenerationConfig {
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
        The keywords should:
        Be highly relevant to the main keyword and maintain search intent.
        Include a mix of short-tail and long-tail keywords.
        Be suitable for blog content targeting a general audience.
        Avoid duplicates, overly generic terms, or irrelevant phrases.
        Be returned as a comma-separated list, without numbers, bullet points, or additional explanations`;

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

    async generateBlogContent(article: IBlogContentInput, model: string): Promise<string> {
        // Format keywords for prompt
        const mainKeyword = Array.isArray(article.mainKeyword) 
            ? article.mainKeyword.join(', ')
            : article.mainKeyword;

        let keywords = ''
        if(article.keywords){ 
            console.log('article.keywords', article.keywords)
            keywords = Array.isArray(article.keywords) 
                ? article.keywords.join(', ')
                : article.keywords;
        }

        const defaultSystemPrompt = `You are a professional blog writer. 
        Format your response in Markdown with the following structure:
        - Use ## for main headings
        - Use ### for subheadings
        - Include bullet points where appropriate
        - Format important text in **bold**
        - Use *italic* for emphasis
        - Include a table if relevant
        - End with an FAQ section if relevant
        - Add image placeholders like [IMAGE: description] where relevant
        `;

        let userPrompt = `Write a comprehensive blog post about ${mainKeyword}. 
        Title: ${article.title}
        ${article.AIPrompt ? `\nAdditional Instructions: ${article.AIPrompt}` : ''}`
        
        if (keywords) {
            userPrompt += `\n\n**Important Instructions:**
            - Naturally incorporate **all** the following keywords into the blog post: ${keywords}.
            - Ensure each keyword is used in a relevant and meaningful way.
            - Include sections or subsections for keywords that require detailed explanations.
            - Use a mix of short-tail and long-tail keywords throughout the content.
            - Avoid keyword stuffing; prioritize readability and natural flow.
            - Add image placeholders like [IMAGE: description] where relevant`;
        } else {
            userPrompt += `\n\n**Important Instructions:**
            - Focus exclusively on the main keyword: ${mainKeyword}.
            - Provide in-depth information, examples, and practical tips related to the main keyword.
            - Ensure the content is engaging and well-structured.
            - Add image placeholders like [IMAGE: description] where relevant`;
        }

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: defaultSystemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            // set token limit based on the keywords provided
            max_tokens: keywords ? 2500 : 1500
        });

        console.log('response from generate blog content', response.choices[0].message?.content)
        return response.choices[0].message?.content || '';
    }

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

    async regenerateBlogContent( config: RegenerationConfig): Promise<string> {
        try{ 
            // generate the main content 
            const content = await this.generateArticleContent(config)
            return content
        }catch(error){ 
            throw ErrorBuilder.internal("Failed to regenerate blog content")
        } 
    }

    private async generateArticleContent(config: RegenerationConfig): Promise<string> {
        const systemPrompt = this.buildSystemPrompt(config);
        const userPrompt = this.buildUserPrompt(config);

        console.log('done with the prompts')
        try{
            const completion = await openai.chat.completions.create({
                model: config.aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: config.humanizeText ? 0.7 : 0.3,
                max_tokens: config.tokenConfig.totalTokens,
                // apiKey: config.customAPIKey
            });
            console.log('completion',completion.choices[0].message?.content)
            return completion.choices[0].message?.content || '';
        }catch(error){
            console.log(error)
        }
        return ''

     
    }

    private buildSystemPrompt(config: RegenerationConfig): string {
        console.log('made it to the system prompt')
        return `You are an expert content writer with deep knowledge in SEO and marketing.
        Write in ${config.language} using a ${config.toneOfVoice.toLowerCase()} tone.
        Use ${config.pointOfView.toLowerCase()} person point of view.
        ${config.targetCountry ? `\nTarget audience is from: ${config.targetCountry}` : ''}

        Format your response in Markdown with the following structure:
        - Use ## for main headings
        - Use ### for subheadings
        - Include bullet points where appropriate
        - Format important text in **bold**
        - Use *italic* for emphasis
        - Include a table if relevant
        - End with an FAQ section if relevant
        ${config.humanizeText ? 'Write in a conversational, human-like style.' : 'Maintain professional clarity.'}`;
    }

    private buildUserPrompt(config: RegenerationConfig): string {
        console.log('made it to the user prompt')
        const keywords = Array.isArray(config.mainKeyword) 
            ? config.mainKeyword.join(', ') 
            : config.mainKeyword;

        return `Write a comprehensive article titled "${config.title}".
        Main keywords to target: ${keywords}
        Required word count: ${config.tokenConfig.minTokens}-${config.tokenConfig.maxTokens} words.

        Follow these structural requirements:
        1. Create an engaging introduction

        Ensure all content is factual, well-researched, and provides value to readers.`;
    }


    async analyzeSEO(metricCounts: Map<string, number>, model: string = 'gpt-4') {
        // Convert the metricCounts map to a readable string
        const metricsObject = Object.fromEntries(metricCounts)
        const metrics = Object.entries(metricsObject)
            .map(([metric, count]) => `${metric}: ${count} pages`)
            .join('\n');

    
            console.log('the metric we are working with ', metrics)
        // System prompt: Define the role and formatting rules
        const systemPrompt = `You are an SEO expert analyzing a website's critical SEO issues. 
        Provide detailed recommendations to fix these issues. Format the response as a JSON array, where each item is an object with the following structure:
        {
            "issue": "The SEO issue (e.g., 'Missing Alt Text')",
            "description": "A brief description of the issue and its impact on SEO",
            "recommendation": "A specific action to fix the issue"
        }
    
        IMPORTANT:
        1. Be concise and actionable in your recommendations.
        2. Focus on practical steps that can be implemented quickly.
        3. Use professional language suitable for a non-technical audience.`;
    
        // User prompt: Provide the metrics and request recommendations
        const userPrompt = `The following SEO issues were found across the site:
        ${metrics}
    
        Provide detailed recommendations to fix these issues. Format the response as a JSON array.`;
    
        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
    
        // Parse the response into JSON
        try {
            console.log('From open AI recommendations', response.choices[0].message?.content)
            const recommendations = JSON.parse(response.choices[0].message?.content || '[]');
            return recommendations;
        } catch (error) {
            console.error('Failed to parse OpenAI response:', error);
            return [];
        }
    }
}

export const openAIService = new OpenAIService();
