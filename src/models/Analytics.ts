import mongoose, { Schema, model } from 'mongoose';

interface IAnalyticsData {
    pageVisitsScore: {
        organic: number;
        total: number;
    };
    avgDurationScore: {
        organic: number;
        total: number;
    };
    bounceRateScore: {
        organic: number;
        total: number;
    };
    topPagesScore: {
        organic: number;
        total: number;
    };
    megaTagStatusScore: {
        withMetaTags: number;
        totalUrl: number;
    };
    totalKeywords: {
        organic: number;
        total: number;
    };
    siteUrl: string; // To associate the data with a specific site
    userId: string; // To associate the data with a specific user
}


const analyticsSchema = new Schema({
    pageVisitsScore: {
        organic: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    avgDurationScore: {
        organic: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    bounceRateScore: {
        organic: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    topPagesScore: {
        organic: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    megaTagStatusScore: {
        withMetaTags: { type: Number, default: 0 },
        totalUrl: { type: Number, default: 0 }
    },
    totalKeywords: {
        organic: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    siteUrl: { type: String, required: true },
    userId: { type: String, required: true }
}, {timestamps: true})

export const AnalyticsModel = model('Analytics', analyticsSchema);
