import { model, Schema } from "mongoose";
import { SYSTEM_PLATFORM } from "./BlogPost";

const platformAnalysisSchema = new Schema({
    platform: { type: String, enum: SYSTEM_PLATFORM, required: true },
    siteId: { type: String, required: true },
    metaTitle: { type: String, required: false },
    metaDescription: { type: String, required: false },
    internalLinks: { type: Number, required: false },
    missingAltTags: { type: Number, required: false },
    aiAnalysis: {
        metaTitle: {
            current: { type: String, required: false },
            recommendations: [{ type: String, required: false }]
        },
        metaDescription: {
            current: { type: String, required: false },
            recommendations: [{ type: String, required: false }]
        },
        internalLinks: {
            current: { type: Number, required: false },
            recommendations: [{ type: String, required: false }]
        },
        missingAltTags: {
            current: { type: Number, required: false },
            recommendations: [{ type: String, required: false }]
        }
    }
}, {
    timestamps: true
});

export const PlatformAnalysis = model('PlatformAnalysis', platformAnalysisSchema);