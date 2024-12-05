import mongoose, { model, Schema } from "mongoose";
import { dateUtils } from "../utils/helpers/date";
import { IChat } from "./interfaces/ChatInterface";

const chatSchema = new Schema<IChat>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', },
    visitorId: { type: String },
    title: { type: String },
    messages: [{
        role: { 
            type: String, 
            enum: ['user', 'assistant', 'system'],
            required: true 
        },
        content: { type: String, required: true },
        timestamp: { 
            type: Date, 
            default: () => dateUtils.getCurrentUTCDate() 
        }
    }],
    lastUpdated: { 
        type: Date, 
        default: () => dateUtils.getCurrentUTCDate() 
    },
    archivedAt: { 
        type: Date, 
        default: () => dateUtils.getCurrentUTCDate() 
    },
    isArchived: { 
        type: Boolean, 
        default: false 
    }
});

// TTL index for visitor chats
// auto delete visitor chats after 7 days
chatSchema.index(
    { lastUpdated: 1 }, 
    { 
        expireAfterSeconds: 7 * 24 * 60 * 60,
        partialFilterExpression: { visitorId: { $exists: true } }
    }
);

// Index for faster queries
chatSchema.index({ userId: 1, lastUpdated: -1 });
chatSchema.index({ visitorId: 1, lastUpdated: -1 });

export const Chat = model<IChat>('Chat', chatSchema);