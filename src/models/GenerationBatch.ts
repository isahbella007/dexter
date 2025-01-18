import mongoose from 'mongoose';
import { IGenerationBatch } from './interfaces/BlogPostInterfaces';



const GenerationBatchSchema = new mongoose.Schema<IGenerationBatch>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalArticles: { type: Number, required: true },
    completedArticles: { type: Number, default: 0 },
    status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    articles: [{
        mainKeyword: { type: String, required: true },
        title: { type: String, required: true },
        keywords: { type: [String], required: true },
        status: { type: String, enum: ['pending', 'generating', 'ready', 'failed'], default: 'pending' }
    }],
    startedAt: { type: Date, default: Date.now },
    completedAt: Date
});

export const GenerationBatch = mongoose.model('batchGeneration', GenerationBatchSchema); 