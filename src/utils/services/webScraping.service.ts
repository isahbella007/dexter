import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import { IScrapedInsight } from '../../models/interfaces/AIServiceInterfaces';
import axios from 'axios';

const google = require('googlethis');
export class WebScrapingService {

    private async fetchCurrentData(keywords: string[]): Promise<any[]> {
        const options = {
            page: 0, // Page number (0 = first page)
            safe: false, // Safe search (true/false)
            parse_ads: false, // Parse ads (true/false)
            additional_params: { hl: 'en' } // Additional query parameters
        };

        if (!keywords || keywords.length === 0) {
            throw new Error('Keywords are required');
        }

        const results: any[] = [];

        // Search Google for each keyword
        for (const keyword of keywords) {
            console.log('The keyword:', keyword);

            try {
                // Add a delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay

                const response = await google.search('belts', options);

                console.log('the response', response)
                // Filter out YouTube and shopping links
                const filteredResults = response.results.filter((result: { url: string | string[]; }) => 
                    !result.url.includes("youtube.com") &&
                    !result.url.includes("shopping") &&
                    !result.url.includes("google.com")
                );

                console.log('the filtered results', filteredResults)


                // Scrape content from filtered URLs
                for (const result of filteredResults) {
                    try {
                        const pageResponse = await axios.get(result.url);
                        const $ = cheerio.load(pageResponse.data);

                        // Extract key sentences (e.g., from <p> tags)
                        $('p').each((_, element) => {
                            const text = $(element).text().trim();
                            if (text.length > 50 && text.length < 200) { // Filter for meaningful sentences
                                results.push({ title: result.title, url: result.url, insight: text });
                            }
                        });
                    } catch (error) {
                        console.error(`Error scraping ${result.url}:`, error);
                    }
                }
            } catch (error) {
                console.error(`Error searching for "${keyword}":`, error);
                // Retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 5000)); // 10-second delay before retry
                continue; // Skip to the next keyword
            }
        }

        return results;
    }

    public async enhanceBlogPost(keywords: string[]) {
        try {
            const options = {
                page: 0, 
                safe: false, // Safe Search
                parse_ads: false, // If set to true sponsored results will be parsed
                additional_params: { 
                  // add additional parameters here, see https://moz.com/blog/the-ultimate-guide-to-the-google-search-parameters and https://www.seoquake.com/blog/google-search-param/
                  hl: 'en' 
                }
            }
            const checking = await google.search('TWDG', options);
            // Step 1: Fetch current data
            // const fetchedData = await this.fetchCurrentData(keywords);


            // Step 2: Extract key insights
            // const keyInsights = fetchedData.map(item => item.insight);

            // Step 3: Return the insights
            // return keyInsights;
            console.log('the checking', checking)
        } catch (error) {
            console.error('Error enhancing blog post:', error);
            throw new Error('Failed to enhance blog post');
        }

    }
} 
export const webScrapingService = new WebScrapingService()