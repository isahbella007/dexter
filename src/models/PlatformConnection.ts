import mongoose, { Schema, model } from 'mongoose';

export interface IPlatformConnection {
    _id: string;
    domainId: mongoose.Schema.Types.ObjectId | string;
    platform: 'wordpress' | 'shopify' | 'wix';
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    webhookUrl?: string;
    isActive: boolean;
    lastSynced?: Date;
    connectionStatus: 'connected' | 'disconnected' | 'error';
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const platformConnectionSchema = new Schema<IPlatformConnection>({
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
    platform: { 
        type: String, 
        enum: ['wordpress', 'shopify', 'wix'], 
        required: true 
    },
    apiKey: { type: String },
    apiSecret: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String },
    webhookUrl: { type: String },
    isActive: { type: Boolean, default: true },
    lastSynced: { type: Date },
    connectionStatus: { 
        type: String, 
        enum: ['connected', 'disconnected', 'error'],
        default: 'disconnected'
    },
    errorMessage: { type: String }
}, { timestamps: true });

// export const PlatformConnection = model<IPlatformConnection>('PlatformConnection', platformConnectionSchema);
