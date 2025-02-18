import { IBlogContentInput } from "../../../models/interfaces/BlogPostInterfaces";
import { ISectionEditInput, RegenerationConfig } from "../../../models/interfaces/AIServiceInterfaces";

export class AIPromptBuilder {
    static buildSystemPrompt(config: RegenerationConfig): string {
        return `You are an expert content writer with deep knowledge in SEO and marketing.
        Write in ${config.language} using a ${config.toneOfVoice.toLowerCase()} tone.
        Use ${config.pointOfView.toLowerCase()} person point of view.
        ${config.targetCountry ? `\nTarget audience is from: ${config.targetCountry}` : ''}
        ${config.internalLinks ? `\nInternal Linking Rules:\n- Include these links naturally: ${config.internalLinks.map(link => `[${link.title}](${link.url})`).join(', ')}\n- Use exact anchor text\n- Distribute throughout content` : ''}

        **Structure Rules:**
        - ${config.structure?.includeConclusion ? 'Include a conclusion section.' : 'Do not include a conclusion section.'}
        - ${config.structure?.includeTables ? 'Include tables where relevant.' : 'Do not include tables.'}
        - ${config.structure?.includeH3 ? 'Use H3 headings for subsections.' : 'Do not use H3 headings.'}
        - ${config.structure?.includeLists ? 'Include lists where relevant.' : 'Do not include lists.'}
        - ${config.structure?.includeItalics ? 'Use italics for emphasis.' : 'Do not use italics.'}
        - ${config.structure?.includeQuotes ? 'Include quotes where relevant.' : 'Do not include quotes.'}
        - ${config.structure?.includeKeyTakeaway ? 'Include key takeaways.' : 'Do not include key takeaways.'}
        - ${config.structure?.includeFAQ ? 'Include an FAQ section.' : 'Do not include an FAQ section.'}
        - ${config.structure?.includeBold ? 'Use bold text for emphasis.' : 'Do not use bold text.'}
        - ${config.structure?.includeBulletpoints ? 'Use bullet points where relevant.' : 'Do not use bullet points.'}
        - Use a ${config.structure?.hookType} hook for the opening sentence.


        Format your response in Markdown with the following structure:
        - Use ## for main headings
        - Use ### for subheadings
        - Include bullet points where appropriate
        - Format important text in **bold**
        - Use *italic* for emphasis

        - Include internal links where relevant
        - Include a table if relevant
        - End with an FAQ section if relevant
        ${config.humanizeText ? 'Write in a conversational, human-like style.' : 'Maintain professional clarity.'}`;
    }

    static buildUserPrompt(config: RegenerationConfig): {userPrompt: string, keywordPresent: boolean} {
        const mainKeyword = Array.isArray(config.mainKeyword)
            ? config.mainKeyword.join(', ')
            : config.mainKeyword;

        let keywords = ''
        if(config.keywords){
            keywords = Array.isArray(config.keywords)
                ? config.keywords.join(', ')
                : config.keywords;
        }

        let userPrompt = `Write a comprehensive blog post about ${mainKeyword}.
        Title: ${config.title}`

        if(keywords){
            userPrompt += `\n\n**Important Instructions:**
            - Naturally incorporate **all** the following keywords into the blog post: ${keywords}.
            - Ensure each keyword is used in a relevant and meaningful way.
            - Include sections or subsections for keywords that require detailed explanations.
            - Use a mix of short-tail and long-tail keywords throughout the content.
            - Avoid keyword stuffing; prioritize readability and natural flow.
            - Ensure all content is factual, well-researched, and provides value to readers.
            - Required word count: ${config.tokenConfig.minTokens}-${config.tokenConfig.maxTokens} words.`
        }else{ 
            userPrompt += `\n\n**Important Instructions:**
            - Focus exclusively on the main keyword: ${mainKeyword}.
            - Provide in-depth information, examples, and practical tips related to the main keyword.
            - Ensure the content is engaging and well-structured.
            - Ensure all content is factual, well-researched, and provides value to readers.
            - Required word count: ${config.tokenConfig.minTokens}-${config.tokenConfig.maxTokens} words.`
        }

        // Add detailsToInclude if provided
        if (config.detailsToInclude) {
            userPrompt += `\n\n**Additional Instructions:**
            - Include the following details in every section of the blog post: "${config.detailsToInclude}".
            - Ensure the details are integrated naturally and contextually.`;
        }

        // Add word count requirement
        userPrompt += `\n- Required word count: ${config.tokenConfig.minTokens}-${config.tokenConfig.maxTokens} words.`;

        return {userPrompt, keywordPresent: keywords.length > 0 ? true : false}
    }

    //----------------------------------------------------------------------------------------------------------
    // **this is for generate blog content
    static buildBlogContentPrompts(article: IBlogContentInput): { systemPrompt: string; userPrompt: string, keywordPresent: boolean } {
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

        const systemPrompt = `You are a professional blog writer. 
        Format your response in Markdown with the following structure:
        - Use ## for main headings
        - Use ### for subheadings
        - Include bullet points where appropriate
        - Format important text in **bold**
        - Use *italic* for emphasis
        - Include a table if relevant
        - End with an FAQ section if relevant
        - After the title and introduction, include image placeholders like [IMAGE: description].  
        - **For each image placeholder, generate a detailed and descriptive prompt suitable for a text-to-image AI model like Leonardo AI.  The prompt should clearly describe the desired image content, style, and composition.**
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
            - Avoid keyword stuffing; prioritize readability and natural flow.`;
        } else {
            userPrompt += `\n\n**Important Instructions:**
            - Focus exclusively on the main keyword: ${mainKeyword}.
            - Provide in-depth information, examples, and practical tips related to the main keyword.
            - Ensure the content is engaging and well-structured.`;
        }

        return { systemPrompt, userPrompt, keywordPresent: keywords.length > 0 ? true : false };
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

    static buildGenerateHookPrompt(hookType: string, mainKeyword: string): {systemPrompt: string, userPrompt: string}{ 
        const systemPrompt = `You are an expert content writer with deep knowledge in SEO and marketing.
        Generate a compelling hook for a blog post about "${mainKeyword}".
        The hook type is "${hookType}".
        Ensure the hook is engaging, relevant, and captures the reader's attention.`;

        
        const userPrompt = `Generate a hook for a blog post about "${mainKeyword}".
        The hook type is "${hookType}".
        Ensure the hook is engaging, relevant, and captures the reader's attention.`;

        return {systemPrompt, userPrompt}
    }
} 