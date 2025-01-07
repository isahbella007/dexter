import { PlatformToken } from "../../models/Tokens"
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder"
import { verifyHubSpotToken } from "../../utils/helpers/jwt"
import { hubSpotService } from "../../utils/services/hubspot"
import { oAuthService } from "../auth/oAuth.service"

export class ContactsService{ 

    async addContact(email: string) { 
        // get the access and refresh token in here
        const platformToken = await PlatformToken.findOne({platform: 'hubspot'})
        if(!platformToken){ 
            throw ErrorBuilder.conflict('There is no refresh token from hubspot yet. Please install the developer app')
        }
        let accessToken = platformToken.accessToken
        const refreshToken = platformToken.refreshToken
        const expiresAt = platformToken.expiresAt

        // we have to check if the access token is expired
        const isAccessTokenExpired = verifyHubSpotToken( expiresAt)
        if(isAccessTokenExpired){ 
            // we have to refresh the token
            accessToken = await oAuthService.getHubSpotRefreshToken(refreshToken)
        }
        await hubSpotService.addContact(email, accessToken)
        
        // TODO: add the contact to the database
    }
}   
export const contactsService = new ContactsService()
