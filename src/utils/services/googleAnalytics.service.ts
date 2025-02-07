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
        this.analyticsAdmin = google.analyticsadmin('v1alpha');
        this.analyticsData = google.analyticsdata('v1beta');
        this.searchConsole = google.searchconsole({
            version: 'v1',
            auth: this.oAuth2Client
        });
        
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

    async fetchGoogleAnalyticsDataForWordPress(slugs: string[], ga4PropertyId: string) {
        try {
            // Ensure the property ID is numeric and properly formatted
            const formattedPropertyId = `properties/${ga4PropertyId}` 

            // Fetch organic traffic data
            const organicResponse = await this.analyticsData.properties.runReport({
                auth: this.oAuth2Client,
                property: formattedPropertyId,
                requestBody: {
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    metrics: [
                        { name: 'screenPageViews' },
                        { name: 'activeUsers' },
                        { name: 'screenPageViewsPerSession' },
                        { name: 'bounceRate' }
                    ],
                    dimensions: [{ name: 'pagePath' }],
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

            // Fetch total traffic data
            const totalResponse = await this.analyticsData.properties.runReport({
                auth: this.oAuth2Client,
                property: formattedPropertyId,
                requestBody: {
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    metrics: [
                        { name: 'screenPageViews' },
                        { name: 'activeUsers' },
                        { name: 'screenPageViewsPerSession' },
                        { name: 'bounceRate' }
                    ],
                    dimensions: [{ name: 'pagePath' }],
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

            // Aggregate organic traffic data
            const organicTotals = organicResponse.data.rows?.reduce(
                (acc, row) => {
                    acc.screenPageViews += parseInt(row.metricValues?.[0]?.value || '0');
                    acc.activeUsers += parseInt(row.metricValues?.[1]?.value || '0');
                    acc.screenPageViewsPerSession += parseFloat(row.metricValues?.[2]?.value || '0');
                    acc.bounceRate += parseFloat(row.metricValues?.[3]?.value || '0');
                    return acc;
                },
                {
                    screenPageViews: 0,
                    activeUsers: 0,
                    screenPageViewsPerSession: 0,
                    bounceRate: 0,
                }
            );

            // Aggregate total traffic data
            const totalTotals = totalResponse.data.rows?.reduce(
                (acc, row) => {
                    acc.screenPageViews += parseInt(row.metricValues?.[0]?.value || '0');
                    acc.activeUsers += parseInt(row.metricValues?.[1]?.value || '0');
                    acc.screenPageViewsPerSession += parseFloat(row.metricValues?.[2]?.value || '0');
                    acc.bounceRate += parseFloat(row.metricValues?.[3]?.value || '0');
                    return acc;
                },
                {
                    screenPageViews: 0,
                    activeUsers: 0,
                    screenPageViewsPerSession: 0,
                    bounceRate: 0,
                }
            );

            // Calculate averages for screenPageViewsPerSession and bounceRate
            if (organicResponse.data.rows?.length) {
                organicTotals!.screenPageViewsPerSession /= organicResponse.data.rows.length;
                organicTotals!.bounceRate /= organicResponse.data.rows.length;
            }
            if (totalResponse.data.rows?.length) {
                totalTotals!.screenPageViewsPerSession /= totalResponse.data.rows.length;
                totalTotals!.bounceRate /= totalResponse.data.rows.length;
            }

            // Return the comparison data
            return {
                organicTraffic:{
                    organic: organicTotals!.screenPageViews,
                    total: totalTotals!.screenPageViews
                },
                activeUsers: {
                    organic: organicTotals!.activeUsers,
                    total: totalTotals!.activeUsers
                },
                pagesPerSession: {
                    organic: organicTotals!.screenPageViewsPerSession,
                    total: totalTotals!.screenPageViewsPerSession
                },
                bounceRate: {
                    organic: 0,
                    total: totalTotals!.bounceRate
                }
            };
        } catch (error: any) {
            console.error('Error fetching WordPress analytics:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
        }
    }

    async fetchSearchConsoleDataForWordPress(siteUrls: string[], slugs: string[]) {
        try {
            // Initialize totals
            let totalPosition = 0;
            let totalRows = 0;
            let totalCrawlErrors = 0;

            // Fetch data for all site URLs concurrently
            const [positionResponses] = await Promise.all([
                // Fetch average page position
                Promise.all(
                    siteUrls.map(siteUrl => 
                        this.searchConsole.searchanalytics.query({
                            siteUrl,
                            requestBody: {
                                startDate: '30daysAgo',
                                endDate: 'today',
                                dimensions: ['page'],
                                dimensionFilterGroups: [{
                                    filters: slugs.map(slug => ({
                                        dimension: 'page',
                                        operator: 'contains',
                                        expression: slug
                                    }))
                                }]
                            }
                        })
                    )
                ),
                // Fetch crawl errors
                
            ]);

            // Aggregate position data
            for (const response of positionResponses) {
                if (response.data.rows) {
                    totalPosition += response.data.rows.reduce((sum, row) => sum + (row.position || 0), 0);
                    totalRows += response.data.rows.length;
                }
            }

            // Aggregate crawl errors
            

            // Calculate average position
            const averagePosition = totalRows > 0 ? (totalPosition / totalRows).toFixed(2) : '0.00';

            return {
                averagePosition,
                crawlErrors: totalCrawlErrors
            };
        } catch (error: any ) {
            console.error('Error fetching Search Console data:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
        }
    }
    
    async fetchAnalyticsForWordPress(slugs: string[], ga4PropertyId: string, siteUrl: string[]) {
        try {
            // Fetch Google Analytics data (existing code)
            const analyticsData = await this.fetchGoogleAnalyticsDataForWordPress(slugs, ga4PropertyId);

            // Fetch Search Console data
            // const searchConsoleData = await this.fetchSearchConsoleDataForWordPress(siteUrl, slugs);

            const searchConsoleData = {
                averagePosition: 7000,
                crawlErrors: 0
            }
            // Return combined data
            return {
                ...analyticsData,
                ...searchConsoleData
            };
        } catch (error: any) {
            console.error('Error fetching WordPress analytics:', error);
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


            
            const [organicPageViews, organicSessionEngagementDuration, organicActiveUsers, organicBounceRate] = await Promise.all([
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 
                    this.getOrganicGA4Metric('screenPageViews', [url], ga4PropertyId)
                ),

                // **the sessionEngagmentDuration and sessions is to get the avgDuration
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 

                    this.getGA4Metric('userEngagementDuration', [url], ga4PropertyId)
                ),
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 

                    this.getGA4Metric('activeUsers', [url], ga4PropertyId)
                ),
                this.processInBatches(urls as unknown as string[], batchSize, delayMs, url => 
                    this.getOrganicGA4Metric('bounceRate', [url], ga4PropertyId)
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


            const organicTotalSessionEngagementDuration = organicSessionEngagementDuration.reduce((sum, val) => sum + val, 0) || 0;
            const organicTotalActiveUsers = organicActiveUsers.reduce((sum, val) => sum + val, 0) || 0;
            const organicAvgDuration = organicTotalSessionEngagementDuration / organicTotalActiveUsers;


            console.log('metaTagStatusResults is', metaTagStatusResults);
            console.log('totalKeywordsResults is', totalKeywordsResults);

           

            console.log('--------------------------------------------')
            console.log('organicPageViews is', organicPageViews);
            console.log('totalPageViews is', pageViews);

            console.log('--------------------------------------------')
            console.log('organicAvgDuration is', organicAvgDuration);
            console.log('totalAvgDuration is', totalAvgDuration);



            console.log('--------------------------------------------') 
            console.log('organicBounceRate is', organicBounceRate);
            console.log('totalBounceRate is', bounceRate);

            console.log('--------------------------------------------')
          
            

           
            return {
                pageVisitsScore: {
                    organic: organicPageViews.reduce((sum, val) => sum + val, 0) || 0,


                    total: pageViews.reduce((sum, val) => sum + val, 0) || 0
                },
                avgDurationScore: {
                    organic: organicAvgDuration || 0,
                    total: totalAvgDuration || 0
                },
                bounceRateScore: {
                    organic: organicBounceRate.reduce((sum, val) => sum + val, 0) || 0,
                    total: bounceRate.reduce((sum, val) => sum + val, 0) || 0
                },
                topPagesScore: {
                    organic: (organicPageViews.reduce((sum, val) => sum + val, 0) +
                                organicAvgDuration +
                              organicBounceRate.reduce((sum, val) => sum + val, 0)) || 0,
                    total: (pageViews.reduce((sum, val) => sum + val, 0) +
                            totalAvgDuration +
                            bounceRate.reduce((sum, val) => sum + val, 0)) || 0

                },
                megaTagStatusScore: {
                    withMetaTags: metaTagStatusResults.reduce((sum, val) => sum + val, 0) || 0,
                    totalUrl: urls.length || 0
                },


                totalKeywords: {
                    organic: totalKeywordsResults.reduce((sum, val) => sum + val, 0) || 0,
                    total: totalKeywordsResults.reduce((sum, val) => sum + val, 0) || 0
                }

            };
        } catch (error) {
            console.error('Error fetching metrics:', error);
            return {
                pageVisitsScore: { organic: 0, total: 0 },
                avgDurationScore: { organic: 0, total: 0 },
                bounceRateScore: { organic: 0, total: 0 },
                topPagesScore: { organic: 0, total: 0 },
                megaTagStatusScore: { withMetaTags: 0, totalUrl: 0 },
                totalKeywords: { organic: 0, total: 0 }
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
            console.error('Error fetching all pages:', error);
            throw new Error(`Failed to fetch all pages: ${error.message}`);
        }
    }

    private async getSiteIssues(urls:string[]){ 
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
                            siteUrl: 'https://bestdogresources.com/'
                        }

                    })
                )

            );
            inspectionResults.forEach(result => {
                const mobileIssues = result.data.inspectionResult?.mobileUsabilityResult?.issues;
                const ampIssues = result.data.inspectionResult?.ampResult?.issues;
                const richIssues = result.data.inspectionResult?.richResultsResult?.detectedItems?.map(item => item.items?.map(item => item.issues));
            
                if (mobileIssues?.length) {
                    console.log('Mobile Usability Issues:', mobileIssues);
                }
                if (ampIssues?.length) {
                    console.log('AMP Issues:', ampIssues);
                }
                if (richIssues?.length) {
                    console.log('Rich Issues:', richIssues.flat());
                }
            });
           


           return 'done'
        } catch (error: any) {
            console.error('Error fetching meta tag status:', error);
            return{ 
                withMetaTags: 0,
                total: 0
            }
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
}
