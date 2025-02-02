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

    async fetchMetricsForUrls(urls: string[], ga4PropertyId: string) {
        try {
            // Get available metrics from GA4
            const [pageViews, avgDuration, bounceRate] = await Promise.all([
                this.getGA4Metric('screenPageViews', urls, ga4PropertyId),
                this.getGA4Metric('averageSessionDuration', urls, ga4PropertyId),
                this.getGA4Metric('bounceRate', urls, ga4PropertyId)
            ]);

            const [organicPageViews, organicAvgDuration, organicBounceRate] = await Promise.all([
                this.getOrganicGA4Metric('screenPageViews', urls, ga4PropertyId),
                this.getOrganicGA4Metric('averageSessionDuration', urls, ga4PropertyId),
                this.getOrganicGA4Metric('bounceRate', urls, ga4PropertyId)
            ]);
    
            // Return metrics with 0 for unavailable ones
            return {
                pageVisitsScore: { 
                    organic: organicPageViews || 0,     
                    total: pageViews || 0
                },
                avgDurationScore:{
                    organic: organicAvgDuration || 0,
                    total: avgDuration || 0
                },
                bounceRateScore: {
                    organic: organicBounceRate || 0,
                    total: bounceRate || 0
                },
                topPagesScore: {
                    organic: 0,
                    total: 0
                }, // Not available in GA4
             
                megaTagStatusScore: {
                    organic: 0,
                    total: 0
                }, // Not available in GA4
            };
        } catch (error) {
            console.error('Error fetching metrics:', error);
            return {
                topPagesScore: 0,
                pageVisitsScore: 0,
                megaTagStatusScore: 0,
                avgDurationScore: 0,
                bounceRateScore: 0
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
                property: `properties/${trackingCode}`,
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
    
            console.log('response is', JSON.stringify(response.data, null, 2));
            // Convert string value to number
            const value = response.data.rows?.[0]?.metricValues?.[0]?.value;
            return value ? parseFloat(value) : 0;
        }catch(error){ 
            console.error('Error fetching GA4 metric:', error);
            return 0;
        }
    }

    private async getGA4Metric(metric: string, urls: string[], trackingCode: string): Promise<number> {
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
                property: `properties/${trackingCode}`,
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
    
            console.log('response is', JSON.stringify(response.data, null, 2));
            // Convert string value to number
            const value = response.data.rows?.[0]?.metricValues?.[0]?.value;
            return value ? parseFloat(value) : 0;
        } catch (error) {
            console.error(`Error fetching ${metric}:`, error);
            return 0;
        }
    }
}
