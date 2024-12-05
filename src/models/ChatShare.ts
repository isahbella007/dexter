import mongoose, { Schema } from 'mongoose';

const chatShareSchema = new Schema({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shareToken: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    accessCount: {
        type: Number,
        default: 0
    },
    isRevoked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const ChatShare = mongoose.model('ChatShare', chatShareSchema); 