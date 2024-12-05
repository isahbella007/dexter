import { SubscriptionType } from "../../../models/Subscription";
import { SUBSCRIPTION_LIMITS } from "../subscriptionLimits";
import { ISubscriptionStrategy } from "../subscriptionStrategy.interface";

export class VisitorStrategy implements ISubscriptionStrategy{
    getAIModel(): string {
        return SUBSCRIPTION_LIMITS[SubscriptionType.VISITOR].aiModel
    }
    getDailyLimit(): number {
        return SUBSCRIPTION_LIMITS[SubscriptionType.VISITOR].dexterDailyLimit
    }
}