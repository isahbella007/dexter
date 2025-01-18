import axios from "axios"
import { config } from "../../config"
import { PlatformToken } from "../../models/Tokens"
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder"

export class OAuthService{ 
    async getHubSpotAccessToken(code: string){ 
        console.log('we get the code', code)
        try{    
            const response = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                },
                params: { 
                    grant_type: 'authorization_code',
                    client_id: config.hubspot.clientId,
                    client_secret: config.hubspot.clientSecret,
                    redirect_uri: config.hubspot.developmentRedirectUri, //TODO:: always keep this to be on the production redirect url
                    code: code
                }
            })
            console.log('response', response.data)

            // now save this in the db 
            await PlatformToken.create({ 
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
                platform: 'hubspot',
                tokenType: response.data.token_type
            })
        }catch(error){ 
            console.log('error', error)
            throw ErrorBuilder.badRequest('Error getting access token from hubspot')
        }
    }

    async getHubSpotRefreshToken(refreshToken: string){ 
        console.log('we get the refresh token', refreshToken)
        // this is an app where there is only one user with the hubspot so we can get the most recent refresh token in the db 
        const platformToken = await PlatformToken.findOne({platform: 'hubspot', refreshToken: refreshToken})
        if(!platformToken) throw ErrorBuilder.badRequest('No refresh token found')

        // let refreshToken = platformToken.refreshToken
        // now we need to refresh the token 
        try{ 
            const response = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            params: { 
                grant_type: 'refresh_token',
                client_id: config.hubspot.clientId,
                client_secret: config.hubspot.clientSecret,
                refresh_token: refreshToken,
                }
            })

            // update the token in the db 
            await PlatformToken.updateOne({_id: platformToken._id}, {accessToken: response.data.access_token, refreshToken: response.data.refresh_token, expiresAt: new Date(Date.now() + response.data.expires_in * 1000), tokenType: response.data.token_type})
            return response.data.access_token
        }catch(error){ 
            console.log('error', error)
            throw ErrorBuilder.badRequest('Error refreshing token from hubspot')
        }
    }
}   

export const oAuthService = new OAuthService()
