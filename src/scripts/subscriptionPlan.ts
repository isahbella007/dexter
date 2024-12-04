import { BillingCycle, SubscriptionType } from "../models/Subscription";
import { ISubscriptionPlan, SubscriptionPlan } from "../models/SubscriptionPlan";

// this is to create a subscription plan typically when the project runs fort he first time 
export const createSubPlan = async () => { 
    const subPlans = [
        {
            name: 'Free Plan',
            description: "This is the free plan for users",
            type: SubscriptionType.FREE, 
            price: 0, 
            billingCycle: BillingCycle.NONE, 
            auditLog:{
                action: 'created'
            }
        }, 
        { 
            name: 'Pro',
            description: "This is the pro plan", 
            type: SubscriptionType.PRO,
            price: 20,
            billingCycle: BillingCycle.MONTHS, 
            stripePlanId: 'prod_RIjuTNc1mP3Rog',
            stripePlanPriceId: 'price_1QQ8QtJXaCArR2cjthrkFQRx',
            auditLog:{
                action: 'created'
            }
        }
    ]

    await Promise.all(subPlans.map(async (items) =>{
        await SubscriptionPlan.create(items)
    }))
}