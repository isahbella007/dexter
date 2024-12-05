import { SubscriptionType } from "../../../models/Subscription";
import { SUBSCRIPTION_LIMITS } from "../subscriptionLimits";
import { ISubscriptionStrategy } from "../subscriptionStrategy.interface";

export class ProStrategy implements ISubscriptionStrategy{
    getAIModel(): string {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].aiModel
    }
    getDailyLimit(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.PRO].dexterDailyLimit
    } 
    
}