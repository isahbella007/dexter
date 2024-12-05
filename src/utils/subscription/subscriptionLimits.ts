import { SubscriptionType } from "../../models/Subscription";

interface ISubscriptionLimits{ 
    type: SubscriptionType, 
    dexterDailyLimit: number,
    aiModel: string,
    // add more as needed 
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionType, ISubscriptionLimits> = {
    [SubscriptionType.VISITOR]: {
        type: SubscriptionType.VISITOR,
        dexterDailyLimit: 3, 
        aiModel: 'gpt-3.5-turbo'
    },
    [SubscriptionType.FREE]: {
        type: SubscriptionType.FREE,
        dexterDailyLimit: 10, //!!TODO: change this to 10
        aiModel: 'gpt-3.5-turbo',
    },
    [SubscriptionType.PRO]: {
        type: SubscriptionType.PRO,
        dexterDailyLimit: 100, //!!TODO: change this to 100
        aiModel: 'gpt-4'
    }
};