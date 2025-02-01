import puppeteer from 'puppeteer';
import OpenAI from 'openai';
import { openai } from '../../config/openai';
import { OpenAIService } from './openAIService';
import { AppError } from '../errors/AppError';
import { ErrorType } from '../errors/errorTypes';

// Step 1: Extract SEO Data with Puppeteer
async function extractSEOData(url: string) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try{ 
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000});
    }catch(error:any){ 
      throw new AppError('something went wrong while scrapping the url', ErrorType.UNKNOWN, error.status)
    }
    

  
    const seoData = await page.evaluate(() => {
       // Meta Data Extraction
       const metaTitle = document.querySelector('title')?.textContent || '';
       const metaDescription = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';
  
      // Internal Links Count
      const internalLinks = Array.from(document.querySelectorAll('a'))
        .filter(link => link.href.includes(window.location.hostname));
  
      // Image Alt Text Check
      const imagesMissingAlt = Array.from(document.querySelectorAll('img'))
        .filter(img => !img.alt || img.alt.trim() === '');
  
      return {
        metaTitle,
        metaDescription,
        internalLinksCount: internalLinks.length,
        imagesMissingAlt: imagesMissingAlt.length
      };
    });
  
    await browser.close();
    return seoData;
}

async function getBasicSEOInsights(urls: string[]) {
  // Process all URLs concurrently
  const insights = await Promise.all(urls.map(async (url) => {
      const insight = await extractSEOData(url);
      return {
          url,
          metaTitle: insight.metaTitle,
          metaDescription: insight.metaDescription,
          internalLinks: insight.internalLinksCount,
          missingAltTags: insight.imagesMissingAlt
      };
    }));

  return insights;
}

export async function mapSEOAnalysis(urls: string[]) {
    // Step 1: Get basic insights
    // const basicInsights = await getBasicSEOInsights(urls);
    const openAIService = new OpenAIService();
    
    const basicInsights = [
      {
        metaTitle: "aloha mf",
        metaDescription: "we are testing open ai hahah",
        internalLinks: 3,
        missingAltTags: 22
      }
    ]
    // Step 2: Add AI analysis
    const results = await Promise.all(basicInsights.map(async (insight) => {
      const aiAnalysis = await openAIService.analyzeSEO(insight);
      return {
          ...insight,
          aiAnalysis
      };
    }));
    
    return results;
}