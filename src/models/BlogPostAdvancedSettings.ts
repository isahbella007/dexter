import mongoose, { Schema } from "mongoose";
import { IAdvancedSettings } from "./interfaces/BlogPostInterfaces";



export const blogPostAdvancedSchema = new Schema<IAdvancedSettings>({
    webConnectivity: {
        enabled: { type: Boolean, default: false },
        searchDepth: { type: String }
    },
    outlineEditor: {
        enabled: { type: Boolean, default: false },
        magicBagEnabled: { type: Boolean, default: false },
        headlines: [{
            text: { type: String },
            order: { type: Number }
        }],
        aiModel: { type: String, default: 'gpt-4-128k-turbo' }
    },
    directory: {
        path: { type: String, default: 'Directory Home' },
        name: { type: String }
    }
});

export const BlogPostAdvancedSettings = mongoose.model<IAdvancedSettings>('BlogPostAdvancedSettings', blogPostAdvancedSchema);
