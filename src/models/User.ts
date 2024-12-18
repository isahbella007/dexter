import { model, Schema } from "mongoose";
import bcrypt from 'bcrypt';
import { subscriptionSchema } from "./Subscription";
import { IUser } from "./interfaces/UserInterface";
import { userSettingsSchema } from "./UserSettings";

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