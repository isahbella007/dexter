import mongoose, { Schema, model } from 'mongoose';
import { IPlatformConnection } from './PlatformConnection';

export interface IDomain {
    _id: string;
    url: string;
    userId: mongoose.Schema.Types.ObjectId | string;
    name?: string;
    description?: string;
    platformConnections?: IPlatformConnection[];
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const domainSchema = new Schema<IDomain>({
    url: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String },
    description: { type: String },
    platformConnections: [{ type: Schema.Types.ObjectId, ref: 'PlatformConnection' }],
    isVerified: { type: Boolean, default: false },
}, { timestamps: true });

export const Domain = model<IDomain>('Domain', domainSchema);
