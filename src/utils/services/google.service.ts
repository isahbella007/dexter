import {google} from 'googleapis'
import {OAuth2Client} from 'google-auth-library'
import { config } from '../../config';
import { User } from '../../models/User';

export class GoogleOAuthHandler {
    private CLIENT_ID: string;
    private CLIENT_SECRET: string;
    private REDIRECT_URI: string;
    private SCOPES: string[];
    private oAuth2Client: OAuth2Client;
   

    constructor() {
      // You'll get these values from Google Cloud Console
      this.CLIENT_ID = config.google.clientId;
      this.CLIENT_SECRET = config.google.clientSecret;
      // this.REDIRECT_URI = config.google.productionRedirectUri; // Change in production
      this.REDIRECT_URI = config.google.developmentRedirectUri;
  
      this.oAuth2Client = new OAuth2Client(
        this.CLIENT_ID,
        this.CLIENT_SECRET,
        this.REDIRECT_URI
      );

      // Define the scopes you need
      this.SCOPES = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        // Add other scopes as needed, for example:
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics.edit',
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/webmasters'
      ];
    }
  
    // Generate the authorization URL
    async getAuthorizationUrl(state: string) {
      return this.oAuth2Client.generateAuthUrl({
        access_type: 'offline', // This will give us a refresh token
        scope: this.SCOPES,
        prompt: 'consent',
        state: state
      });
    }
  
    // Exchange the code for tokens
    async handleCallBack(code: any, userId: string) {
      try {
        
        const { tokens } = await this.oAuth2Client.getToken(code);
        this.oAuth2Client.setCredentials(tokens);

        console.log('these are the tokens we got -> google', tokens)
        // update the user with the tokens 
        await User.findByIdAndUpdate(userId, {
            $set: {
              'oauth.google.accessToken': tokens.access_token,
              'oauth.google.refreshToken': tokens.refresh_token,
              'oauth.google.expiryDate': tokens.expiry_date,
              'oauth.google.connected': true
            }
          });
        return tokens;
      } catch (error) {
        console.error('Error getting tokens:', error);
        throw error;
      }
    }
  
  
    // Refresh the access token using the refresh token
    async refreshAccessToken(refreshToken: any) {
      try {
        this.oAuth2Client.setCredentials({
          refresh_token: refreshToken
        });
        const { credentials } = await this.oAuth2Client.refreshAccessToken();
        return credentials;
      } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
      }
    }

}

  export const googleService = new GoogleOAuthHandler()