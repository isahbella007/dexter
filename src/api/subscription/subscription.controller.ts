import { config } from "../../config";
import { SubscriptionPlan } from "../../models/SubscriptionPlan";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";
import { asyncHandler } from "../../utils/helpers/asyncHandler";
import express, {Request, Response} from 'express'
import { subscriptionService } from "./subscription.service";
import { IUser } from "../../models/User";

const stripe = require('stripe')(config.apikeys.stripe)

export const SubscriptionController = { 
    upgrade: asyncHandler(async (req:Request, res:Response) => { 
        const planId = req.query.planId
        const user = req.user as IUser
        const session = await subscriptionService.createCheckoutSession(planId as string, user)
       
        ResponseFormatter.success(res, { url: session.url }, 'Checkout session created');
    }),

    success: asyncHandler(async (req:Request, res:Response) => { 
        const session = await subscriptionService.handleSuccessfulCheckout(
            req.query.session_id as string
        );
        console.log('session =>', JSON.stringify(session))
        // Extract relevant information for the frontend
        const subscriptionDetails = {
            nextBillingDate: new Date(session.subscription.current_period_end * 1000),
            planName: session.subscription.plan.product.name,
            amount: session.amount_total / 100,
            currency: session.currency,
            status: 'active'
        };
        ResponseFormatter.success(res, subscriptionDetails, 'Subscription activated successfully');
    }), 

    cancel: asyncHandler(async (req:Request, res:Response) => { 
        // send the user back to the frontend page where the plan is
    }),

    billingDetails: asyncHandler(async(req:Request, res:Response) => { 
        const user = req.user as IUser
        if(!user.stripeCustomerId){ 
            throw ErrorBuilder.badRequest('No billing information found')
        }
        const result = await subscriptionService.subscriptionDetails(user)
        ResponseFormatter.success(res, result, 'Portal session created');
    }),

    cancelSubscription: asyncHandler(async(req:Request, res:Response) => { 
        const user = req.user as IUser
        if(!user.stripeCustomerId){ 
            throw ErrorBuilder.badRequest('No billing information found')
        }
        const result = await subscriptionService.cancelSubscription(user._id)
        ResponseFormatter.success(res, result, 'Portal session created');
    }),

    // to activate this, you need to run stripe listen --forward-to localhost:3000/subscription/webhook
    webhooks : asyncHandler(async (req:Request, res:Response) => {
        let event
        const endpointSecret = config.apikeys.stripeEndpoint

        // Get the signature sent by Stripe
        const signature = req.headers['stripe-signature'];
        // Only verify the event if you have an endpoint secret defined.
        // Otherwise use the basic event deserialized with JSON.parse   
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                signature,
                endpointSecret
            );
        } catch (err:any) {
            console.log(`⚠️  Webhook signature verification failed.`, err.message);
            return ErrorBuilder.conflict(err.message);
        }
        // handle multiple event types 
        await subscriptionService.handleWebhookEvent(event);
        ResponseFormatter.success(res, null, 'Webhook processed successfully');
    })
}