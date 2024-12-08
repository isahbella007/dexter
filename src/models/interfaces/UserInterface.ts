import { ISubscription } from "./SubscriptionInterface";

export interface IUser extends Document{ 
    _id: string;
    stripeCustomerId?: string;
    email: string;
    password: string;
    mfa: {
        enabled: boolean;
        secret?: string;
        backupCodes?: string[];
      };
    mfaToken?: string;
    isEmailVerified: boolean;
    emailVerificationToken?: string; 
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    subscription: ISubscription;
    settings: IUserSettings;
    ipAddress?: string;
    visitorId?: string;
    singleBlogPostCount: number;
    comparePassword(password:string): Promise<boolean>
}

export interface IUserSettings extends Document {
    _id: string;
    user: IUser;
    theme: string, 
    language: string, 
    business: { 
      name: string, 
      description: string, 
      services: string[],
    }
}
