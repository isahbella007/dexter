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
    tokenVersion: number;
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
    oauth?: { 
      wordpress: {
        accessToken: string, 
        tokenType: string, 
        scope: string,
        // tokens are long lived
      }, 
      wix: {
        accessToken: string,
        accessTokenExpires: Date,
        refreshToken: string, 
        tokenType: string, 
        scope: string,
        memberId: string,
        contactId: string,
        authSession: IWixAuthSession
      },
      google: {
        accessToken: string,
        refreshToken: string,
        expiryDate: number,
        connected: boolean
      },
      shopify: [{
        accessToken: string,
        storeName: string
      }]
    }
    platforms?:{
      wordpress?: IWordPressPlatform
    } 
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

export interface IWordPressSite {
  siteId: number;  // Changed to number since the ID comes as a number
  name: string;
  url: string | null;  // Allow null for pending sites
  ga4TrackingCode: string | null;
}

export interface IWordPressPlatform {
  sites: IWordPressSite[];
}

export interface IWixAuthSession {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  timestamp: Date;
  expiresAt: Date;
}
