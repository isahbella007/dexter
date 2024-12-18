import mongoose, { Schema } from "mongoose";
import { IMediaSettings } from "./interfaces/BlogPostInterfaces";

export const blogPostMediaSchema = new Schema<IMediaSettings>({
    includeImages: { type: Boolean, default: true },    
    imageCount: { type: Number, default: 1 },
    imageStyle: { type: String },
    imageSizes: { type: String },
    keywordInFirstImage: { type: Boolean, default: false },
    customInstructions: { type: String },
    includeVideos: { type: Boolean, default: false },
    videoCount: { type: Number, default: 0 },
    autoPlacement: { type: Boolean, default: false },
    layoutOptions: { type: String }
})

export const BlogPostMediaSettings = mongoose.model<IMediaSettings>('BlogPostMediaSettings', blogPostMediaSchema)