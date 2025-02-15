import mongoose, { model, Schema } from "mongoose";
import { SYSTEM_PLATFORM } from "./BlogPost";

const siteAnalysisSchema = new Schema({
    siteId: { type: mongoose.Schema.Types.Mixed, required: true },
    analysis: {
        aiAnalysis: { type: Schema.Types.Mixed, required: true }, // Flexible object for any field
        lastScraped: { type: Date, default: Date.now } // Track the last time the site was scraped
    }
}, {
    timestamps: true
});


export const SiteAnalysis = model('SiteAnalysis', siteAnalysisSchema);