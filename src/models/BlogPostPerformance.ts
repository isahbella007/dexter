import mongoose, { Schema } from "mongoose";
import { IPerformanceMetrics } from "./interfaces/BlogPostInterfaces";

export const blogPostPerformanceSchema = new Schema<IPerformanceMetrics>({
    organicTraffic: {type: Number, required: true},
    pagesPerSession: {type: Number, required: true},
    bounceRate: {type: Number, required: true},
    averagePosition: {type: Number, required: true},
    crawlErrors: {type: Number, required: true}
})

export const BlogPostPerformance = mongoose.model<IPerformanceMetrics>('BlogPostPerformance', blogPostPerformanceSchema)