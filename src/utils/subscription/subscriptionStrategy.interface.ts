export interface ISubscriptionStrategy {
    getDailyLimit(): number;
    getAIModel(): string
}