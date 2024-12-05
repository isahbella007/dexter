import { model, Schema } from "mongoose";
import bcrypt from 'bcrypt';
import { subscriptionSchema } from "./Subscription";
import { IUser } from "./interfaces/UserInterface";

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
        isEmailVerified: {type: Boolean, required: false, default: false},
        emailVerificationToken: { type: String },
        emailVerificationExpires: { type: Date},
        passwordResetToken: { type: String},
        passwordResetExpires: { type: Date},
        subscription: { type: subscriptionSchema, default: () => ({}) },
    }
)

// Prevent multiple accounts from same IP
userSchema.pre('save', async function(next) {
    if (this.isNew && this.ipAddress) {
        const existingUser = await User.findOne({ ipAddress: this.ipAddress });
        if (existingUser) {
            throw new Error('An account already exists from this IP address');
        }
    }
    next();
});

userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.mfa;
    delete userObject.emailVerificationToken;
    delete userObject.passwordResetToken;
    delete userObject.stripeCustomerId;
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