import puppeteer from 'puppeteer';
import OpenAI from 'openai';
import { openai } from '../../config/openai';
import { OpenAIService } from './openAIService';
import { AppError } from '../errors/AppError';
import { ErrorType } from '../errors/errorTypes';
import { SEOAnalysis } from '../../models/interfaces/BlogPostInterfaces';
import genericPool from 'generic-pool';
// Step 1: Extract SEO Data with Puppeteer
// async function extractSEOData(url: string) {
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     try{ 
//       await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000});
//     }catch(error:any){ 
//       throw new AppError('something went wrong while scrapping the url', ErrorType.UNKNOWN, error.status)
//     }
    

  
//     const seoData = await page.evaluate(() => {
//        // Meta Data Extraction
//        const metaTitle = document.querySelector('title')?.textContent || '';
//        const metaDescription = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';
  
//       // Internal Links Count
//       const internalLinks = Array.from(document.querySelectorAll('a'))
//         .filter(link => link.href.includes(window.location.hostname));
  
//       // Image Alt Text Check
//       const imagesMissingAlt = Array.from(document.querySelectorAll('img'))
//         .filter(img => !img.alt || img.alt.trim() === '');
  
//       return {
//         metaTitle,
//         metaDescription,
//         internalLinksCount: internalLinks.length,
//         imagesMissingAlt: imagesMissingAlt.length
//       };
//     });
  
//     await browser.close();
//     return seoData;
// }

 // Create a browser pool
 const browserPool = genericPool.createPool({
  create: async () => {
      const browser = await puppeteer.launch({ headless: true });
      return browser;
  },
  destroy: async (browser) => {
      await browser.close();
  }
}, {
  max: 4, // Maximum number of browsers in the pool
  min: 1, // Minimum number of browsers to keep ready
  idleTimeoutMillis: 30000 // Close idle browsers after 30 seconds
});

async function extractSEOData(url: string, retries=2) {
  const browser = await browserPool.acquire();
  const page = await browser.newPage();
  
  try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const [metaTitle, metaDescription, internalLinks, imagesMissingAlt] = await Promise.all([
          page.$eval('title', el => el?.textContent || ''),
          page.$eval('meta[name="description"]', el => (el as HTMLMetaElement)?.content || ''),
          page.$$eval('a', links => links.filter(link => link.href.includes(window.location.hostname)).length),
          page.$$eval('img', imgs => imgs.filter(img => !img.alt || img.alt.trim() === '').length)
      ]);

      console.log(metaTitle, metaDescription, internalLinks, imagesMissingAlt)
      return {
          url,
          metaTitle,
          metaDescription,
          internalLinksCount: internalLinks,
          imagesMissingAlt
      };
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying ${url} (${retries} attempts left)...`);
      return extractSEOData(url, retries - 1);
  }
  console.error(`Failed to scrape ${url}:`, error);
  return null; // Return null for failed URLs
  } finally {
    await page.close();
    browserPool.release(browser);
  }
}

async function getBasicSEOInsights(urls: string[]) {
  // Process URLs in batches
  const insights = await processBatch(urls, 2); // Process 2 URLs at a time
    
  // Filter out failed insights
  return insights.filter(insight => insight !== null);
}

async function processBatch(urls: string[], batchSize = 2) {
  const results = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(url => extractSEOData(url).catch(error => {
                console.error(`Failed to scrape ${url}:`, error);
                return null; // Return null for failed URLs
            }))
        );
        results.push(...batchResults);
    }
    
    return results;
}

export async function mapSEOAnalysis(urls: string[]) {
  // Step 1: Get basic insights
  const basicInsights = await getBasicSEOInsights(urls);
  
  // Filter out failed insights
  const validInsights = basicInsights.filter(insight => insight !== null);
  
  // Log removed URLs
  const failedUrls = urls.filter(url => !validInsights.some(insight => insight.url === url));
  if (failedUrls.length > 0) {
      console.warn('Failed to scrape and removed:', failedUrls);
  }

  // If no valid insights, return empty array
  if (validInsights.length === 0) {
      return [];
  }

  // Step 2: Add AI analysis
  const openAIService = new OpenAIService();
  const results = await Promise.all(validInsights.map(async (insight) => {
      console.log('Analyzing:', insight.url);
      const aiAnalysis = await openAIService.analyzeSEO(insight);
      return {
          ...insight,
          aiAnalysis
      };
  }));
  
  return results;
}