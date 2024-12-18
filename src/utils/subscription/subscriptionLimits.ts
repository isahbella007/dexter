import { SubscriptionType } from "../../models/Subscription";

interface ISubscriptionLimits{ 
    type: SubscriptionType, 
    dexterDailyLimit: number,
    aiModel: string,
    maxDomains: number; 
    maxPlatforms: number;
    singlePostGeneration: number;
    isTemporary: boolean;
    maxKeywords: number;
    maxBulkGenerationUse: number
    userPlan: string
    // add more as needed 
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionType, ISubscriptionLimits> = {
    [SubscriptionType.VISITOR]: {
        type: SubscriptionType.VISITOR,
        dexterDailyLimit: 3, 
        aiModel: 'gpt-3.5-turbo', 
        maxDomains: 0,
        maxPlatforms: 0,
        singlePostGeneration: 0,
        isTemporary: true, 
        maxKeywords: 0,
        maxBulkGenerationUse: 0,
        userPlan: 'visitor'
    },
    [SubscriptionType.FREE]: {
        type: SubscriptionType.FREE,
        dexterDailyLimit: 10, //!!TODO: change this to 10
        aiModel: 'gpt-3.5-turbo',
        maxDomains: 1,
        maxPlatforms: 1,
        singlePostGeneration: 1,
        isTemporary: true, 
        maxKeywords: 2,
        maxBulkGenerationUse: 1,
        userPlan: 'free'
    },
    [SubscriptionType.PRO]: {
        type: SubscriptionType.PRO,
        dexterDailyLimit: 100, //!!TODO: change this to 100
        aiModel: 'gpt-4',
        maxDomains: -1, // unlimited
        maxPlatforms: -1, // unlimited
        singlePostGeneration: -1, // unlimited
        isTemporary: false, 
        maxKeywords: 10,
        maxBulkGenerationUse: -1,
        userPlan: 'pro'
    }
};