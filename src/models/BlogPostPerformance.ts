import mongoose, { Schema } from "mongoose";
import { IPerformanceMetrics } from "./interfaces/BlogPostInterfaces";

export const blogPostPerformanceSchema = new Schema<IPerformanceMetrics>({
    organicTraffic: {type: Number, required: false},
    pagesPerSession: {type: Number, required: false},
    bounceRate: {type: Number, required: false},
    averagePosition: {type: Number, required: false},
    crawlErrors: {type: Number, required: false}
})

export const BlogPostPerformance = mongoose.model<IPerformanceMetrics>('BlogPostPerformance', blogPostPerformanceSchema)