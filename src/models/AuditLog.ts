import mongoose, { Document, Schema, Types } from 'mongoose';

interface IChange {
    field: string;
    oldValue: any;
    newValue: any;
}

export interface IAuditLog extends Document {
    user: Types.ObjectId; // The user that was modified
    admin: Types.ObjectId; // The admin user who made the modification
    changes: IChange[];
    createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Reference the User model
    changes: [{
        field: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed }, // Can be any type
        newValue: { type: Schema.Types.Mixed }, // Can be any type
    }],
    createdAt: { type: Date, default: Date.now }
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema); 