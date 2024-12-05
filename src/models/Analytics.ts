import mongoose, { Schema, model } from 'mongoose';

export interface IAnalytics {
    _id: string;
    domainId: mongoose.Schema.Types.ObjectId | string;
    userId: mongoose.Schema.Types.ObjectId | string;
    seoScores: {
        totalKeywordsScore: number;
        metaTagStatusScore: number;
        topPagesScore: number;
        pageVisitsScore: number;
        averageVisitDurationScore: number;
        bounceRateScore: number;
    };
    visibilityScore: number;
    keywordAnalysis: {
        totalKeywords: number;
        keywordPositions: Map<string, number>;
        historicalData: [{
            date: Date;
            keywordCount: number;
            averagePosition: number;
        }];
    };
    engagement: {
        pageVisits: number;
        averageVisitDuration: number;
        bounceRate: number;
        exitPages: string[];
    };
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>({
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seoScores: {
        totalKeywordsScore: { type: Number, default: 0 },
        metaTagStatusScore: { type: Number, default: 0 },
        topPagesScore: { type: Number, default: 0 },
        pageVisitsScore: { type: Number, default: 0 },
        averageVisitDurationScore: { type: Number, default: 0 },
        bounceRateScore: { type: Number, default: 0 }
    },
    visibilityScore: { type: Number, default: 0 },
    keywordAnalysis: {
        totalKeywords: { type: Number, default: 0 },
        keywordPositions: { 
            type: Map,
            of: Number,
            default: new Map()
        },
        historicalData: [{
            date: { type: Date },
            keywordCount: { type: Number },
            averagePosition: { type: Number }
        }]
    },
    engagement: {
        pageVisits: { type: Number, default: 0 },
        averageVisitDuration: { type: Number, default: 0 },
        bounceRate: { type: Number, default: 0 },
        exitPages: [{ type: String }]
    },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

export const Analytics = model<IAnalytics>('Analytics', analyticsSchema);
