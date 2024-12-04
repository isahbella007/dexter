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
    comparePassword(password:string): Promise<boolean>
}