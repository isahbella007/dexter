import mongoose, { Schema } from "mongoose";
import { ILinkingSettings } from "./interfaces/BlogPostInterfaces";



export const blogPostLinkingSchema = new Schema<ILinkingSettings>({
    internal: {
        enabled: { type: Boolean, default: false },
        wordpressSite: { type: String },
        autoIndex: { type: Boolean, default: true }
    },
    external: {
        enabled: { type: Boolean, default: false },
        linkType: { type: String },
        manualLinks: [{ type: String }],
        autoIntegrate: { type: Boolean, default: true }
    }
});

export const BlogPostLinkingSettings = mongoose.model<ILinkingSettings>('BlogPostLinkingSettings', blogPostLinkingSchema);
