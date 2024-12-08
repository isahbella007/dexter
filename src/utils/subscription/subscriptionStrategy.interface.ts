export interface ISubscriptionStrategy {
    getDailyLimit(): number;
    getAIModel(): string; 

    // blog related methods
    getMaxDomains?(): number;
    getMaxPlatforms?(): number;
    getSinglePostLimit?(): number;
    getBulkPostAccess?(): 'none' | 'demo' | 'full';
    getMaxBulkPosts?(): number;
    getPostsPerBulk?(): number;
    getMaxDailyPosts?(): number;
    isContentTemporary?(): boolean;

    // blog related methods keyword generation 
    getMaxKeywords?(): number;
}