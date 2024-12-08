import { Domain } from "../../models/Domain";
import { IUser } from "../../models/interfaces/UserInterface";
import { SubscriptionType } from "../../models/Subscription";
import { UsageTracking } from "../../models/UsageTracking";
import { User } from "../../models/User";
import { ErrorBuilder } from "../errors/ErrorBuilder";
import { dateUtils } from "../helpers/date";
import { SubscriptionContext } from "./subscriptionContext";

export class SubscriptionFeatureService {
    private async determineStrategy(userId?: string, visitorId?: string){ 
        if(!userId && visitorId){ 
            const type = SubscriptionType.VISITOR
            return new SubscriptionContext(type)
        }

        if(!userId && !visitorId){ 
            throw ErrorBuilder.badRequest("User ID or visitor cookie ID is required")
        }

        // otherwise get the user subscription type from the database 
        const user = await User.findById(userId).select('subscription')
        if(!user) throw ErrorBuilder.notFound("User not found")
        const validTrialPeriod = await this.checkIfTrialPeriod(user)
    
        if(!validTrialPeriod){ 
            return new SubscriptionContext(user.subscription.type)
        }else{ 
            throw ErrorBuilder.badRequest("Subscription has expired. Please renew your subscription")
        }
        
    }

    async getAIModel(userId?:string, visitorId?:string){ 
        const strategy = await this.determineStrategy(userId, visitorId)
        return strategy.getStrategy().getAIModel()
    }

    private async checkIfTrialPeriod(user:IUser ){ 
        // check for the user and see if their endDate is lesser than the current date. 
        return user.subscription.endDate && user.subscription.endDate < dateUtils.getCurrentUTCDate()
    }

    async canUseDexterAI(userId?:string, visitorId?:string){ 
        const strategy = await this.determineStrategy(userId, visitorId)
        const context = strategy.getStrategy()

        // in here, we want to know if they can use the dexter ai but we need to check their usage first and see if they have gone over their daily count
        // Use UTC date for comparison
        const startOfDay = dateUtils.getStartOfDay();
        
        // Find or create user tracking
        let tracking 
        if(userId){ 
            tracking = await UsageTracking.findOne({userId})
        }else{ 
            tracking = await UsageTracking.findOne({visitorId})
        }
        console.log('tracking found in the can use dexter ai =>', tracking)

        if (!tracking) {
            tracking = new UsageTracking({
                userId,
                visitorId,
                usages: [{
                    date: startOfDay,
                    count: 0
                }]
            });
            await tracking.save()
        }
        const dailyLimit = context.getDailyLimit();
        // Get today's usage
        const todayUsage = tracking.usages.find(usage => 
            dateUtils.isSameUTCDay(usage.date, startOfDay)
        );

        if (!todayUsage) {
            tracking.usages.push({
                date: startOfDay,
                count: 1
            });
            await tracking.save();
            return {
                canUseDexterAI: true,
                message: "You can use Dexter AI",
                dailyLimit: dailyLimit
            };
        }

        
        if (todayUsage.count >= dailyLimit) {
            return { 
                canUseDexterAI: false, 
                message: 'You have exceeded your limit for today',
                dailyLimit: dailyLimit
            };
        }

        return {
            canUseDexterAI: true,
            message: "You can use Dexter AI",
            dailyLimit: dailyLimit
        };
    }

    async incrementUsage(userId?: string, visitorId?: string): Promise<number> {
        const startOfDay = dateUtils.getStartOfDay();
        console.log('visitor id in the increment usage =>', visitorId)
        // First, ensure today's usage record exists
        let tracking 
        if(userId){ 
            tracking = await UsageTracking.findOne({userId})
        }else{ 
            tracking = await UsageTracking.findOne({visitorId})
        }

        console.log('tracking found=>', tracking)
        if (!tracking) {
            // Create new tracking with first usage
            await UsageTracking.create({
                userId,
                visitorId,
                usages: [{
                    date: startOfDay,
                    count: 1
                }]
            });
            return 2;
        }

        // Check if today's usage exists
        const todayUsageIndex = tracking.usages.findIndex(usage => 
            dateUtils.isSameUTCDay(usage.date, startOfDay)
        );

        if (todayUsageIndex === -1) {
            // Add today's usage
            tracking.usages.push({
                date: startOfDay,
                count: 1
            });
            await tracking.save();
            return 2;
        }

        // Increment existing usage count
        tracking.usages[todayUsageIndex].count += 1;
        await tracking.save();

        return tracking.usages[todayUsageIndex].count
    }

    async canAddDomain(userId:string): Promise<{ 
        createDomain: boolean;
        message: string;
    }> { 
        const strategy = await this.determineStrategy(userId)
        const context = strategy.getStrategy()
       
        if(!context.getMaxDomains){ 
            return{ 
                createDomain: false,
                message: 'Visitors cannot add a domain. Please login'
            }
        }
        const maxDomains = context.getMaxDomains()
        // if the user maxDomain is -1 allow them to add as many domains as they want
        if(maxDomains === -1){ 
            return {
                createDomain: true, 
                message: 'Proceed with adding a domain '
            }
        }else{ 
            // check if the user has added a domain already 
            const domainCheck = await Domain.findOne({userId: userId})
            if(domainCheck){ 
                return{ 
                    createDomain: false,
                    message: "You have used up your free domain addition. Please upgrade to continue"
                }
            }else{ 
                return{ 
                    createDomain: true,
                    message: "Proceed with adding a domain"
                }
            }
        }
    }
    async canCreateSinglePost(userId?: string): Promise<{ 
        canCreate: boolean; 
        message: string;
        remainingPosts?: number;
        isTemporary?: boolean;
    }> {
        const strategy = await this.determineStrategy(userId);
        const context = strategy.getStrategy();
        // Skip for visitor strategy which doesn't implement blog methods
        if (!context.getSinglePostLimit) {
            return {
                canCreate: false,
                message: "Visitors cannot create posts", 
                remainingPosts: 0
            };
        }

        const limit = context.getSinglePostLimit();
       
        if(limit === -1){ 
            return {
                canCreate: true,
                message: "You can create a post",
                remainingPosts: limit, 
                isTemporary: false
            }
        }else{ 
            // this means they are a free user so we want to check if they have done a single blog post before
            const user = await User.findById(userId)
            if(!user){ 
                throw ErrorBuilder.notFound("User not found")
            }
            if(user.singleBlogPostCount == 1){ 
                return {
                    canCreate: false,
                    message: "You cannot create more single blog posts because you are on the free plan. Please upgrade to a paid plan to continue",
                    remainingPosts: 0, 
                    isTemporary: false
                }
            }else{ 
                return {
                    canCreate: true,
                    message: "You can create a post",
                    remainingPosts: limit, 
                    isTemporary: true
                }
            }

        }
    } 

    async canCreateBulkPosts(userId?: string): Promise<{
        canCreate: boolean;
        message: string;
        remainingBulk?: number;
        postsPerBulk?: number;
        isTemporary?: boolean;
    }> {
        const strategy = await this.determineStrategy(userId);
        const context = strategy.getStrategy();

        if (!context.getBulkPostAccess) {
            return {
                canCreate: false,
                message: "Visitors cannot create bulk posts"
            };
        }

        const access = context.getBulkPostAccess();
        if (access === 'none') {
            return {
                canCreate: false,
                message: "Your plan doesn't support bulk post creation"
            };
        }

        if(access == 'demo'){ 
            // here I need to check if the user has already generated a blog post that is in temp that is, demo
        }

        return {
            canCreate: true,
            message: "You can create bulk posts",
            remainingBulk: context.getMaxBulkPosts?.() ?? 0,
            postsPerBulk: context.getPostsPerBulk?.() ?? 0,
            isTemporary: false
        };
    }

    async getMaxKeywords(userId?: string): Promise<number>{ 
        const strategy = await this.determineStrategy(userId)
        const context = strategy.getStrategy()

        if(!context.getMaxKeywords){ 
            throw ErrorBuilder.badRequest("This plan doesn't support keyword generation")
        }
        return context.getMaxKeywords()
    }
}

export const subscriptionFeatureService = new SubscriptionFeatureService()