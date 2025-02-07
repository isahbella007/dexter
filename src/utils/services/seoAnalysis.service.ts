import puppeteer from 'puppeteer';
import { OpenAIService } from './openAIService';
import genericPool from 'generic-pool';


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

const CRITICAL_UNHEALTHY_METRICS = [
  'imagesMissingAlt', //crucial for accessiblity and seo
  'brokenInternalLinks',//broken links harms user experience and seo
  'slowPageLoad', // leads to bounce rate
  'missingCanonicalTag',
  'largeDOMSize',
  'lowTextHtmlRatio',
  'lowH1Tags'
];


const LESS_CRITICAL_METRICS = [
  'missingMetaTitle',
  'missingMetaDescription',
  'lowInternalLinks'
];

async function extractSEOData(url: string, retries = 2, foundCriticalMetrics = new Set<string>(), canonicalMap = new Map<string, string[]>()) {
  const browser = await browserPool.acquire();
  const page = await browser.newPage();
  
  try {
      const startTime = Date.now();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const loadTime = (Date.now() - startTime) / 1000; // Load time in seconds

      // Scrape SEO data with error handling for missing elements
      const [metaTitle, metaDescription, internalLinks, imagesMissingAlt, brokenLinks, canonicalTag, domSize, textHtmlRatio, h1Tags] = await Promise.all([
        page.$eval('title', el => el?.textContent || '').catch(() => ''),
        page.$eval('meta[name="description"]', el => (el as HTMLMetaElement)?.content || '').catch(() => ''),
        page.$$eval('a', links => links.filter(link => link.href.includes(window.location.hostname)).length).catch(() => 0),
        page.$$eval('img', imgs => imgs.filter(img => !img.alt || img.alt.trim() === '').length).catch(() => 0),
        page.$$eval('a', links => links.filter(link => !link.href || link.href === '#').length).catch(() => 0), // Broken links
        page.$eval('link[rel="canonical"]', el => el?.href || '').catch(() => ''), // Canonical tag
        page.evaluate(() => document.getElementsByTagName('*').length).catch(() => 0), // DOM size
        page.evaluate(() => {
            const textContent = document.body.textContent || '';
            const htmlContent = document.body.innerHTML || '';
            return (textContent.length / htmlContent.length) * 100;
        }).catch(() => 0), // Text-HTML ratio
        page.$$eval('h1', h1s => h1s.length).catch(() => 0) // H1 tags
      ]);

      // Check for critical unhealthy metrics
      if (imagesMissingAlt > 0) foundCriticalMetrics.add('imagesMissingAlt');
      if (brokenLinks > 0) foundCriticalMetrics.add('brokenInternalLinks');
      if (!canonicalTag) foundCriticalMetrics.add('missingCanonicalTag');
      if (loadTime > 3) foundCriticalMetrics.add('slowPageLoad');
      if (domSize > 1500) foundCriticalMetrics.add('largeDOMSize');
      if (textHtmlRatio < 20) foundCriticalMetrics.add('lowTextHtmlRatio');
      if (h1Tags == 0) foundCriticalMetrics.add('lowH1Tags');

      // Track canonical tags for duplication
      if (canonicalTag) {
          if (canonicalMap.has(canonicalTag)) {
              canonicalMap.get(canonicalTag)?.push(url);
          } else {
              canonicalMap.set(canonicalTag, [url]);
          }
      }

      return {
        url,
        metaTitle,
        metaDescription,
        internalLinksCount: internalLinks,
        imagesMissingAlt,
        brokenLinks,
        canonicalTag,
        loadTime,
        domSize,
        textHtmlRatio,
        h1Tags,
        foundCriticalMetrics: Array.from(foundCriticalMetrics),
        canonicalMap
    };
  } catch (error) {
      if (retries > 0) {
          console.warn(`Retrying ${url} (${retries} attempts left)...`);
          return extractSEOData(url, retries - 1, foundCriticalMetrics, canonicalMap);
      }
      console.error(`Failed to scrape ${url}:`, error);
      return null; // Return null for failed URLs
  } finally {
      await page.close();
      browserPool.release(browser);
  }
}

async function getBasicSEOInsights(urls: string[]) {
  const insights = [];
  const foundCriticalMetrics = new Set<string>();
  const failedUrls = []; // Track URLs that couldn't be scraped
  const canonicalMap = new Map<string, string[]>(); // Track canonical tags
  const metricRepetitionThreshold = 5; // Stop if a metric appears in 5 pages
  const metricCounts = new Map<string, number>(); // Track how often each metric appears

  // Process URLs in batches of 2
  for (let i = 0; i < urls.length; i += 2) {
      // Stop scraping if all critical unhealthy metrics are found
      if (foundCriticalMetrics.size === CRITICAL_UNHEALTHY_METRICS.length) {
          console.log('All critical unhealthy metrics found. Stopping scraping.');
          break;
      }

      // Get the current batch of URLs
      const batch = urls.slice(i, i + 2);

      // Scrape the batch in parallel
      const batchResults = await Promise.all(
          batch.map(url => extractSEOData(url, 2, foundCriticalMetrics, canonicalMap))
      );

      // Process the results
      for (const result of batchResults) {
          if (result) {
              console.log(`Insights for ${result.url}`, result);
              insights.push(result);
              // Update the global foundCriticalMetrics set with metrics from this URL
              result.foundCriticalMetrics.forEach(metric => {
                  foundCriticalMetrics.add(metric);
                  // Update the metric count
                  metricCounts.set(metric, (metricCounts.get(metric) || 0) + 1);
              });

              // Stop scraping if a specific metric appears in N pages
              for (const [metric, count] of metricCounts.entries()) {
                  if (count >= metricRepetitionThreshold) {
                      console.log(`Metric "${metric}" found in ${count} pages. Stopping scraping.`);
                      break;
                  }
              }
          } else {
              failedUrls.push(batch[batchResults.indexOf(result)]); // Track failed URLs
          }
      }

      // Break the outer loop if a metric threshold is reached
      if ([...metricCounts.values()].some(count => count >= metricRepetitionThreshold)) {
          break;
      }
  }

  // Log failed URLs
  if (failedUrls.length > 0) {
      console.warn('Failed to scrape the following URLs:', failedUrls);
  }

  // Check for duplicate canonical tags
  for (const [canonicalUrl, pages] of canonicalMap.entries()) {
      if (pages.length > 1) {
          console.warn(`Duplicate canonical tag found for ${canonicalUrl}. Pages:`, pages);
          foundCriticalMetrics.add('duplicateCanonicalTag');
      }
  }

  // console log the metricscount map we will pass to OpenAi for insights
  console.log('Metric counts:', metricCounts);
  console.log('to see clearer', Object.fromEntries(metricCounts))
  return {insights, metricCounts};


}


export async function mapSEOAnalysis(urls: string[]) {
  // Step 1: Get basic insights
  console.log('urls passed to the seo analysis service', urls)
  const basicInsights = await getBasicSEOInsights(urls);

  // console.log(basicInsights);
  const openAIService = new OpenAIService();
  const aiAnalysis = await openAIService.analyzeSEO(basicInsights.metricCounts);
  return aiAnalysis
}