import { OAuth2Client } from "google-auth-library";
import { analyticsadmin_v1alpha, analyticsdata_v1beta, google, searchconsole_v1 } from "googleapis";
import { config } from "../../config";
import { AppError } from "../errors/AppError";
import { ErrorType } from "../errors/errorTypes";
import { IBlogPost } from "../../models/interfaces/BlogPostInterfaces";
import { SYSTEM_PLATFORM } from "../../models/BlogPost";
import { ErrorBuilder } from "../errors/ErrorBuilder";

// for now, the aim of this class is to handle everything related to google analytics
export class GoogleAnalyticsService {
    private googleClientId: string;
    private googleClientSecret: string;
    private googleRedirectUri: string;
    
    private oAuth2Client: OAuth2Client;
    private analyticsData: analyticsdata_v1beta.Analyticsdata;
    private analyticsAdmin: analyticsadmin_v1alpha.Analyticsadmin;
    private searchConsole: searchconsole_v1.Searchconsole;

    constructor(accessToken: string, refreshToken: string, expiryDate: number) {
        this.googleClientId = config.google.clientId; 
        this.googleClientSecret = config.google.clientSecret;
        this.googleRedirectUri = config.google.developmentRedirectUri;
        this.oAuth2Client = new OAuth2Client(this.googleClientId, this.googleClientSecret, this.googleRedirectUri);

        // Set the saved tokens
        this.oAuth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: expiryDate,
        });

        // Add token refresh handler
        this.oAuth2Client.on('tokens', (tokens) => {
            if (tokens.refresh_token) {
                // Store the new refresh token if it's provided
                this.oAuth2Client.setCredentials({
                    ...this.oAuth2Client.credentials,
                    refresh_token: tokens.refresh_token,
                });
            }
        });


        this.analyticsAdmin = google.analyticsadmin('v1alpha');
        this.analyticsData = google.analyticsdata('v1beta');
        this.searchConsole = google.searchconsole({
            version: 'v1',
            auth: this.oAuth2Client
        });
        
    }

     // Add method to refresh token if expired
     private async refreshTokenIfNeeded() {
        const credentials = this.oAuth2Client.credentials;
        if (!credentials.expiry_date || Date.now() > credentials.expiry_date) {
            try {
                const { credentials: newCredentials } = await this.oAuth2Client.refreshAccessToken();
                this.oAuth2Client.setCredentials(newCredentials);
                return newCredentials;
            } catch (error: any) {
                throw new AppError('Failed to refresh access token', ErrorType.UNKNOWN, error.status, error.status)
            }
        }
        return credentials;
    }

    // get all the user's google analytics accounts
    async fetchUserAccounts() {
        const response = await this.analyticsAdmin.accounts.list({
            auth: this.oAuth2Client,
        });
        return response.data.accounts || [];
    }

    // get all the user's google analytics data. I think this will have to make use of the users google refres/access token
    async fetchAllAccountProperties(accountId: string) {
        try {
            console.log(`parent:accounts/${accountId}`)
            const response = await this.analyticsAdmin.properties.list({
                auth: this.oAuth2Client,
                filter: `parent:accounts/${accountId}`,
            });
            return response.data.properties || [];
        } catch (error: any) {
            console.error('Error fetching GA4 properties:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
        }
    }

    async fetchAllGA4Properties(propertyId: string) {
        try {
            // Remove 'properties/' prefix if present
            const formattedPropertyId = propertyId.startsWith('properties/') 
                ? propertyId 
                : `properties/${propertyId}`;

            const response = await this.analyticsAdmin.properties.dataStreams.list({
                auth: this.oAuth2Client,
                parent: formattedPropertyId
            });

            // Return the connected GA4 property or null if none exists
            const measurementIds = (response.data.dataStreams || [])
            .map((stream) => stream.webStreamData?.measurementId)
            .filter((id): id is string => !!id); // Type guard to ensure string[]

            return measurementIds?.length > 0 ? measurementIds : 'No tracking id for the property';
        } catch (error: any) {
            console.error('Error fetching GA4 property:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
        }
    }

    /**
     * Verify if a GA4 property is linked to a site by checking for data.
     * @param ga4PropertyId - The GA4 property ID (e.g., 'properties/123456789').
     * @param dateRange - The date range to check for data (default: last 30 days).
     */
    async verifyGA4Property(ga4PropertyId: string, dateRange = { startDate: '30daysAgo', endDate: 'today' }) {
        try {
            const response = await this.analyticsData.properties.runReport({
                auth: this.oAuth2Client,
                property: ga4PropertyId,
                requestBody: {
                    dateRanges: [dateRange],
                    metrics: [{ name: 'activeUsers' }],
                },
            });

            // Check if data is returned
            const hasData = response.data.rows && response.data.rows.length > 0;
            return hasData;
        } catch (error: any) {
            console.error('Error verifying GA4 property:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
        }
    } 


    // fetch the analytics for the gaId passed 
    /**
     * Fetch analytics data for a specific GA4 property.
     * @param ga4PropertyId - The GA4 property ID (e.g., 'properties/123456789').
     * @param dateRange - The date range to fetch data for (default: last 30 days).
     * @param metrics - The metrics to fetch (default: activeUsers, screenPageViews).
     * @param dimensions - The dimensions to fetch (default: pagePath).
     */
    async fetchAnalyticsData(
        ga4PropertyId: string,
        dateRange = { startDate: '30daysAgo', endDate: 'today' },
        metrics = [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        dimensions = [{ name: 'pagePath' }]
    ) {
        try {
            const response = await this.analyticsData.properties.runReport({
                auth: this.oAuth2Client,
                property: ga4PropertyId,
                requestBody: {
                    dateRanges: [dateRange],
                    metrics: metrics,
                    dimensions: dimensions,
                },
            });

            return response.data;
        } catch (error: any) {
            console.error('Error fetching analytics data:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
        }
    }

    // async fetchMetricsForUrls(siteUrl: string, ga4PropertyId: string) {
    //     try {
    //         console.log('In the fetchMetricsForUrls function', siteUrl);
    //         const allPages = await this.getAllPagesFromSite(siteUrl);
    //         if (!allPages || allPages.length === 0) {
    //             throw ErrorBuilder.badRequest('No pages found for the site');
    //         }

    //         const urls = allPages
    //         console.log("urls is", urls)
    //         // Get available metrics from GA4

    //         const [pageViews, avgDuration, bounceRate] = await Promise.all([
    //             this.getGA4Metric('screenPageViews', urls as unknown as string[], ga4PropertyId),
    //             this.getGA4Metric('averageSessionDuration', urls as unknown as string[], ga4PropertyId),
    //             this.getGA4Metric('bounceRate', urls as unknown as string[], ga4PropertyId)
    //         ]);


    //         console.log('pageViews is', pageViews);
    //         const [organicPageViews, organicAvgDuration, organicBounceRate] = await Promise.all([
    //             this.getOrganicGA4Metric('screenPageViews', urls as unknown as string[], ga4PropertyId),
    //             this.getOrganicGA4Metric('averageSessionDuration', urls as unknown as string[], ga4PropertyId),
    //             this.getOrganicGA4Metric('bounceRate', urls as unknown as string[], ga4PropertyId)

    //         ]);
    
    //         const {withMetaTags, total} = await this.getMetaTagStatusForUrls(urls as unknown as string[]);
            
    //         const totalKeywords = await this.getTotalKeywords(urls as unknown as string[]);

    //         return {
    //             pageVisitsScore: { 
    //                 organic: organicPageViews || 0,     
    //                 total: pageViews || 0
    //             },
    //             avgDurationScore:{
    //                 organic: organicAvgDuration || 0,
    //                 total: avgDuration || 0
    //             },
    //             bounceRateScore: {
    //                 organic: organicBounceRate || 0,
    //                 total: bounceRate || 0
    //             },
    //             topPagesScore: {
    //                 organic: (organicPageViews+organicAvgDuration+organicBounceRate) || 0,
    //                 total: (pageViews+avgDuration+bounceRate) || 0
    //             }, // Not available in GA4
             
    //             megaTagStatusScore: {
    //                 withMetaTags: withMetaTags,
    //                 totalUrl: total
    //             }, // Not available in GA4

    //             totalKeywords: {
    //                 organic: totalKeywords || 0,
    //                 total: totalKeywords || 0
    //             }

    //         };
    //     } catch (error) {
    //         console.error('Error fetching metrics:', error);
    //         return {
    //             pageVisitsScore: { 
    //                 organic:  0,     
    //                 total:  0
    //             },
    //             avgDurationScore:{
    //                 organic: 0,
    //                 total: 0
    //             },

    //             bounceRateScore: {
    //                 organic: 0,
    //                 total: 0
    //             },

    //             topPagesScore: {
    //                 organic: 0,
    //                 total: 0
    //             }, // Not available in GA4
             
    //             megaTagStatusScore: {
    //                 withMetaTags: 0,
    //                 totalUrl: 0
    //             }, // Not available in GA4

    //         };
    //     }
    // }

    async fetchMetricsForUrls(siteUrl: string[], ga4PropertyId: string) {
        try {
            // console.log('In the fetchMetricsForUrls function', siteUrl);

            const urls = siteUrl
            // const siteIssues = await this.getSiteIssues(urls as unknown as string[]);
            // console.log("urls is", urls);


            // Process URLs in batches
            const batchSize = 4; // Adjust based on API rate limits
            const delayMs = 1000; // 1 second delay between batches

            const [pageViews, sessionEngagementDuration, activeUsers, bounceRate] = await Promise.all([
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 
                    this.getGA4Metric('screenPageViews', [url], ga4PropertyId)
                ),
                // **the sessionEngagmentDuration and sessions is to get the avgDuration
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 

                    this.getGA4Metric('userEngagementDuration', [url], ga4PropertyId)
                ),
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 

                    this.getGA4Metric('activeUsers', [url], ga4PropertyId)
                ),
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 
                    this.getGA4Metric('bounceRate', [url], ga4PropertyId)
                ),
            ]);


             // Process metaTagStatus and totalKeywords in batches
            const metaTagStatusResults = await this.processInBatches(urls as unknown as string[], batchSize, delayMs, async url => {
                const result = await this.getMetaTagStatusForUrls([url]);
                return result.withMetaTags;
            });

            const totalKeywordsResults = await this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 
                this.getTotalKeywords([url])
            );

            const totalSessionEngagementDuration = sessionEngagementDuration.reduce((sum, val) => sum + val, 0) || 0;
            const totalActiveUsers = activeUsers.reduce((sum, val) => sum + val, 0) || 0;
            const totalAvgDuration = totalSessionEngagementDuration / totalActiveUsers;

            console.log('metaTagStatusResults is', metaTagStatusResults);
            console.log('totalKeywordsResults is', totalKeywordsResults);

           
            return {
                pageVisitsScore: {

                    total: pageViews.reduce((sum, val) => sum + val, 0) || 0
                },
                avgDurationScore: {
                    total: totalAvgDuration || 0
                },
                bounceRateScore: {
                    total: bounceRate.reduce((sum, val) => sum + val, 0) || 0
                },
                topPagesScore: {
                    total: (pageViews.reduce((sum, val) => sum + val, 0) +
                            totalAvgDuration +
                            bounceRate.reduce((sum, val) => sum + val, 0)) || 0

                },
                megaTagStatusScore: {
                    withMetaTags: metaTagStatusResults.reduce((sum, val) => sum + val, 0) || 0,
                    totalUrl: urls.length || 0
                },

                totalKeywords: {
                    total: totalKeywordsResults.reduce((sum, val) => sum + val, 0) || 0
                }

            };
        } catch (error) {
            console.error('Error fetching metrics:', error);
            return {
                pageVisitsScore: { total: 0 },
                avgDurationScore: { total: 0 },
                bounceRateScore: { total: 0 },
                topPagesScore: { total: 0 },
                megaTagStatusScore: { withMetaTags: 0, totalUrl: 0 },
                totalKeywords: { total: 0 }
            };
        }
    }

    private async getOrganicGA4Metric(metric: string, urls: string[], trackingCode: string): Promise<number> {
        try {
            const slugs = urls.map(url => {
                try {
                    const urlObj = new URL(url);
                    // Remove leading/trailing slashes and get the slug
                    return urlObj.pathname.replace(/^\/|\/$/g, '');
                } catch {
                    // If URL parsing fails, assume it's already a slug
                    return url.replace(/^\/|\/$/g, '');
                }
            });

            const response = await this.analyticsData.properties.runReport({
                property: trackingCode,
                auth: this.oAuth2Client,
                requestBody: {
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],

                    dimensions: [{ name: 'pagePath' }],
                    metrics: [{ name: metric }],
                    dimensionFilter: {
                        andGroup: {
                            expressions: [
                                // Filter for slugs
                                {
                                    orGroup: {
                                        expressions: slugs.map(slug => ({
                                            filter: {
                                                fieldName: 'pagePath',
                                                stringFilter: {
                                                    matchType: 'CONTAINS',
                                                    value: slug
                                                }
                                            }
                                        }))
                                    }
                                },
                                // Filter for organic traffic
                                {
                                    filter: {
                                        fieldName: 'sessionSource',
                                        inListFilter: {
                                            values: [
                                                'google', // Google
                                                
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            });
    
            // console.log('response is', JSON.stringify(response.data, null, 2));
            // Convert string value to number
            const value = response.data.rows?.[0]?.metricValues?.[0]?.value;
            return value ? parseFloat(value) : 0;
        }catch(error){ 
            console.error('Error fetching GA4 metric:', error);
            return 0;
        }
    }

    private async getGA4Metric(metric: string, urls: string[], trackingCode: string, retries = 3): Promise<number> {
        try {
            // Extract the slug from URLs
            const slugs = urls.map(url => {

            try {
                const urlObj = new URL(url);
                // Remove leading/trailing slashes and get the slug
                return urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                // If URL parsing fails, assume it's already a slug
                return url.replace(/^\/|\/$/g, '');
            }
        });

        const response = await this.analyticsData.properties.runReport({
            property: trackingCode,
            auth: this.oAuth2Client,
            requestBody: {
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [{ name: metric }],
                dimensionFilter: {
                    orGroup: {
                        expressions: slugs.map(slug => ({
                            filter: {
                                fieldName: 'pagePath',
                                stringFilter: {
                                    matchType: 'CONTAINS',
                                    value: slug
                                }
                            }
                        }))
                    }
                }
            }
        });

            // Check if rows exist
        if (!response.data.rows || response.data.rows.length === 0) {
            console.warn('No data found for the specified URLs and metric.');
            return 0
            // throw ErrorBuilder.badRequest('No data found for the specified URLs and metric. Please check the property ID and URLs.');
        }
        console.log('response is', JSON.stringify(response.data, null, 2));
        // Convert string value to number

        const value = response.data.rows?.[0]?.metricValues?.[0]?.value;
        console.log('value is', value);
        console.log('value float is', value ? parseFloat(value) : 0);
        return value ? parseFloat(value) : 0;

       
        } catch (error) {
            if (retries > 0) {
                console.warn(`Retrying ${metric} (${retries} attempts left)...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
                return this.getGA4Metric(metric, urls, trackingCode, retries - 1);
            }
            console.error(`Error fetching ${metric}:`, error);
            return 0;
        }
    }


    private async getMetaTagStatusForUrls(urls: string[]): Promise<{ withMetaTags: number; total: number }> { 
    
        try {
            let withMetaTags = 0;
            // ** generate the siteUrl from the first url assuming all urls belong to the same site
            const siteUrl = new URL(urls[0]).origin + '/';
            //  console.log('siteUrl is', siteUrl);
            const normalizedUrls = urls.map(url => url.endsWith('/') ? url : `${url}/`);
            // console.log(normalizedUrls);
            // Fetch data for all URLs concurrently


            const inspectionResults = await Promise.all(
                normalizedUrls.map(url => 
                    
                    this.searchConsole.urlInspection.index.inspect({
                        requestBody: {
                            inspectionUrl: url, 
                            siteUrl: siteUrl
                        }

                    })
                )

            );
            // Count URLs with meta tags
            inspectionResults.forEach(result => {
                const indexStatusResult = result.data.inspectionResult?.indexStatusResult;
                if(indexStatusResult?.indexingState === 'INDEXING_ALLOWED'){
                    withMetaTags++;
                }

            });
    
            // console.log(`${withMetaTags} out of ${urls.length} urls have meta tags`);
            return {
                withMetaTags,
                total: urls.length
            };
        } catch (error: any) {
            console.error('Error fetching meta tag status:', error);
            return{ 
                withMetaTags: 0,
                total: 0
            }
        }
    
    }


    private async getTotalKeywords(urls: string[]): Promise<number> {

        try {
            // Generate siteUrl from the first URL



            const siteUrl = new URL(urls[0]).origin + '/';
            const normalizedUrls = urls.map(url => url.endsWith('/') ? url : `${url}/`);
            // Get current date in PT time (UTC -7:00/8:00)
            const now = new Date();
            const endDate = this.formatDateToPT(now);
            const startDate = this.formatDateToPT(new Date(now.setDate(now.getDate() - 30))); // Last 30 days

            // console.log('startDate is', startDate);
            // console.log('endDate is', endDate);
    
            // Fetch keyword data for all URLs

            const keywordData = await Promise.all(
                normalizedUrls.map(url => 
                    this.searchConsole.searchanalytics.query({
                        siteUrl: siteUrl,
                        requestBody: {
                            startDate: startDate,
                            endDate: endDate,
                            dimensions: ['query', 'page'],
                            dimensionFilterGroups: [
                                {
                                    filters: [
                                        {
                                            dimension: 'page',
                                            operator: 'equals',
                                            expression: url
                                        }
                                    ]
                                }
                            ],
                            rowLimit: 10000 // Maximum number of rows to fetch
                        }
                    })
                )
            );
    
            // Log the full response for debugging
            // console.log('API Response:', JSON.stringify(keywordData, null, 2));

            // Count unique keywords for each URL

            const keywordCounts = keywordData.map(response => {
                if (!response.data.rows || response.data.rows.length === 0) {
                    return 0;
                }
                // Extract unique queries (keywords)
                const uniqueQueries = new Set(response.data.rows.map(row => row.keys?.[0]));
                return uniqueQueries.size;

            });
    
            // Sum keyword counts for all URLs
            const totalKeywords = keywordCounts.reduce((sum, count) => sum + count, 0);
    
            // console.log('Total Keywords:', totalKeywords);
            return totalKeywords;
        } catch (error: any) {
            console.error('Error fetching total keywords:', error);
            throw new Error(`Failed to fetch total keywords: ${error.message}`);
        }
    }


    public async getAllPagesFromSite(siteUrl: string){ 
        try {
            // Get current date in PT time (UTC -7:00/8:00)
            const now = new Date();
            const endDate = this.formatDateToPT(now);

            const startDate = this.formatDateToPT(new Date(now.setDate(now.getDate() - 30))); // Last 30 days
    
            const normalizedSiteUrl = new URL(siteUrl).origin + '/';
            // Fetch all pages under the site URL
            const response = await this.searchConsole.searchanalytics.query({
                siteUrl: normalizedSiteUrl,
                requestBody: {
                    startDate: startDate,
                    endDate: endDate,
                    dimensions: ['page'], // Fetch pages
                    rowLimit: 10000 // Maximum number of rows to fetch
                }
            });
    
            // Extract page URLs from the response
            const pages = response.data.rows?.map(row => row.keys?.[0]) || [];
    

            // console.log('All Pages:', pages);
            return pages;
        } catch (error: any) {
            console.error('Google Search Console API Error:', error);

            // Handle Google API error structure
            if (error.errors && Array.isArray(error.errors)) {
                const googleError = error.errors[0];
                
                if (googleError.reason === 'forbidden') {
                    throw ErrorBuilder.forbidden(
                        `Permission denied for site ${siteUrl}. Ensure:\n` +
                        '1. The site is verified in Google Search Console\n' +
                        '2. Your service account has "Search Console API" access\n' +
                        '3. The site is added to your Search Console property list'
                    );
                }
            }

            // Handle URL validation error
            if (error.message.includes('Invalid site URL')) {
                throw ErrorBuilder.badRequest('Invalid site URL format - must start with http:// or https://');
            }


            // Handle other API errors
            throw new AppError(`Failed to fetch pages: ${error.message || 'Unknown API error'}`, ErrorType.UNKNOWN, 500);
        }
    }


    // Helper function to format date to YYYY-MM-DD in PT time
    private formatDateToPT(date: Date): string {
        const ptOffset = -7 * 60; // PT is UTC-7 (or UTC-8 during daylight saving time)
        const ptDate = new Date(date.getTime() + ptOffset * 60 * 1000);

        console.log('ptDate is', ptDate);
        return ptDate.toISOString().split('T')[0];
    }

    private async processInBatches<T>(
        urls: string[],
        batchSize: number,
        delayMs: number,
        processFn: (url: string) => Promise<T>
    ): Promise<T[]> {
        const results: T[] = [];
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processFn));
            results.push(...batchResults);

            // Add delay between batches, except for the last batch
            if (i + batchSize < urls.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return results;
    }

    public async getPostMetrics( ga4PropertyId: string, slugs: string[], siteUrls: string[]) { 
        try {
            await this.refreshTokenIfNeeded();
            const [pageViews, sessions, bounceRate] = await Promise.all([
                this.processInBatches(slugs, 4, 1000, url => 
                    this.getGA4Metric('screenPageViews', [url], ga4PropertyId)
                ),
                this.processInBatches(slugs, 4, 1000, url => 
                    this.getGA4Metric('sessions', [url], ga4PropertyId)
                ),
                this.processInBatches(slugs, 4, 1000, url => 
                    this.getGA4Metric('bounceRate', [url], ga4PropertyId)
                ),
            ]);

            const oldViews = await this.processInBatches(slugs, 4, 1000, url => 
                this.getOldGA4Metric('screenPageViews', [url], ga4PropertyId)
            )
    
            const crawlError = await this.processInBatches(siteUrls as unknown as string[], 4, 1000, async url => {
                const result = await this.getCrawlMetrics([url]);
                return result.crawlError;
            });

            const avgPosition = await this.processInBatches(siteUrls as unknown as string[], 4, 1000, async url => {
                const result = await this.getAvgPosition([url]);
                return result.averagePosition;
            });
            // Calculate pages per session
    
            const totalPagesPerSession = sessions.reduce((sum, val) => sum + val, 0) > 0 
                ? pageViews.reduce((sum, val) => sum + val, 0) / sessions.reduce((sum, val) => sum + val, 0) 
                : 0;

              // Calculate improvement for each post
            const improvements = pageViews.map((current, index) => {
                const previous = oldViews[index];
                if (previous > 0) {
                    return ((current - previous) / previous) * 100;
                } else if (current > 0) {
                    return 100; // Infinite improvement
                }
                return 0;
            });
    
            console.log('improvements are', improvements)
            return { 
                organicTraffic: {
                    total: pageViews.reduce((sum, val) => sum + val, 0) || 0,
                    improvements: improvements.reduce((sum, val) => sum + val, 0) || 0
                },
                pagesPerSession: { 
                    total: totalPagesPerSession
                },
                bounceRate: {
                    total: bounceRate.reduce((sum, val) => sum + val, 0) || 0
                },
                crawlError:{
                    total: crawlError.reduce((sum, val) => sum + val, 0) || 0
                }, 
                avgPosition: {
                    total: avgPosition.reduce((sum, val) => sum + val, 0) || 0
                }, 
                oldViews: {
                    total: oldViews.reduce((sum, val) => sum + val, 0) || 0
                }
            };
        } catch (error) {
            console.error('Error in getPostMetrics:', error);

            return {
                organicTraffic: { total: 0, improvements: 0 },
                pagesPerSession: { total: 0 },
                bounceRate: { total: 0 },
                crawlError: { total: 0 },
                avgPosition: { total: 0 },
                oldViews: { total: 0 }
            };
        }
    }

    public async getCrawlMetrics(urls: string[]) { 
        try {
            let crawlCount = 0
            // ** generate the siteUrl from the first url assuming all urls belong to the same site
            const siteUrl = new URL(urls[0]).origin + '/';
            const normalizedUrls = urls.map(url => url.endsWith('/') ? url : `${url}/`);

            console.log('the siteUrl and normalizedUrls are', siteUrl, normalizedUrls)
            const inspectionResults = await Promise.all(
                normalizedUrls.map(url => 
                    
                    this.searchConsole.urlInspection.index.inspect({
                        requestBody: {
                            inspectionUrl: url, 
                            siteUrl: siteUrl
                        }

                    })
                )

            );

            inspectionResults.forEach(result => {
                const indexStatusResult = result?.data?.inspectionResult?.indexStatusResult;
    
                if (!indexStatusResult) return {crawlError: 0}; // Prevents accessing undefined properties
                // Check for critical crawl errors
                if (
                    indexStatusResult?.verdict === 'FAIL' ||
                    indexStatusResult?.robotsTxtState === 'DISALLOWED' ||
                    indexStatusResult?.indexingState === 'BLOCKED_BY_META_TAG' ||
                    indexStatusResult?.indexingState === 'BLOCKED_BY_HTTP_HEADER' ||
                    indexStatusResult?.pageFetchState === 'SOFT_404' ||
                    indexStatusResult?.pageFetchState === 'BLOCKED_ROBOTS_TXT' ||
                    indexStatusResult?.pageFetchState === 'NOT_FOUND' ||
                    indexStatusResult?.pageFetchState === 'ACCESS_DENIED' ||
                    indexStatusResult?.pageFetchState === 'SERVER_ERROR' ||
                    indexStatusResult?.pageFetchState === 'REDIRECT_ERROR' ||
                    indexStatusResult?.pageFetchState === 'ACCESS_FORBIDDEN' ||
                    indexStatusResult?.pageFetchState === 'BLOCKED_4XX' ||
                    indexStatusResult?.pageFetchState === 'INTERNAL_CRAWL_ERROR' ||
                    indexStatusResult?.pageFetchState === 'INVALID_URL'
                ) {
                    crawlCount++;
                }
            });
    
            return { crawlError: crawlCount };

            
        } catch (error) {
            return{ 
                crawlError: 0
            }
        }
    }

    public async getAvgPosition(urls: string[]) { 
        try {
            console.log('yu are to run once')
            const siteUrl = new URL(urls[0]).origin + '/';
            const normalizedUrls = urls.map(url => url.endsWith('/') ? url : `${url}/`);

            console.log('the siteUrl and normalizedUrls are', siteUrl, normalizedUrls)
            const now = new Date();
            const endDate = this.formatDateToPT(now);
            const startDate = this.formatDateToPT(new Date(now.setDate(now.getDate() - 30))); // Last 30 days
    
            const keywordData = await Promise.all(
                normalizedUrls.map(url => 
                    this.searchConsole.searchanalytics.query({
                        siteUrl: siteUrl,
                        requestBody: {
                            startDate: startDate,
                            endDate: endDate,
                            dimensions: ['page'],
                            dimensionFilterGroups: [
                                {
                                    filters: [
                                        {
                                            dimension: 'page',
                                            operator: 'equals',
                                            expression: url
                                        }
                                    ]
                                }
                            ],
                            rowLimit: 10000 // Maximum number of rows to fetch
                        }
                    })
                )
            );

            console.log('the keywordData is', JSON.stringify(keywordData, null, 2))
    
            // Count unique keywords and calculate average position
            let totalPosition = 0;
            let pageCount = 0;
    
            keywordData.forEach(response => {
                if (!response.data.rows || response.data.rows.length === 0) return;
    
                // Extract unique queries (keywords) and their positions
                response.data.rows.forEach(row => {
                    const position = row.position || 0; // The position in search results
                    totalPosition += position;
                    pageCount++;

                    console.log('the page count and position are', pageCount, position)
                });

            });
    
            // Calculate average position
            const averagePosition = pageCount > 0 ? totalPosition / pageCount : 0;
            return {
                averagePosition
            };
        } catch (error: any) {
            return {
                averagePosition: 0
            }
        }
    }

    private async getOldGA4Metric(metric: string, urls: string[], trackingCode: string, retries = 3): Promise<number> {
        try {
            // Extract the slug from URLs
            const slugs = urls.map(url => {

            try {
                const urlObj = new URL(url);
                // Remove leading/trailing slashes and get the slug
                return urlObj.pathname.replace(/^\/|\/$/g, '');
            } catch {
                // If URL parsing fails, assume it's already a slug
                return url.replace(/^\/|\/$/g, '');
            }
        });

        const response = await this.analyticsData.properties.runReport({
            property: trackingCode,
            auth: this.oAuth2Client,
            requestBody: {
                dateRanges: [{ startDate: '60daysAgo', endDate: '30daysAgo' }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [{ name: metric }],
                dimensionFilter: {
                    orGroup: {
                        expressions: slugs.map(slug => ({
                            filter: {
                                fieldName: 'pagePath',
                                stringFilter: {
                                    matchType: 'CONTAINS',
                                    value: slug
                                }
                            }
                        }))
                    }
                }
            }
        });

            // Check if rows exist
        if (!response.data.rows || response.data.rows.length === 0) {
            console.warn('No data found for the specified URLs and metric.');
            return 0
            // throw ErrorBuilder.badRequest('No data found for the specified URLs and metric. Please check the property ID and URLs.');
        }
        console.log('response is', JSON.stringify(response.data, null, 2));
        // Convert string value to number

        const value = response.data.rows?.[0]?.metricValues?.[0]?.value;
        console.log('value is', value);
        console.log('value float is', value ? parseFloat(value) : 0);
        return value ? parseFloat(value) : 0;

       
        } catch (error) {
            if (retries > 0) {
                console.warn(`Retrying ${metric} (${retries} attempts left)...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
                return this.getOldGA4Metric(metric, urls, trackingCode, retries - 1);
            }
            console.error(`Error fetching ${metric}:`, error);
            return 0;
        }
    }
}

