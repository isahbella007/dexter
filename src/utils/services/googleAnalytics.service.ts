import { OAuth2Client } from "google-auth-library";
import { analyticsadmin_v1alpha, analyticsdata_v1beta, google } from "googleapis";
import { config } from "../../config";

// for now, the aim of this class is to handle everything related to google analytics
export class GoogleAnalyticsService {
    private googleClientId: string;
    private googleClientSecret: string;
    private googleRedirectUri: string;
    
    private oAuth2Client: OAuth2Client;
    private analyticsData: analyticsdata_v1beta.Analyticsdata;
    private analyticsAdmin: analyticsadmin_v1alpha.Analyticsadmin;

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
    }


    // get all the user's google analytics data. I think this will have to make use of the users google refres/access token
    async fetchAllGA4Properties() {
        try {
            const response = await this.analyticsAdmin.properties.list({
                auth: this.oAuth2Client,
            });
            return response.data.properties || [];
        } catch (error) {
            console.error('Error fetching GA4 properties:', error);
            throw error;
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
        } catch (error) {
            console.error('Error verifying GA4 property:', error);
            throw error;
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
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            throw error;
        }
    }
}
