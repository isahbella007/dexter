import { SubscriptionType } from "../../../models/Subscription";
import { SUBSCRIPTION_LIMITS } from "../subscriptionLimits";
import { ISubscriptionStrategy } from "../subscriptionStrategy.interface";

export class ProStrategy implements ISubscriptionStrategy{
    getAIModel(): string {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].aiModel;
    }
    getDailyLimit(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].dexterDailyLimit;
    }
    getMaxDomains(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].maxDomains;
    }
    getMaxPlatforms(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].maxPlatforms;
    }
    getSinglePostLimit(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].singlePostGeneration;
    }
    isContentTemporary(): boolean {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].isTemporary;
    }
    getMaxKeywords(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].maxKeywords;
    }
    getMaxBulkGenerationUse(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].maxBulkGenerationUse;
    }
    
}