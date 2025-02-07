import { AnalyticsModel } from "../../models/Analytics";
import { BlogPost, SYSTEM_PLATFORM } from "../../models/BlogPost";
import { IUsageDay } from "../../models/interfaces/UsageInterface";
import { IUser } from "../../models/interfaces/UserInterface";
import { SiteAnalysis } from "../../models/PlatformAnalysis";
import { User } from "../../models/User";
import { AppError } from "../../utils/errors/AppError";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { ErrorType } from "../../utils/errors/errorTypes";
import { GoogleAnalyticsService } from "../../utils/services/googleAnalytics.service";
import { mapSEOAnalysis } from "../../utils/services/seoAnalysis.service";

export class AnalyticsService{ 
   
    async fullSEOAnalysis(userId: string, trackingCode: string, siteUrl: string){
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

            const allPages = await googleAnalyticsService.getAllPagesFromSite(siteUrl)
            if(allPages.length == 0) throw ErrorBuilder.badRequest('No pages found for the site')

                console.log(allPages)
            const [analytics, seoAnalysis] = await Promise.all([
                this.fetchGoogleAnalytics(user, allPages as string[], trackingCode),
                this.getCachedSEOAnalysis(allPages as string[])

            ]);     
            return{ 
                analytics, 
                seoAnalysis
            }
        } catch (error: any) {
            console.error('Error fetching blog posts by platform:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
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
    
            // Save or update analytics in the database
            await AnalyticsModel.updateOne(
                { userId: user._id, siteUrl },
                { $set: { ...metrics, updatedAt: new Date() } },
                { upsert: true }
            );
    
            return metrics;
        } catch (error: any) {
            console.error('Error in fetchGoogleAnalytics:', error);
            throw new AppError(`Failed to fetch Google Analytics: ${error.message}`, ErrorType.UNKNOWN, 500);
        }
    }

    private async getCachedSEOAnalysis(urls: string[], siteId="240571294") {
        // Check if the site was scraped in the last hour
        const lastAnalysis = await SiteAnalysis.findOne({siteId: siteId })
            .sort({ 'analysis.lastScraped': -1 })
            .limit(1);
    
        if (lastAnalysis && (Date.now() - lastAnalysis.analysis[0].lastScraped.getTime()) < 3600000) {
            console.log('Using cached analysis. Last scraped:', lastAnalysis.analysis[0].lastScraped);
            return lastAnalysis.analysis[0].aiAnalysis;
        }

        // If not, proceed with scraping
        const seoAnalysis = await mapSEOAnalysis(urls);
        return seoAnalysis;
    }

}


export const analyticsService = new AnalyticsService