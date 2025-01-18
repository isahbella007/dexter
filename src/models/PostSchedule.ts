import mongoose from 'mongoose';
import { PUBLISH_STATUS, SYSTEM_PLATFORM } from './BlogPost';

export interface PostSchedule { 
    userId: string;
    blogPostId: string;
    siteId?: string;
    platform: SYSTEM_PLATFORM;
    scheduledDate: Date;
    status: PUBLISH_STATUS;
    error?: string;
    processingLock?: Date;
}

const postScheduleSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  blogPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true },
  siteId: { type: String, required: false },
  platform: { 
    type: String, 
    enum: Object.values(SYSTEM_PLATFORM),
    required: true 
  },
  scheduledDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: Object.values(PUBLISH_STATUS),
    default: PUBLISH_STATUS.pending
  },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  processingLock: { type: Date }
});

export const PostSchedule = mongoose.model('PostSchedule', postScheduleSchema); 