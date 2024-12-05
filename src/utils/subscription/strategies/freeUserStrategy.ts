import { SubscriptionType } from "../../../models/Subscription";
import { SUBSCRIPTION_LIMITS } from "../subscriptionLimits";
import { ISubscriptionStrategy } from "../subscriptionStrategy.interface";

export class FreeStrategy implements ISubscriptionStrategy{
    getAIModel(): string {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].aiModel
    }
    getDailyLimit(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.FREE].dexterDailyLimit
    } 
}