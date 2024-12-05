export interface IUsageDay {
    date: Date;
    count: number;
}

export interface IUsageTracking {
    userId?: string;
    visitorId?: string;
    usages: IUsageDay[];
    lastUpdated: Date;
}