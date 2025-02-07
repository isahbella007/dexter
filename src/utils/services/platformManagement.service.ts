import { SYSTEM_PLATFORM } from "../../models/BlogPost"
import { IUser } from "../../models/interfaces/UserInterface"
import { User } from "../../models/User"
import { ErrorBuilder } from "../errors/ErrorBuilder"
export class PlatformManagementService { 

    async saveGA4TrackingCode(userId: string, code: string, siteId?:string, platform?:string) { 
       
        const user:IUser | null = await User.findById(userId)
        if(!user) { 
            throw ErrorBuilder.notFound('User not found')
        }
        // make sure that platform is of type platformType
        if(platform && !Object.values(SYSTEM_PLATFORM).includes(platform as SYSTEM_PLATFORM)) { 
            throw ErrorBuilder.badRequest('Invalid platform')
        }

        if(platform === SYSTEM_PLATFORM.wordpress) { 
            if(!siteId) { 
                throw ErrorBuilder.badRequest('Site id is required')
            }
            const site = user?.platforms?.wordpress?.sites?.find(
                (site: { siteId: number }) => site.siteId == Number(siteId)
              );
              if (!site) {
                throw ErrorBuilder.badRequest('WordPress site not found');
            } 
            // Update the specific site's ga4TrackingCode
            await User.updateOne(
                { _id: userId, 'platforms.wordpress.sites.siteId': Number(siteId) },
                { $set: { 'platforms.wordpress.sites.$.ga4TrackingCode': code } }
            );
        }
    }

    async validateSiteId(userId: string, siteId: string, platform: string) { 
        const user:IUser | null = await User.findById(userId)
        if(!user) { 
            throw ErrorBuilder.notFound('User not found')
        }
        if(platform === SYSTEM_PLATFORM.wordpress) { 
            if(!siteId) { 
                throw ErrorBuilder.badRequest('Site id is required')
            }
            const site = user?.platforms?.wordpress?.sites?.find(
                (site: { siteId: number }) => site.siteId === Number(siteId)
              );
              if (!site) {
                throw ErrorBuilder.badRequest('WordPress site not found');
            } 
            return site
        }
       return null
    }
}

export const platformManagementService = new PlatformManagementService()
