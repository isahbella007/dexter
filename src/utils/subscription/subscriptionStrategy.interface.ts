export interface ISubscriptionStrategy {
    getDailyLimit(): number;
    getAIModel(): string; 
    getUserPlan?(): string;

    // blog related methods
    getMaxDomains?(): number;
    getMaxPlatforms?(): number;
    getSinglePostLimit?(): number;
    isContentTemporary?(): boolean;

    // blog related methods keyword generation 
    getMaxKeywords?(): number;
    getMaxBulkGenerationUse?(): number;
}