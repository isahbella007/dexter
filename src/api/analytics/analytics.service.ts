import { BlogPost, SYSTEM_PLATFORM } from "../../models/BlogPost";
import { IUsageDay } from "../../models/interfaces/UsageInterface";
import { IUser } from "../../models/interfaces/UserInterface";
import { PlatformAnalysis } from "../../models/PlatformAnalysis";
import { User } from "../../models/User";
import { AppError } from "../../utils/errors/AppError";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { ErrorType } from "../../utils/errors/errorTypes";
import { GoogleAnalyticsService } from "../../utils/services/googleAnalytics.service";
import { platformManagementService } from "../../utils/services/platformManagement.service";
import { mapSEOAnalysis } from "../../utils/services/seoAnalysis.service";

export class AnalyticsService{ 
   
    async fullSEOAnalysis(userId: string, platform: string, siteId?: string){
        try {
            let site
            const user = await User.findById(userId)   
            if(!user) { 
                throw ErrorBuilder.notFound('User not found')
            }
            // Validate platform
            if (!Object.values(SYSTEM_PLATFORM).includes(platform as SYSTEM_PLATFORM)) {
                throw ErrorBuilder.badRequest('Invalid platform');
            }

            // Build query
            const query: any = {
                'platformPublications.platform': platform
            };

            // Add siteId to query if provided
            if (siteId) {
                // verify that the siteId matches the platform
                site = await platformManagementService.validateSiteId(userId, siteId, platform)
                if(!site) { 
                    throw ErrorBuilder.notFound('Site not found')
                }
                query['platformPublications.publishedSiteId'] = siteId;
            }

            // Fetch blog posts
            const blogPosts = await BlogPost.find(query)

            if(!user.oauth?.google?.accessToken || !user.oauth?.google?.refreshToken || !user.oauth?.google?.expiryDate) { 
                return {message: "Unable to show analytics. Please connect to google"}
            }

            // Only fetch analytics for WordPress if siteId is provided
            if (platform === SYSTEM_PLATFORM.wordpress) {
                if (!siteId) {
                    throw ErrorBuilder.badRequest('Site ID is required for WordPress platform');
                }

                // Extract all slugs for the specified platform and site
                // const slugs = blogPosts.flatMap(post => 
                //     post.platformPublications
                //         .filter(pub => pub.platform === platform && pub.publishedSiteId.toString() === siteId)
                //         .map(pub => pub.publishedSlug)
                // ).filter(slug => slug); // Remove any undefined slugs

                // const siteUrls = blogPosts.flatMap(post => 
                //     post.platformPublications
                //         .filter(pub => pub.platform === platform && pub.publishedSiteId.toString() === siteId)
                //         .map(pub => pub.publishedUrl)
                // ).filter(url => url); // Remove any undefined urls

                const siteUrls = ['https://bestdogresources.com/is-pine-straw-good-for-dog-bedding', 'https://bestdogresources.com/can-dogs-eat-vegetables', 'https://bestdogresources.com/top-10-vegetables-for-dogs-a-guide-to-nutritious-canine-diets-2', 'https://bestdogresources.com/frenchie-pee-on-bed']
                const slugs = ['is-pine-straw-good-for-dog-bedding', 'can-dogs-eat-vegetables', 'top-10-vegetables-for-dogs-a-guide-to-nutritious-canine-diets-2', 'frenchie-pee-on-bed']
                console.log('slugs are', slugs);

                // Don't attempt to fetch analytics if there are no slugs
                if (slugs.length === 0) {
                    return {message: "No analytics to display for this site. Nothing has been published through Dexter"};
                }

                const [analytics, seoAnalysis] = await Promise.all([
                    this.fetchGoogleAnalytics(user, siteUrls, site),
                    this.getCachedSEOAnalysis(platform, siteId, siteUrls)
                ]);

                return{ 
                    analytics, 
                    seoAnalysis: { 
                        isFresh: true, 
                        data: seoAnalysis
                    }
                }
                // // get the analytics from google directly
                // const googleAnalyticsService = new GoogleAnalyticsService(
                //     user?.oauth?.google?.accessToken as string, 
                //     user?.oauth?.google?.refreshToken as string, 
                //     user?.oauth?.google?.expiryDate as number
                // );

                // const analytics = await googleAnalyticsService.fetchMetricsForUrls(siteUrls as unknown as string[], site?.ga4TrackingCode as string);
                
                // // Get the SEO ANALYSIS by mapping etc
                // // find the exsiting analysis 
                

            }

            // For other platforms (e.g., Wix, Shopify), return blog posts without analytics for now
            return {blogPosts, analytics: []};

        } catch (error: any) {
            console.error('Error fetching blog posts by platform:', error);
            throw new AppError(error.errors[0].message, ErrorType.UNKNOWN, error.status)
        }
    }

    private async fetchGoogleAnalytics(user: IUser, urls: string[], site: any){ 
        if(!user.oauth?.google?.accessToken || !user.oauth?.google?.refreshToken || !user.oauth?.google?.expiryDate) { 
            throw ErrorBuilder.forbidden('Please connect to google')
        }

        const googleAnalyticsService = new GoogleAnalyticsService(
            user?.oauth?.google?.accessToken as string, 
            user?.oauth?.google?.refreshToken as string, 
            user?.oauth?.google?.expiryDate as number
        );
        return googleAnalyticsService.fetchMetricsForUrls(urls, site?.ga4TrackingCode);
    }

    private async getCachedSEOAnalysis(platform: string, siteId: string, urls: string[]){ 
        const existingAnalysis = await PlatformAnalysis.findOne({platform, siteId})

        // check if the analysis is stale (older than 1hr)
        const isStale = existingAnalysis && (Date.now() - existingAnalysis.updatedAt.getTime() > 3600000); // 1 hour in milliseconds
        
        if(!existingAnalysis || isStale){
            const seoAnalysis = await mapSEOAnalysis(urls)

            // Save all analyses in one document
            await PlatformAnalysis.updateOne(
                { platform, siteId },
                { $set: { analysis: seoAnalysis } },
                { upsert: true }
            );

            return {
                seoAnalysis: {
                    isFresh: true,
                    data: seoAnalysis
                }
            };
        }
        return{
            seoAnalysis: {
            isFresh: false, 
            data: existingAnalysis?.analysis
        }}
    }
}

export const analyticsService = new AnalyticsService