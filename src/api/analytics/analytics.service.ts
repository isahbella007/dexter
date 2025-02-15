import { AnalyticsModel } from "../../models/Analytics";
import { BlogPost, SYSTEM_PLATFORM } from "../../models/BlogPost";
import { IUsageDay } from "../../models/interfaces/UsageInterface";
import { IUser } from "../../models/interfaces/UserInterface";
import { SiteAnalysis } from "../../models/PlatformAnalysis";
import { User } from "../../models/User";
import { AppError } from "../../utils/errors/AppError";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { ErrorType } from "../../utils/errors/errorTypes";
import { calculateDVS } from "../../utils/helpers/domainValueGrader";
import { GoogleAnalyticsService } from "../../utils/services/googleAnalytics.service";
import { mapSEOAnalysis } from "../../utils/services/seoAnalysis.service";

export class AnalyticsService{ 
   
    async fullSEOAnalysis(userId: string, trackingCode: string, siteUrl: string, siteId: string){
        try {
            if(!trackingCode && !siteUrl) throw ErrorBuilder.badRequest('Tracking code or site url is required')
            
            const user = await User.findById(userId)
            if(!user) throw ErrorBuilder.notFound('User not found')

                 // Validate Google OAuth tokens
            if (!user.oauth?.google?.accessToken || !user.oauth?.google?.refreshToken || !user.oauth?.google?.expiryDate) {
                throw ErrorBuilder.forbidden('Please connect to Google');
            }
    
            // Initialize Google Analytics service
            const googleAnalyticsService = new GoogleAnalyticsService(
                user.oauth.google.accessToken,
                user.oauth.google.refreshToken,
                user.oauth.google.expiryDate
            );

            // check if the siteUrl ends with a / if not add it
            if(!siteUrl.endsWith('/')) siteUrl = siteUrl + '/'
            const allPages = await googleAnalyticsService.getAllPagesFromSite(siteUrl)
            if(allPages.length == 0) throw ErrorBuilder.badRequest('No pages found for the site')

            const [analytics, seoAnalysis] = await Promise.all([
                this.fetchGoogleAnalytics(user, allPages as string[], trackingCode),
                this.getCachedSEOAnalysis(allPages as string[], siteId)

            ]);     
            return{ 
                analytics, 
                seoAnalysis
            }
        } catch (error: any) {
            // If the error is already an AppError or ErrorBuilder error, rethrow it
            if (error instanceof AppError || error.name === 'AppError') {
                throw error;
            }
            // For other errors, wrap them in an AppError
            throw new AppError(error.message, ErrorType.UNKNOWN, error.status || 500);
        }
    }

    private async fetchGoogleAnalytics(user: IUser, allPages: string[], trackingCode: string){ 
        try {
            // Validate Google OAuth tokens
            if (!user.oauth?.google?.accessToken || !user.oauth?.google?.refreshToken || !user.oauth?.google?.expiryDate) {

                throw ErrorBuilder.forbidden('Please connect to Google');
            }
    
            // Initialize Google Analytics service
            const googleAnalyticsService = new GoogleAnalyticsService(
                user.oauth.google.accessToken,
                user.oauth.google.refreshToken,
                user.oauth.google.expiryDate
            );
    
            // this is correct because the siteUrl is the same as the first page in the allPages array
            // if the url is https://bestdogresources.com/ then the siteUrl is bestdogresources.com
            const urlObj = new URL(allPages[0])
            const siteUrl = `${urlObj.protocol}//${urlObj.host}/`
            // Check for cached analytics
            const existingAnalytics = await AnalyticsModel.findOne({ userId: user._id, siteUrl });


            const isStale = existingAnalytics && (Date.now() - existingAnalytics.updatedAt.getTime() > 3600000); // 1 hour
    
            // Return cached analytics if not stale
            if (existingAnalytics && !isStale) {
                return existingAnalytics;
            }
    
            // Fetch live metrics
            const metrics = await googleAnalyticsService.fetchMetricsForUrls(allPages, trackingCode);
            
            // calculate the dvs score
            const generatedAnalytics = calculateDVS(metrics)
            console.log(generatedAnalytics)
            // Save or update analytics in the database
            await AnalyticsModel.updateOne(
                { userId: user._id, siteUrl },
                { $set: { ...metrics, updatedAt: new Date(), dashboard: generatedAnalytics } },
                { upsert: true }
            );

            const newAnalytics = await AnalyticsModel.findOne({ userId: user._id, siteUrl })
    
            return newAnalytics;
        } catch (error: any) {
            // If the error is already an AppError or ErrorBuilder error, rethrow it
            if (error instanceof AppError || error.name === 'AppError') {
                throw error;
            }
            // For other errors, wrap them in an AppError
            throw new AppError(error.message, ErrorType.UNKNOWN, error.status || 500);
        }
    }

    private async getCachedSEOAnalysis(urls: string[], siteId: string) {
        // Check for recent analysis (within last hour)
        const lastAnalysis = await SiteAnalysis.findOne({ siteId })
            .sort({ 'analysis.lastScraped': -1 })
            .lean();
    
        if (lastAnalysis?.analysis && 
            Date.now() - lastAnalysis.analysis.lastScraped.getTime() < 3600000) {
            console.log('Using cached analysis. Last scraped:', lastAnalysis.analysis.lastScraped);
            return lastAnalysis.analysis.aiAnalysis;
        }
    
        // Fresh analysis required
        const seoAnalysis = await mapSEOAnalysis(urls);
        
        // Update or create analysis record
        await SiteAnalysis.updateOne(
            { siteId },
            { 
                $set: { 
                    analysis: {
                        aiAnalysis: seoAnalysis,
                        lastScraped: new Date()
                    }
                } 
            },
            { upsert: true }
        );
    
        return seoAnalysis;
    }

    // this returns the platforms and the sites for the user
    // async fetchSites(userId: string) {
    //     const result = await User.findById(userId).select({
    //         'platforms.wordpress.sites.url': 1,
    //         'platforms.wordpress.sites.ga4TrackingCode': 1,
    //         'platforms.wix.sites.url': 1,
    //         'platforms.wix.sites.ga4TrackingCode': 1,
    //         _id: 0
    //     });
        
    //     return result?.platforms ? {
    //         wordpress: result.platforms.wordpress?.sites?.map(site => ({
    //             url: site.url,
    //             ga4TrackingCode: site.ga4TrackingCode
    //         })) || [],
    //         wix: result.platforms.wix?.sites?.map(site => ({
    //             url: site.url,
    //             ga4TrackingCode: site.ga4TrackingCode
    //         })) || []
    //     } : { wordpress: [], wix: [] };
    // }

    async fetchSites(userId: string) {
        const result = await User.findById(userId).select({
            'platforms.wordpress.sites.url': 1,
            'platforms.wordpress.sites.ga4TrackingCode': 1,
            'platforms.wordpress.sites.siteId': 1,
            'platforms.wix.sites.url': 1,
            'platforms.wix.sites.ga4TrackingCode': 1,
            'platforms.wix.sites.siteId': 1,
            _id: 0

        });
    
        if (!result?.platforms) return [];
    
        // Combine sites from both platforms
        const allSites = [
            ...(result.platforms.wordpress?.sites?.map(s => ({
                url: s.url,
                ga4TrackingCode: s.ga4TrackingCode,
                siteId: s.siteId
            })) || []),

            ...(result.platforms.wix?.sites?.map(s => ({
                url: s.url,
                ga4TrackingCode: s.ga4TrackingCode,
                siteId: s.siteId
            })) || [])

        ];
    
        return allSites;
    }


}


export const analyticsService = new AnalyticsService