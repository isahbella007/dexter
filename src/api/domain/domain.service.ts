import { Analytics } from "../../models/Analytics";
import { BlogPost } from "../../models/BlogPost";
import { Domain, IDomain } from "../../models/Domain";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { handleError } from "../../utils/helpers/general";
import { subscriptionFeatureService } from "../../utils/subscription/subscriptionService";

export class DomainService{ 
    async createDomain(userId:string, domainData: Partial<IDomain>){ 
        try{ 
            // check if they can add a domain 
            const canCreate = await subscriptionFeatureService.canAddDomain(userId)
            if(!canCreate.createDomain){ 
                throw ErrorBuilder.forbidden(canCreate.message)
            }
            // create domain 
            const domain = new Domain({ 
                ...domainData, 
                userId, 
                isVerified: false
            })
            await domain.save()

            // Initialize Analytics 
            const analytics = new Analytics({ 
                domainId: domain._id,
                userId
            })
            await analytics.save()
        }catch(error){ 
            throw handleError(error, 'createDomain')
        }
    }

    async getAllDomain(userId: string): Promise<IDomain[]>{ 
        try{ 
            const domain = await Domain.find({userId: userId})
            return domain 
        }catch(error){ 
            throw handleError(error, 'getAllDomain');
        }
    }
    async getDomain(domainId: string, userId: string): Promise<IDomain> {
        try {
            const domain = await Domain.findOne({_id: domainId, userId});
            
            if (!domain) {
                throw ErrorBuilder.notFound('Domain not found');
            }

            return domain;
        } catch (error) {
            throw handleError(error, 'getDomain');
        }
    }
    // delete domain 
    // update domain 
}
export const domainService = new DomainService();