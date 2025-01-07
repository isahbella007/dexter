import { model, Schema } from "mongoose"

export interface IToken{ 
    accessToken: string
    refreshToken: string
    platform: string
    accountId?: string
    expiresAt: Date
}

const tokenSchema = new Schema<IToken>({
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    platform: { type: String, required: true },
    accountId: { type: String, required: false },
    expiresAt: { type: Date, required: true }
})

export const PlatformToken = model<IToken>('PlatformToken', tokenSchema)
