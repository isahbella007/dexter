import { model, Schema } from "mongoose";
import bcrypt from 'bcrypt';
import { subscriptionSchema } from "./Subscription";
import { IUser } from "./interfaces/UserInterface";
import { userSettingsSchema } from "./UserSettings";

// WordPress site schema
const WordPressSiteSchema = new Schema({
    siteId: { type: Number, required: true },
    name: { type: String, required: true },
    url: { type: String, default: null },
    ga4TrackingCode: { type: String, default: null } //TODO:: consider encrypting ewoooo
}, { _id: false });
  
// WordPress platform schema
const WordPressPlatformSchema = new Schema({
    sites: [WordPressSiteSchema]    
}, { _id: false });

const WixAuthSessionSchema = new Schema({
    codeVerifier: { type: String },
    codeChallenge: { type: String },
    state: { type: String },
    timestamp: { type: Date, default: Date.now },
    expiresAt: { type: Date }
}, { _id: false });

const userSchema = new Schema<IUser>(
    { 
        stripeCustomerId: { type: String },
        email: {type: String, required: true, unique:true}, 
        ipAddress: String,
        visitorId: String,
        password: {type:String, required: true},
        mfa: {
            enabled: {type: Boolean, default: false  }, 
            secret: {type: String, required: false}, 
            backupCodes: {type: [String], required: false}
        },
        tokenVersion: {type: Number, default: 0},
        isEmailVerified: {type: Boolean, required: false, default: true}, //!!TODO: set this back to false when you have worked on the email sending 
        emailVerificationToken: { type: String },
        emailVerificationExpires: { type: Date},
        passwordResetToken: { type: String},
        passwordResetExpires: { type: Date},
        singleBlogPostCount: Number,
        oauth: {
            wordpress: {
                accessToken: {type: String, required: false}, 
                tokenType: {type: String, required: false}, 
                scope: {type: String, required: false}
            },
            wix: {
                accessToken: {type: String, required: false}, 
                accessTokenExpires: {type: Date, required: false},
                refreshToken: {type: String, required: false}, 
                tokenType: {type: String, required: false}, 
                scope: {type: String, required: false}, 
                memberId: {type: String, required: false},
                contactId: {type: String, required: false},
                authSession:WixAuthSessionSchema
            },
            google: {
                accessToken: {type: String, required: false}, 
                refreshToken: {type: String, required: false}, 
                expiryDate: {type: Number, required: false},
                connected: {type: Boolean, required: false}
            }, 
            shopify: [{
                accessToken: {type: String, required: false}, 
                storeName: {type: String, required: false}
            }]
        },
        platforms: {
            wordpress: WordPressPlatformSchema
        },
        subscription: { type: subscriptionSchema, default: () => ({}) },
        settings: { type: userSettingsSchema, default: () => ({}) },
    }
)


userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.mfa;
    delete userObject.emailVerificationToken;
    delete userObject.passwordResetToken;
    delete userObject.stripeCustomerId;
    delete userObject.tokenVersion;
    delete userObject.oauth;
    // delete userObject.platforms;
    // Remove payment and status history from subscription
    if (userObject.subscription) {
        delete userObject.subscription.paymentHistory;
        delete userObject.subscription.statusHistory;
        delete userObject.subscription.startDate;
        delete userObject.subscription.createdAt;
        delete userObject.subscription.updatedAt;
    }
    return userObject;
}

userSchema.methods.comparePassword = async function (password: string): Promise<boolean>{ 
    return bcrypt.compare(password, this.password)
}

export const User =  model<IUser>('User', userSchema)