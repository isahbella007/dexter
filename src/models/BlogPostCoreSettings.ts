import mongoose, { Schema } from "mongoose";
import { IPostSettings } from "./interfaces/BlogPostInterfaces";

export enum ArticleType {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large'
}

export enum ArticleTypeMaxWords{
    SMALL = 2400,
    MEDIUM = 3600,
    LARGE = 4800
}

export enum AiModel{
    GPT_3_5 = 'gpt-3.5-turbo',
    GPT_4 = 'gpt-4',
    GPT_4O = 'gpt-4o',
    GPT_4O_MINI = 'gpt-4o-mini'
}

export enum ToneOfVoice{
    FORMAL = 'formal',
    INFORMAL = 'informal',
    CONVERSATIONAL = 'conversational',
    JOKE = 'joke',
    SERIOUS = 'serious',
    FRIENDLY = 'friendly'
}

export enum POV{
    FIRST = 'first person',
    THIRD = 'third person'
}
export const blogPostSettingsSchema = new Schema<IPostSettings>({
    language: {type: String, required: true, default: 'en'},
    articleSize: {type: String, enum: ArticleType, required: true, default: ArticleType.MEDIUM},
    articleMaxWords: {type: Number, required: true, default: ArticleTypeMaxWords.MEDIUM},
    toneOfVoice: {type: String, enum: ToneOfVoice, required: true, default: ToneOfVoice.FRIENDLY},
    aiModel: {type: String, default: AiModel.GPT_3_5, required: true},
    pointOfView: {type: String, enum: POV, required: true, default: POV.FIRST},
    targetCountry: {type: String, required: true},
    humanizeText: {type: Boolean, required: true, default: true},
    customAPIKey: {type: String, required: false}
})

export const BlogPostSettings = mongoose.model<IPostSettings>('BlogPostSettings', blogPostSettingsSchema)