import axios from 'axios';
import { config } from '../../config';
import { User } from '../../models/User';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import crypto from 'crypto'

interface WordPressTokens {
  access_token: string;
  token_type: string;
  scope: string;
}

interface WordPressSite {
  ID: string;
  name: string;
  URL: string;
}

export class WordPressService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private authBaseUrl: string = 'https://public-api.wordpress.com/oauth2';
  private apiBaseUrl: string = 'https://public-api.wordpress.com/rest/v1.1';

  constructor() {
    this.clientId = config.wordpress.clientId;
    this.clientSecret = config.wordpress.clientSecret;
    this.redirectUri = config.wordpress.productionRedirectUri;
    // this.redirectUri = config.wordpress.developmentRedirectUri
   
  }

  public async getAuthorizationUrl(state: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'global',
      state: state // Include the state parameter
    });

    return `${this.authBaseUrl}/authorize?${params.toString()}`;
  }

  public async handleAuthCallback(code: string, userId: string): Promise<void> {
    try {
        console.log('starting to handle auth callback')
      // Exchange code for tokens
      const tokens = await this.getAccessToken(code);
      console.log('tokens', tokens)
      // Store tokens in database
      await this.saveTokens(userId, tokens);
      
      // Fetch and store user's WordPress sites
      await this.fetchAndStoreSites(userId, tokens.access_token);
    } catch (error) {
      throw new Error('Failed to handle WordPress authentication');
    }
  }

  private async getAccessToken(code: string): Promise<WordPressTokens> {
    try {
        console.log('getting access token going wrong for some reason???', code)
        const tokenUrl = `${this.authBaseUrl}/token`;
        const tokenData = {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri
        };
  
        console.log('Token request URL:', tokenUrl);
        console.log('Token request data:', tokenData);
  
        const response = await axios.post(tokenUrl, 
          // Send as application/x-www-form-urlencoded
          new URLSearchParams(tokenData).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
  
        console.log('Token response:', response.data);

        return response.data;
    } catch (error) {
      throw new Error('Failed to get access token');
    }
  }

  private async saveTokens(userId: string, tokens: WordPressTokens): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: {
        'oauth.wordpress.accessToken': tokens.access_token,
        'oauth.wordpress.tokenType': tokens.token_type,
        'oauth.wordpress.scope': tokens.scope
      }
    });
    console.log('tokens saved')
  }

  public async fetchAndStoreSites(userId: string, accessToken: string): Promise<void> {
    try {
        console.log('fetching sites')
      const response = await axios.get(`${this.apiBaseUrl}/me/sites`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      console.log('user sites', response.data)

      const sites = response.data.sites.map((site: any) => ({
        siteId: Number(site.ID), // Ensure ID is stored as a number
        name: site.name,
        url: site.URL || null
      }));
      // Store sites in database
       
        await User.findByIdAndUpdate(userId, {
          $set: {
            'platforms.wordpress.sites': sites
          }
        })
      
      console.log('sites saved')
    } catch (error) {
      throw new Error('Failed to fetch WordPress sites');
    }
  }

  public async getUserSites(userId: string) {
    const user = await User.findById(userId)
    return user?.platforms?.wordpress?.sites || []
  }

  public async createPost(userId: string, siteId: string, postData: {
    title: string;
    content: string;
    status: string;
  }) {
    const auth = await User.findById(userId)
    if(!auth?.oauth?.wordpress?.accessToken) throw ErrorBuilder.badRequest('WordPress authentication not found')
     
    // Verify the site exists for this user
    const site = auth?.platforms?.wordpress?.sites?.find(
        (site: { siteId: number }) => site.siteId === Number(siteId)
      );
      if (!site) {
        throw ErrorBuilder.badRequest('WordPress site not found');
    } 
    
    try {
        const response = await axios.post(
          `${this.apiBaseUrl}/sites/${siteId}/posts/new`,
          postData,
          {
            headers: { Authorization: `Bearer ${auth.oauth.wordpress.accessToken}` }
          }
        );
  
        return response.data;
    } catch (error) {
        throw new Error('Failed to create WordPress post');
    }
  }

  private async refreshTokens(userId: string, refreshToken: string): Promise<void> {
    try {
      const response = await axios.post(`${this.authBaseUrl}/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      await this.saveTokens(userId, response.data);
    } catch (error) {
      throw new Error('Failed to refresh tokens');
    }
  }
} 

export const wordpressService = new WordPressService()