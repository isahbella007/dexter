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

        // otherwise get the user subscription type from the database 
        const user = await User.findById(userId).select('subscription')
        if(!user) throw ErrorBuilder.notFound("User not found")
            console.log('stratrgy selected => ', user.subscription.type )
        return new SubscriptionContext(user.subscription.type)
    }

    async getAIModel(userId?:string, visitorId?:string){ 
        const strategy = await this.determineStrategy(userId, visitorId)
        return strategy.getStrategy().getAIModel()
    }

    async canUseDexterAI(userId?:string, visitorId?:string){ 
        const strategy = await this.determineStrategy(userId, visitorId)
        const context = strategy.getStrategy()

        // in here, we want to know if they can use the dexter ai but we need to check their usage first and see if they have gone over their daily count
        // Use UTC date for comparison
        const startOfDay = dateUtils.getStartOfDay();
        
        // Find or create user tracking
        let tracking = await UsageTracking.findOne({ 
            $or: [{ userId }, { visitorId }]
        });

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

        // Get today's usage
        const todayUsage = tracking.usages.find(usage => 
            dateUtils.isSameUTCDay(usage.date, startOfDay)
        );

        if (!todayUsage) {
            tracking.usages.push({
                date: startOfDay,
                count: 0
            });
            await tracking.save();
            return {
                canUseDexterAI: true,
                message: "You can use Dexter AI",
                remainingUsage: context.getDailyLimit()
            };
        }

        const dailyLimit = context.getDailyLimit();
        if (todayUsage.count >= dailyLimit) {
            return { 
                canUseDexterAI: false, 
                message: 'You have exceeded your limit for today',
                remainingUsage: 0
            };
        }

        return {
            canUseDexterAI: true,
            message: "You can use Dexter AI",
            remainingUsage: dailyLimit - todayUsage.count
        };
    }

    async incrementUsage(userId?: string, visitorId?: string): Promise<void> {
        const startOfDay = dateUtils.getStartOfDay();
        
        // First, ensure today's usage record exists
        const tracking = await UsageTracking.findOne({
            $or: [{ userId }, { visitorId }]
        });

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
            return;
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
            return;
        }

        // Increment existing usage count
        tracking.usages[todayUsageIndex].count += 1;
        await tracking.save();
    }
}

export const subscriptionFeatureService = new SubscriptionFeatureService()