import mongoose, { Schema } from "mongoose";
import { IPostSettings } from "./interfaces/BlogPostInterfaces";

export enum ArticleType {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large'
}

export enum ArticleTypeMaxWords {
    SMALL = 2400,
    MEDIUM = 3600,
    LARGE = 4800
}

export enum AiModel {
    GPT_3_5 = 'gpt-3.5-turbo',
    GPT_4 = 'gpt-4',
    GPT_4O = 'gpt-4o',
    GPT_4O_MINI = 'gpt-4o-mini',
    CLAUDE_3_HAIKU = 'claude-3-haiku',
    CLAUDE_3_SONNET = 'claude-3-sonnet',
    CLAUDE_3_OPUS = 'claude-3-opus'
}

export enum ToneOfVoice {
    FORMAL = 'formal',
    INFORMAL = 'informal',
    CONVERSATIONAL = 'conversational',
    JOKE = 'joke',
    SERIOUS = 'serious',
    FRIENDLY = 'friendly'
}

export enum POV {
    FIRST = 'first person',
    THIRD = 'third person'
}
export const blogPostSettingsSchema = new Schema<IPostSettings>({
    language: { type: String, required: false, default: 'en' },
    articleSize: { type: String, enum: ArticleType, required: false, default: ArticleType.MEDIUM },
    articleMaxWords: { type: Number, required: false, default: ArticleTypeMaxWords.MEDIUM },
    toneOfVoice: { type: String, enum: ToneOfVoice, required: false, default: ToneOfVoice.FRIENDLY },
    aiModel: { type: String, default: AiModel.CLAUDE_3_HAIKU, required: false },
    pointOfView: { type: String, enum: POV, required: false, default: POV.FIRST },
    targetCountry: { type: String, required: false },
    humanizeText: { type: Boolean, required: false, default: true },
    customAPIKey: { type: String, required: false }
})

export const BlogPostSettings = mongoose.model<IPostSettings>('BlogPostSettings', blogPostSettingsSchema)