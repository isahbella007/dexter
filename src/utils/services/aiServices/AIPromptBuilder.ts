import { IBlogContentInput } from "../../../models/interfaces/BlogPostInterfaces";
import { ISectionEditInput, RegenerationConfig } from "../../../models/interfaces/AIServiceInterfaces";

export class AIPromptBuilder {
    static buildSystemPrompt(config: RegenerationConfig): string {
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

    static buildUserPrompt(config: RegenerationConfig): string {
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

    static buildBlogContentPrompts(article: IBlogContentInput): { systemPrompt: string; userPrompt: string } {
        const keywords = Array.isArray(article.mainKeyword)
            ? article.mainKeyword.join(', ')
            : article.mainKeyword;

        const systemPrompt = `You are a professional blog writer. 
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

        return { systemPrompt, userPrompt };
    }

    static buildSectionEditPrompts(input: ISectionEditInput): { systemPrompt: string; userPrompt: string } {
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
        - If editing a concluding section, consider adding an FAQ`;

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

        return { systemPrompt, userPrompt };
    }

    static buildKeywordGenerationPrompt(mainKeyword: string, count: number): string {
        return `Generate ${count} unique, SEO-optimized related keywords for the main keyword "${mainKeyword}". 
        The keywords should be relevant for blog content and maintain search intent.
        Return only the keywords as a comma-separated list, without numbers or bullet points.`;
    }

    static buildTitleGenerationPrompt(keywords: string | string[]): string {
        const keywordStr = Array.isArray(keywords) ? keywords.join(', ') : keywords;
        return `Generate a compelling, SEO-optimized blog title for the keyword "${keywordStr}". 
        The title should be engaging, clear, and under 100 characters.
        Return only the title, without quotes or additional formatting.`;
    }
} 