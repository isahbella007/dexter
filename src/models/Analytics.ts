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
        total: { type: Number, default: 0 }
    },
    avgDurationScore: {
        total: { type: Number, default: 0 }
    },
    bounceRateScore: {
        total: { type: Number, default: 0 }
    },
    topPagesScore: {
        total: { type: Number, default: 0 }
    },
    megaTagStatusScore: {
        withMetaTags: { type: Number, default: 0 },
        totalUrl: { type: Number, default: 0 }
    },
    totalKeywords: {
        total: { type: Number, default: 0 }
    },
    dashboard: {
        DVS: { type: Number, default: 0 },
        domain: { type: Number, default: 0 },
        website: { type: Number, default: 0 },
        classification: { type: Object, default: {} }
    },
    siteUrl: { type: String, required: true },
    userId: { type: String, required: true }
}, {timestamps: true})

export const AnalyticsModel = model('Analytics', analyticsSchema);
