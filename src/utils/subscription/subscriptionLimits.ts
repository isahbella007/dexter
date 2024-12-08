import { SubscriptionType } from "../../models/Subscription";

interface ISubscriptionLimits{ 
    type: SubscriptionType, 
    dexterDailyLimit: number,
    aiModel: string,
    maxDomains: number; 
    maxPlatforms: number;
    singlePostGeneration: number;
    bulkPostAccess: 'none' | 'demo' | 'full';
    maxBulkPosts: number;
    postsPerBulk: number;
    maxDailyPosts: number;
    isTemporary: boolean;
    maxKeywords: number;
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
        bulkPostAccess: 'none',
        maxBulkPosts: 0,
        postsPerBulk: 0,
        maxDailyPosts: 0,
        isTemporary: true, 
        maxKeywords: 0,
    },
    [SubscriptionType.FREE]: {
        type: SubscriptionType.FREE,
        dexterDailyLimit: 10, //!!TODO: change this to 10
        aiModel: 'gpt-3.5-turbo',
        maxDomains: 1,
        maxPlatforms: 1,
        singlePostGeneration: 1,
        bulkPostAccess: 'demo',
        maxBulkPosts: 10,
        postsPerBulk: 10,
        maxDailyPosts: 10,
        isTemporary: true, 
        maxKeywords: 2,
    },
    [SubscriptionType.PRO]: {
        type: SubscriptionType.PRO,
        dexterDailyLimit: 100, //!!TODO: change this to 100
        aiModel: 'gpt-4',
        maxDomains: -1, // unlimited
        maxPlatforms: -1, // unlimited
        singlePostGeneration: -1, // unlimited
        bulkPostAccess: 'full',
        maxBulkPosts: 100,
        postsPerBulk: 10,
        maxDailyPosts: 100,
        isTemporary: false, 
        maxKeywords: 10,
    }
};