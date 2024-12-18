import mongoose, { Schema } from "mongoose";
import { IStructureSettings } from "./interfaces/BlogPostInterfaces";

export const blogPostStructureSchema = new Schema<IStructureSettings>({
    includeHook: { type: Boolean, default: true },
    includeConclusion: { type: Boolean, default: true },
    includeTables: { type: Boolean, default: false },
    includeH3: { type: Boolean, default: true },
    includeLists: { type: Boolean, default: true },
    includeItalics: { type: Boolean, default: true },
    includeQuotes: { type: Boolean, default: true },
    includeKeyTakeaway: { type: Boolean, default: true },
    includeFAQ: { type: Boolean, default: true },
    includeBold: { type: Boolean, default: true },
    includeBulletpoints: { type: Boolean, default: true }
})

export const BlogPostStructure = mongoose.model<IStructureSettings>('BlogPostStructure', blogPostStructureSchema)
