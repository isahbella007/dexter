import axios from 'axios';
import { config } from '../../config';
import { User } from '../../models/User';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import crypto from 'crypto';
import { PKCEUtil } from '../helpers/pkce';
import { IUser, IWixSite } from '../../models/interfaces/UserInterface';
import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from '../../models/BlogPost';
import { AppError } from '../errors/AppError';
import { ErrorType } from '../errors/errorTypes';
import { marked } from 'marked';

interface WixTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface WixSite {
  id: string;
  name: string;
  url: string;
}

export class WixService {
  private clientId: string;
  private clientSecret: string;
  private initialDevelopmentRedirectUri: string;
  private initialProductionRedirectUri: string;
  private finalDevelopmentRedirectUri: string;
  private finalProductionRedirectUri: string;
  private authBaseUrl: string = 'https://www.wixapis.com/oauth';
  private apiBaseUrl: string = 'https://www.wixapis.com/_api';
  private wixRedirectUrl: string = 'https://www.wixapis.com/_api/redirects-api/v1/redirect-session'


  constructor() {
    this.clientId = config.wix.clientId;
    this.clientSecret = config.wix.clientSecret;

    this.initialDevelopmentRedirectUri = config.wix.initialDevelopmentRedirectUri;
    this.initialProductionRedirectUri = config.wix.initialProductionRedirectUri;

    this.finalDevelopmentRedirectUri = config.wix.finalDevelopmentRedirectUri;
    this.finalProductionRedirectUri = config.wix.finalProductionRedirectUri;


  }
  
  public async getInstallationUrl(userId: string){ 
    try{ 

      //* generate PKCE code verifier and state
      // const codeVerifier = PKCEUtil.generateCodeVerifier()
      // const codeChallenge = await PKCEUtil.generateCodeChallenge(codeVerifier)
      // Generate state (for CSRF protection)
      const state = crypto.randomBytes(32).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

      //* store this in the user document 
      await User.findByIdAndUpdate(userId, { 
        'oauth.wix.authSession': {
          // codeVerifier, 
          // codeChallenge,
          state, 
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        }
      })

       // Construct authorization URL
       return `https://www.wix.com/installer/install/?` + // Changed to legacy authorize endpoint
       `appId=${this.clientId}&` + // Parameter name changed to client_id
       `redirectUrl=${encodeURIComponent(this.finalDevelopmentRedirectUri)}&` +
      `state=${state}` 


      }catch(error){ 
        console.log('error getting the authorization url', error)
        throw Error('Failed to get authorization url')
      }
  }

  // ** Certain you are not being used but okay for now let us keep it here
  public async getAuthorizationUrl(token: string){ 
    try{ 

console.log('token =>', token)
        //* generate PKCE code verifier and state
        const codeVerifier = PKCEUtil.generateCodeVerifier()
        const codeChallenge = await PKCEUtil.generateCodeChallenge(codeVerifier)
        // Generate state (for CSRF protection)
        const state = crypto.randomBytes(32).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

        //* store this in the user document 
        // await User.findByIdAndUpdate(userId, { 
        //   'oauth.wix.authSession': {
        //     codeVerifier, 
        //     codeChallenge,
        //     state, 
        //     expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        //   }
        // })

         // Construct authorization URL
         return `https://www.wix.com/installer/install/?` + // Changed to legacy authorize endpoint
         `token=${token}&` + // Parameter name changed to client_id
         `appId=${this.clientId}&` + // Parameter name changed to client_id
         `redirectURL=${encodeURIComponent(this.finalDevelopmentRedirectUri)}`


    }catch(error){ 
      console.log('error getting the authorization url', error)
      throw Error('Failed to get authorization url')
    }
  }


  public async handleAuthCallback(code: string, instanceId: string, state: string){ 

    try{

      const user = await User.findOne({'oauth.wix.authSession.state': state})
      if(!user) throw ErrorBuilder.forbidden('Invalid state')

      // 1. Fix endpoint URL
      const tokenUrl = `${this.authBaseUrl}/access`;
          
      // 2. Use JSON format instead of URL-encoded
      const tokens = await axios.post(tokenUrl, {
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code
      }, {
          headers: {
            'Content-Type': 'application/json'
          }
      });
      // console.log('tokens =>', tokens)
      // console.log('instanceId =>', instanceId)

      await User.findByIdAndUpdate(user._id, { 
        'oauth.wix.accessToken': tokens.data.access_token, 
        'oauth.wix.refreshToken': tokens.data.refresh_token, 
        'oauth.wix.instanceId': instanceId,
        $unset: {
          'oauth.wix.authSession': 1
        }
      })

      await this.fetchAndStoreWixSites(tokens.data.access_token, user._id)
    }catch(error){ 
      console.log('error handling the auth callback', error)
      throw Error('Failed to handle auth callback')
    }
    
  }

  public async fetchAndStoreWixSites(accessToken: string, userId: string): Promise<void> {
    try {
        // Fetch site instance
        const instanceResponse = await axios.get(`https://www.wixapis.com/apps/v1/instance`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const { site, instance } = instanceResponse.data;

        // Fetch contacts to find the owner
        const contactsResponse = await axios.get('https://www.wixapis.com/contacts/v4/contacts', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Find the owner member
        const owner = contactsResponse.data.contacts.find(
            (contact: any) => contact.memberInfo?.userInfo?.role === 'OWNER'
        );

        const siteData = {
            siteId: site.siteId,
            name: site.siteDisplayName,
            url: site.url,
            siteAccessToken: accessToken,
            siteInstanceId: instance.instanceId,
            ownerMemberId: owner?.memberInfo?.memberId || null
        };

        // Update the user document with the new site information
        await User.findByIdAndUpdate(
            userId,
            {
                $addToSet: {
                    'platforms.wix.sites': siteData
                }
            },
            { new: true }
        );

    } catch (error: any) {
        console.log('error fetching wix user site', error);
        throw Error('Failed to fetch wix user site');
    }
}

  public async getNewAccessToken(userId: string, wixSite: IWixSite){ 
    console.log('wixSite =>', wixSite)
    const response = await axios.post('https://www.wixapis.com/oauth2/token', { 
      "client_id": this.clientId,
      "client_secret": this.clientSecret,
      "grant_type": "client_credentials",
      "instance_id": wixSite.siteInstanceId
    }) 

    console.log('response =>', response.data)
    // update the wixSite with the new access token

    await User.findByIdAndUpdate(userId, { 
      'platforms.wix.sites': {
        ...wixSite,
        siteAccessToken: response.data.access_token
      }
    })

    return response.data.access_token
  }


  public async publishBlogPostToWix(title: string, content: string, accessToken: string, ownerMemberId: string): Promise<any> {
    try {

        // 2. Prepare the Wix API request
        const wixResponse = await axios.post(
            'https://www.wixapis.com/blog/v3/draft-posts',
            {
              draftPost: { 
                title: title,
                richContent: content,
                memberId: ownerMemberId,
                publish: true
              },
              fieldsets: ["URL", "RICH_CONTENT"] // Include fieldsets
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
        );

        return wixResponse.data.draftPost
      } catch (error:any) {
        console.log('There is an error that occured while publishing the blog post', error)
        
        throw new AppError(error.message, ErrorType.CONFLICT, error.status || 500)
    }
  }

 


}
  

export const wixService = new WixService()