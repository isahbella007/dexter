import axios from 'axios';
import { config } from '../../config';
import { User } from '../../models/User';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import crypto from 'crypto';
import { PKCEUtil } from '../helpers/pkce';
import { IUser } from '../../models/interfaces/UserInterface';

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
  private redirectUri: string;
  private authBaseUrl: string = 'https://www.wixapis.com/oauth2';
  private apiBaseUrl: string = 'https://www.wixapis.com/_api';
  private wixRedirectUrl: string = 'https://www.wixapis.com/_api/redirects-api/v1/redirect-session'

  constructor() {
    this.clientId = config.wix.clientId;
    this.redirectUri = config.wix.developmentRedirectUri;

  }
  
  public async getAuthorizationUrl(userId: string){ 
    try{ 
        // Handle visitor first 
        console.log('getting the visitor token')
        const visitorResponse = await axios.post(`${this.authBaseUrl}/token`, { 
          clientId: this.clientId, 
          grantType: 'anonymous'
        }, { 
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
        console.log('Visitor Token Details:', visitorResponse.data.access_token);
        const visitorToken = visitorResponse.data.access_token

        //* generate PKCE code verifier and state
        const codeVerifier = PKCEUtil.generateCodeVerifier()
        const codeChallenge = await PKCEUtil.generateCodeChallenge(codeVerifier)
        // Generate state (for CSRF protection)
        const state = crypto.randomBytes(32).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

        //* store this in the user document 
        await User.findByIdAndUpdate(userId, { 
          'oauth.wix.authSession': {
            codeVerifier, 
            codeChallenge,
            state, 
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          }
        })

        // * get the redirect url 
        const redirectSession = await this.getRedirectSession({codeVerifier, codeChallenge, state, visitorToken})
        // console.log('redirect session =>', redirectSession)
        return redirectSession
    }catch(error){ 
      console.log('error getting the authorization url', error)
      throw Error('Failed to get authorization url')
    }
    

    
  }

  private async getRedirectSession(params: {codeVerifier: string, codeChallenge: string, state: string,visitorToken: string}){ 
      try{ 
        const requestBody = {
          auth: {
            authRequest: {
              redirectUri: this.redirectUri,
              clientId: this.clientId,
              codeChallenge: params.codeChallenge,
              codeChallengeMethod: "S256",
              responseMode: "query",
              responseType: "code",
              scope: "SITE_LIST.READ, offline_access",
              state: params.state
            }
          }
        };
      
        const response = await axios.post(
          this.wixRedirectUrl, 
          requestBody,  // Send as JSON
          { 
            headers: { 
              'Authorization': `Bearer ${params.visitorToken}`,
              'Content-Type': 'application/json'  // Changed to JSON
            }
          }
        );
      
        return response.data;
      }catch(error){ 
        console.log('error getting the redirect session', error)
        throw Error('Failed to get redirect session')
      }
  }

  public async handleAuthCallback(code: string, state: string){ 

    const user = await User.findOne({'oauth.wix.authSession.state': state})
    if(!user) throw ErrorBuilder.notFound('User not found')

      
    const session = user?.oauth?.wix?.authSession
    if(!session || new Date() > session.expiresAt){ 
      throw ErrorBuilder.badRequest('No active session found for the user')
    }

    if(session.state !== state){ 
      throw ErrorBuilder.badRequest('State mismatch')
    }

    // * Exchange the code for tokens 
    const tokens = await this.getMemberToken({ 
      code, 
      codeVerifier: session.codeVerifier, 
    })

    console.log('tokens =>', tokens)
    // *Update the user document with the tokens 
    await User.findByIdAndUpdate(user._id, { 
      'oauth.wix.accessToken': tokens.access_token, 
      'oauth.wix.tokenType': tokens.token_type, 
      'oauth.wix.refreshToken': tokens.refresh_token, 
      'oauth.wix.accessTokenExpires': new Date(Date.now() + tokens.expires_in * 1000),
      $unset: {
        'oauth.wix.authSession': 1
      }
    })

    // * fetch and store the user sites 
    // await this.fetchAndStoreWixSites(tokens.access_token)
  }

  private async getMemberToken(params: {
    code: string;
    codeVerifier: string;
  }) {
    try{
      const requestBody = {
        clientId: this.clientId,
        grantType: "authorization_code",
        redirectUri: this.redirectUri,
        code: params.code,
        codeVerifier: params.codeVerifier,
      };
  
      const response = await axios.post(
        `${this.authBaseUrl}/token`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log('member token =>', response.data)
      return response.data;
    }catch(error){ 
      console.log('error getting the member token', error)
      throw Error('Failed to get member token')
    }
    
  }

  public async getMember(userId: string){ 
    const user = await User.findById(userId)
    if(!user) throw ErrorBuilder.notFound('User not found')

    const response = await axios.get('https://www.wixapis.com/members/v1/members/my', { 
      headers: { 
        'Authorization': `Bearer ${user?.oauth?.wix?.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('member response =>', response.data)
    // update the user document with the member id 
    await User.findByIdAndUpdate(user._id, { 
      'oauth.wix.memberId': response.data.member.id, 
      'oauth.wix.contactId': response.data.member.contactId, 
    })
  }

  public async fetchAndStoreWixSites(accessToken: string): Promise<void>{ 
    try{ 
      const response = await axios.get(`${this.apiBaseUrl}/sites/v3/sites`, {  
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('response =>', response.data)
      // return response.data
    }catch(error: any){ 
      console.log('error fetching wix user site', error)
      throw Error('Failed to fetch wix user site')
    }

  }

  private async refreshToken(accessToken: string, user: IUser){ 
    const response = await axios.post(`${this.authBaseUrl}/access`, { 
      clientId: this.clientId, 
      grantType: 'refresh_token', 
      refreshToken: accessToken
    })
  }

  public async getSites(user:IUser){ 

  }
  
}
  

export const wixService = new WixService()