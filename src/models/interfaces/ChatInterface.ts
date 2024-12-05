import mongoose from "mongoose";

export interface IMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface IChat {
    _id: string;
    userId?: string | mongoose.Schema.Types.ObjectId;
    visitorId?: string;
    title?: string;
    messages: IMessage[];
    lastUpdated: Date;
    archivedAt: Date;
    isArchived: boolean;
}