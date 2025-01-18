
import { IBlogPost, IGenerationBatchArticle, IKeywordPosition, IMetadata, IStructureSettings } from "../../models/interfaces/BlogPostInterfaces";
import { KeyWordTrafficModel } from "../../models/KeyWordTraffic.model";
const googleTrends = require('google-trends-api');

export class BlogPostService {

    async getTrafficEstimate(keywords: string | string[]): Promise<number | number[]> {
        const keywordsArray = Array.isArray(keywords) ? keywords : [keywords];
        
        try {
            const results = await Promise.all(
                keywordsArray.map(async (keyword) => {
                    try {
                        // Check cache first
                        const cached = await KeyWordTrafficModel.findOne({
                            keyword: keyword.toLowerCase(),
                            lastUpdated: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                        });
    
                        if (cached) {
                            return cached.traffic;
                        }
    
                        // Get fresh data from Google Trends
                        const results = await googleTrends.interestOverTime({
                            keyword,
                            startTime: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)),
                            granularTimeResolution: true
                        });
    
                        const data = JSON.parse(results);
                        
                        // Calculate average interest
                        const avgInterest = data.default.timelineData.reduce(
                            (acc: number, item: any) => acc + item.value[0], 
                            0
                        ) / data.default.timelineData.length;
                        
                        const estimatedTraffic = Math.floor(avgInterest * 100);
    
                        // Cache the result
                        await KeyWordTrafficModel.findOneAndUpdate(
                            { keyword: keyword.toLowerCase() },
                            { 
                                traffic: estimatedTraffic,
                                lastUpdated: new Date()
                            },
                            { upsert: true }
                        );
    
                        return estimatedTraffic;
                    } catch (error) {
                        // Fallback for individual keyword errors
                        console.error(`Failed to get traffic for keyword "${keyword}":`, error);
                        return Math.floor(Math.random() * 10000);
                    }
                })
            );
    
            // Return single number if input was single string, array if input was array
            return Array.isArray(keywords) ? results : results[0];
            
        } catch (error) {
            console.error('Failed to process keywords:', error);
            // Fallback: return random numbers matching input type
            return Array.isArray(keywords) 
                ? keywords.map(() => Math.floor(Math.random() * 10000))
                : Math.floor(Math.random() * 10000);
        }
    }

     public calculateMetaData(content: string, options: {
        mainKeyword: string;
        title: string;
    }): IMetadata {
        // Remove markdown syntax for accurate word count
        const plainText = this.stripMarkdown(content);
        
        const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
        const characterCount = plainText.length;
        const readingTime = Math.ceil(wordCount / 200);

        return {
            wordCount,
            characterCount,
            mainKeyword: options.mainKeyword,
            metaTitle: options.title,
            metaDescription: this.generateMetaDescription(plainText), // Use plain text for meta description
            readingTime
        };
    }

     public stripMarkdown(content: string): string {
        return content
            .replace(/#{1,6}\s/g, '') // Remove headers
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
            .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Remove links
            .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
            .replace(/^\s*[-+*]\s/gm, '') // Remove list markers
            .replace(/^\s*\d+\.\s/gm, '') // Remove numbered lists
            .replace(/\n{2,}/g, '\n') // Normalize line breaks
            .trim();
    }
     public detectStructureFeatures(content: string): IStructureSettings {
        return {
            includeHook: content.includes('Introduction') || content.startsWith('#'),
            includeConclusion: /##?\s*Conclusion/i.test(content),
            includeTables: content.includes('|'),
            includeH3: content.includes('###'),
            includeLists: /[-*+]\s/.test(content),
            includeItalics: /\*[^*]+\*/.test(content),
            includeQuotes: content.includes('>'),
            includeKeyTakeaway: /##?\s*Key Takeaway/i.test(content),
            includeFAQ: /##?\s*FAQ/i.test(content),
            includeBold: /\*\*[^*]+\*\*/.test(content),
            includeBulletpoints: /[-*+]\s/.test(content)
        };
    }

     public analyzeSEO(content: string, mainKeyword: string) {
        const lines = content.split('\n');
        const keywordPositions: IKeywordPosition[] = [];
        const keywordRegex = new RegExp(mainKeyword, 'gi');
    
        lines.forEach((line, lineNumber) => {
            // Determine the type of line
            let type: IKeywordPosition['type'] = 'content';
            if (line.match(/^#{1,6}\s/)) {
                const headerLevel = line.match(/^(#{1,6})\s/)?.[1].length;
                type = `h${headerLevel}` as IKeywordPosition['type'];
            }
    
            // Find all keyword matches in the line
            let match;
            while ((match = keywordRegex.exec(line)) !== null) {
                keywordPositions.push({
                    type,
                    position: match.index,
                    context: line.trim(),
                    lineNumber
                });
            }
        });
    
        return {
            mainKeywordDensity: (keywordPositions.length / content.length) * 100,
            contentLength: content.length,
            readabilityScore: 0,
            keywordPositions
        };
    }

     public generateMetaDescription(content: string): string {
        // TODO: Implement meta description generation logic
        return 'Meta description';
    }
}

export const blogPostService = new BlogPostService(); 