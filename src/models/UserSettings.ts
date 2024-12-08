import mongoose, {Schema} from "mongoose";
import { IUserSettings } from "./interfaces/UserInterface";

export const userSettingsSchema = new Schema<IUserSettings>({ 
    theme: {type: String, required: false},
    language: {type: String, required: true, default: 'en'},
    business: {
        name: {type: String, required: false},
        description: {type: String, required: false},
        services: {type: [String], required: false},
    }
}, {timestamps: true})

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema)