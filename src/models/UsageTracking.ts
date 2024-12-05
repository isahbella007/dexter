import mongoose, { model, Schema } from "mongoose";
import { User } from "./User";
import { dateUtils } from "../utils/helpers/date";
import { IUsageTracking } from "./interfaces/UsageInterface";

const UsageTrackingSchema = new Schema<IUsageTracking>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: User, required: false }, 
    visitorId: { type: String, required: false }, 
    usages: [{
        date: { 
            type: Date,
            default: () => dateUtils.getCurrentUTCDate()
        },
        count: {
            type: Number,
            default: 0
        }
    }],
    lastUpdated: {
        type: Date,
        default: () => dateUtils.getCurrentUTCDate()
    }
}, { timestamps: true })

// Maintain only last 30 days of usage
UsageTrackingSchema.pre('save', function(next) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    
    this.usages = this.usages.filter(usage => 
        usage.date > thirtyDaysAgo
    );
    
    this.lastUpdated = dateUtils.getCurrentUTCDate();
    next();
});

export const UsageTracking = model<IUsageTracking>('UsageTracking', UsageTrackingSchema)
