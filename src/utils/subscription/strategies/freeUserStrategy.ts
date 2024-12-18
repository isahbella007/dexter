import { SubscriptionType } from "../../../models/Subscription";
import { SUBSCRIPTION_LIMITS } from "../subscriptionLimits";
import { ISubscriptionStrategy } from "../subscriptionStrategy.interface";

export class FreeStrategy implements ISubscriptionStrategy{
    getAIModel(): string {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].aiModel;
    }
    getDailyLimit(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].dexterDailyLimit;
    }
    getMaxDomains(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].maxDomains;
    }
    getMaxPlatforms(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].maxPlatforms;
    }
    getSinglePostLimit(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].singlePostGeneration;
    }
    isContentTemporary(): boolean {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].isTemporary;
    }
    getMaxKeywords(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].maxKeywords;
    }
    getMaxBulkGenerationUse(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].maxBulkGenerationUse;
    }
    getUserPlan(): string {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].userPlan;
    }

}