import axios from "axios"
import { ErrorBuilder } from "../errors/ErrorBuilder"

class HubSpotService{ 

    // add the contact to the list 
    async addContact(email:string, token:string){ 
        try{
            await axios.post(
                'https://api.hubapi.com/crm/v3/objects/contacts',
                { 
                    properties: { 
                        email: email
                    }
                }, 
                { 
                    headers: { 
                        'Authorization': `Bearer ${token}`
                    }
                }
            )
        }catch(error){ 
            console.log('Error: HubSPot service', error)
            throw ErrorBuilder.internal('Failed to post the message')
        }
        
    }
}
export const hubSpotService = new HubSpotService()