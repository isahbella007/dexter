import { config } from "../../config";
import { SubscriptionPlan } from "../../models/SubscriptionPlan";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { handleError } from "../../utils/helpers/general";
import { User } from "../../models/User";
import { BillingCycle, SubscriptionStatus, SubscriptionType } from "../../models/Subscription";
import { IUser } from "../../models/interfaces/UserInterface";
import { dateUtils } from "../../utils/helpers/date";
import { emailService } from "../../utils/services/emailService";
import { StripeConst } from "./constant";

const stripe = require('stripe')(config.apikeys.stripe);

export class SubscriptionService {
    async getAvailablePlans(){ 
        const plans = await SubscriptionPlan.find({})
        return plans;
    }

    async startTrialSubscription(userId: string, planId: string){ 
        try{ 
            console.log('at least get here?')
            const user = await User.findById(userId)
            if(!user) throw ErrorBuilder.notFound('No user found')

            if (user.subscription?.statusHistory?.some(
                status => status.status === SubscriptionStatus.TRIAL
            )) {
                throw ErrorBuilder.badRequest('Trial period already used');
            }
             // 2. Check current subscription status
            if (user.subscription) {
                // Don't allow trial if user is on any active paid subscription
                if (user.subscription.status === SubscriptionStatus.ACTIVE && 
                    user.subscription.type === SubscriptionType.PRO) {
                    throw ErrorBuilder.badRequest('Cannot start trial while on an active paid subscription');
                }

                // Don't allow trial if user previously had a paid subscription
                if(user.subscription.statusHistory.length > 0){
                    if (user.subscription.type === SubscriptionType.PRO && user.subscription.statusHistory?.some(
                        status =>status.status === SubscriptionStatus.ACTIVE
                    )) {
                        throw ErrorBuilder.badRequest('Trial is not available for previous paid subscribers');
                    }
                    // we need to check if their last status is cancelling or cancelled. If it is, we do not allow them to start a trial
                if([SubscriptionStatus.CANCELLING, SubscriptionStatus.CANCELLED].includes(
                    user.subscription.statusHistory[user.subscription.statusHistory.length - 1].status as SubscriptionStatus
                )){ 
                    throw ErrorBuilder.badRequest('Cannot start trial with a cancelled or cancelling subscription')
                }
                }
                
            }
 
            const planDetails = await SubscriptionPlan.findById(planId)
            if(!planDetails) throw ErrorBuilder.notFound('No plan found')

            // create customer if they do not exist 
            if(!user.stripeCustomerId){ 
                await this.createCustomer(user)
            }

           

            // create the trial subscription in stripe 
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                customer: user.stripeCustomerId,
                // customer_email: user.email,
                line_items: [{
                    price: planDetails.stripePlanPriceId,
                    quantity: 1
                }],
                subscription_data: {
                    trial_period_days: 7,
                    
                },
                // test_clock: StripeConst.testClockId,
                //!!TODO: Add this when we want to test the trial period
                metadata: {
                    userId: user._id.toString(),
                    planId: planId.toString(),
                    isTrial: 'true'
                },
                success_url: `${config.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${config.appUrl}/subscription/cancel`
            });

            return session;
        }catch(error){
            console.log('error ->', JSON.stringify(error))
            throw handleError(error, 'startTrialSubscription', { userId, planId });
        }
    }

    async createCheckoutSession(planId: string, user: IUser) {
        try {
            const planDetails = await SubscriptionPlan.findById(planId);
            if (!planDetails) {
                throw ErrorBuilder.notFound('No plan with the id passed');
            }

            // Get or create Stripe customer
           if(!user.stripeCustomerId){ 
            await this.createCustomer(user)
           }
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                // customer: user.stripeCustomerId,
                customer_email: user.email,
                line_items: [{
                    price: planDetails.stripePlanPriceId,
                    quantity: 1
                }],
                metadata: {
                    userId: user._id.toString(),
                    planId: planId.toString(), 
                    isTrial: 'false'
                },

                success_url: `${config.appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${config.appUrl}/subscription/cancel`
            });

            // console.log('session -> services', session)
            return session;
        } catch (error) {
            throw handleError(error, 'createCheckoutSession', { planId, user });
        }
    }

    async handleSuccessfulCheckout(sessionId: string) {
        try {
            const session = await stripe.checkout.sessions.retrieve(
                sessionId,
                { expand: ['subscription', 'subscription.plan.product'] }
            );
            // Verify session is valid and not expired
            if (session.status !== 'complete') {
                throw ErrorBuilder.badRequest('Checkout session incomplete');
            }

            // Handle payment failure
            if (session.payment_status !== 'paid') {
                throw ErrorBuilder.badRequest('Payment not successful');
            }
            // Update user subscription details
            const userId = session.metadata.userId;
            const isTrial = session.metadata.isTrial === 'true';
            const planId = session.metadata.planId;
            
            console.log('redirect success ->', userId)
            // Add subscription update logic here
            // for testing, let us say we set the user type to pro plan 
            const user = await User.findById(userId)
            if(!user) throw ErrorBuilder.notFound('No user')

            // ** get the invoice url from the session
            const invoiceId = session.invoice
            const invoice = await stripe.invoices.retrieve(invoiceId)
            const hostedInvoiceUrl = invoice.hosted_invoice_url
            const invoiceUrl = invoice.invoice_pdf;

            // update fields needed to be updated
            // Update user subscription based on session type
        if (isTrial) {
            user.subscription = {
                stripeSubscriptionId: session.subscription.id,
                type: SubscriptionType.PRO,
                status: SubscriptionStatus.TRIAL,
                billingCycle: BillingCycle.MONTHS,
                price: session.amount_total / 100,
                startDate: new Date(session.subscription.start_date * 1000),
                endDate: new Date(session.subscription.current_period_end * 1000),
                lastBillingDate: new Date(session.subscription.current_period_start * 1000),
                nextBillingDate: new Date(session.subscription.current_period_end * 1000),
                stripePlanId: session.subscription.id,
                autoRenew: true,
                statusHistory: [{
                    status: SubscriptionStatus.TRIAL,
                    price: session.amount_total / 100,
                    paymentMethod: session.payment_method,
                    invoiceId: session.invoice,
                    invoiceUrl: invoiceUrl,
                    hostedInvoiceUrl: hostedInvoiceUrl,
                    date: new Date(),
                    startDate: new Date(session.subscription.start_date * 1000),
                    endDate: new Date(session.subscription.current_period_end * 1000),
                    reason: 'Trial started'
                }]
            };
        } else {
            user.subscription = {
                stripeSubscriptionId: session.subscription.id,
                type: SubscriptionType.PRO,
                status: SubscriptionStatus.ACTIVE,
                billingCycle: BillingCycle.MONTHS,
                price: session.amount_total / 100,
                startDate: new Date(session.subscription.start_date * 1000),
                endDate: new Date(session.subscription.current_period_end * 1000), // Convert timestamp to UTC date
                lastBillingDate: new Date(session.subscription.current_period_start * 1000),
                nextBillingDate: new Date(session.subscription.current_period_end * 1000),
                stripePlanId: session.subscription.id,
                autoRenew: true,
                statusHistory: [{
                    status: SubscriptionStatus.ACTIVE,
                    price: session.amount_total / 100,
                    paymentMethod: session.payment_method,
                    invoiceId: session.invoice,
                    invoiceUrl: invoiceUrl,
                    hostedInvoiceUrl: hostedInvoiceUrl,
                    date: new Date(),
                    startDate: new Date(session.subscription.start_date * 1000),
                    endDate: new Date(session.subscription.current_period_end * 1000),
                    reason: 'Subscription started'
                }]
            };
        }
        console.log('session =>', JSON.stringify(session, null, 2))
            await user.save()
            return session;
        } catch (error) {
            throw handleError(error, 'handleSuccessfulCheckout', { sessionId });
        }
    }

    async createBillingPortalSession(customerId: string) {
        try {
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: `${config.appUrl}/home`
            });
            return portalSession;
        } catch (error:any) {
            if (error.type === 'StripeInvalidRequestError') {
                throw ErrorBuilder.badRequest('Invalid Stripe customer ID');
            }
            throw handleError(error, 'createBillingPortalSession', { customerId });
        }
    }

    async subscriptionDetails(user:IUser){ 
        try{ 
            const userDetails = await User.findById(user._id)
            if(!userDetails || !userDetails.stripeCustomerId){ 
                throw ErrorBuilder.notFound('No subscription for this user')
            }

            // Get recent invoices from Stripe
            const stripeInvoices = await stripe.invoices.list({
                customer: user.stripeCustomerId,
                limit: 10,
            });

            console.log('here are you invoices', stripeInvoices)

            // Combine with local payment history
            const combinedInvoices = stripeInvoices.data.map((invoice: any) => ({
                id: invoice.id,
                currency: invoice.currency,
                amount: invoice.amount_paid / 100,
                status: invoice.status,
                date: new Date(invoice.created * 1000),
                pdfUrl: invoice.invoice_pdf,
                
            }));

            return combinedInvoices;
        }catch(error){ 
            throw handleError(error, 'getSubscriptionDetails');
        }
    }

    async cancelSubscription(userId:string){ 
        try {
            const user = await User.findById(userId);
            if (!user?.subscription?.stripePlanId) {
                throw ErrorBuilder.notFound('No active subscription found');
            }
            // Prevent cancellation if already cancelling/cancelled
            if ([SubscriptionStatus.CANCELLED, SubscriptionStatus.CANCELLING]
                .includes(user.subscription.status as SubscriptionStatus)) {
                throw ErrorBuilder.badRequest('Subscription already cancelled');
            }

            
            // Handle different subscription statuses
            switch (user.subscription.status) {
                case SubscriptionStatus.TRIAL:
                    // Immediate cancellation for trial
                    await stripe.subscriptions.cancel(user.subscription.stripePlanId);
                    user.subscription = {
                        type: SubscriptionType.FREE,
                        status: SubscriptionStatus.ACTIVE,
                        billingCycle: BillingCycle.NONE,
                        price: 0,
                        startDate: dateUtils.getCurrentUTCDate(),
                        autoRenew: false,
                        statusHistory: [{
                            // here,we need to check if the user end date is lesser than the current date. If it is, we say they have canclled else we set their status to cancelling
                            status: user.subscription.endDate ? (user.subscription.endDate < dateUtils.getCurrentUTCDate()) ? SubscriptionStatus.CANCELLED : SubscriptionStatus.CANCELLING : SubscriptionStatus.CANCELLING,
                            date: dateUtils.getCurrentUTCDate(),
                            reason: 'Trial cancelled - reverted to free plan'
                        }]
                    };
                    break;

                case SubscriptionStatus.ACTIVE:
                    // Cancel at period end for active subscriptions
                    await stripe.subscriptions.update(user.subscription.stripePlanId, {
                        cancel_at_period_end: true
                    });
                    user.subscription.status = SubscriptionStatus.CANCELLING;
                    user.subscription.autoRenew = false;
                    user.subscription.statusHistory.push({
                        status: SubscriptionStatus.CANCELLING,
                        date: dateUtils.getCurrentUTCDate(),
                        reason: 'User requested cancellation'
                    });
                    break;
            }

            await user.save();
            return user
            
        } catch (error) {
            throw handleError(error, 'cancelSubscription', { userId });
        }
    }

    async handleWebhookEvent(event: any, user: IUser) {
        try {
            switch(event.type) {
                // case 'customer.subscription.trial_will_end':
                //     // Notify user 3 days before trial ends
                //     await this.handleTrialEnding(event.data.object, user);
                //     break;
                // case 'checkout.session.completed':
                //     await this.handleCheckoutCompleted(event.data.object);
                //     break;
                // case 'invoice.paid':
                //     await this.handleInvoicePaid(event.data.object);
                //     break;
                // case 'invoice.payment_failed':
                //     await this.handlePaymentFailed(event.data.object);
                //     break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object, user);
                    break;
            }
        } catch (error) {
            throw handleError(error, 'handleWebhookEvent', { eventType: event.type });
        }
    }

    

    private async createCustomer(user: Partial<IUser>){ 
        console.log('Something is going wrong when we want to create the user ')
        try{ 
            // console.log('test clock =>', JSON.stringify(testClock))
            const userDetail = await User.findById(user._id)
            if(!userDetail) throw ErrorBuilder.notFound('No user')
            console.log("Creating user...")
            const customer = await stripe.customers.create({
                // test_clock: StripeConst.testClockId, //!!TODO: Add this when we want to test the trial period
                name: user.email,
                email: user.email,
            });
            console.log('stripe customer created =>', customer)
            // assign the user the customer primary key from stripe 
            userDetail.stripeCustomerId = customer.id
            await userDetail.save()

            return customer;
        }catch(error){ 
            throw handleError(error, 'failed to create stripe customer', {user})
        }
        
    }
   

    private async handleSubscriptionUpdated(subscription: any, user: IUser) {
        console.log('PLEASE LOG SOMETHING SO I KNOW YOU ARE WORKING')
        try {
            const user = await User.findOne({
                'subscription.stripeSubscriptionId': subscription.id
            });

            if (!user) return;
            console.log('user =>', user)

            console.log('Previous attributes:', subscription.previous_attributes);
            // in there, I want to handle these cases, if the person was on trial and the auto renewal went through 

            if (subscription.object.status === 'active' && 
                user.subscription.status === SubscriptionStatus.TRIAL ) {
                
                user.subscription = {
                    ...user.subscription,
                    status: SubscriptionStatus.ACTIVE,
                    type: SubscriptionType.PRO,
                    billingCycle: BillingCycle.MONTHS,
                    endDate: new Date(subscription.current_period_end * 1000),
                    lastBillingDate: new Date(subscription.current_period_start * 1000),
                    nextBillingDate: new Date(subscription.current_period_end * 1000),
                    autoRenew: true,
                    statusHistory: [
                        ...user.subscription.statusHistory,
                        {
                            status: SubscriptionStatus.ACTIVE,
                            date: new Date(),
                            reason: 'Trial ended, successfully converted to paid subscription'
                        }
                    ]
                };
                console.log('Successfully converted trial to paid subscription');
                
                // Optionally send confirmation email
                // await emailService.sendEmail(user.email, 'Subscription Activated', 'Your trial has ended and your paid subscription is now active.');
            }
            

            // Handle cancellation during trial
            if (subscription.status === 'canceled' && 
                user.subscription.status === SubscriptionStatus.TRIAL) {
                user.subscription = {
                    type: SubscriptionType.FREE,
                    status: SubscriptionStatus.ACTIVE,
                    billingCycle: BillingCycle.NONE,
                    price: 0,
                    startDate: new Date(),
                    autoRenew: false,
                    statusHistory: [{
                        status: SubscriptionStatus.ACTIVE,
                        date: new Date(),
                        reason: 'Trial cancelled - reverted to free plan'
                    }]
                };
            }

            await user.save();
        } catch (error) {
            throw handleError(error, 'handleSubscriptionUpdated', { subscription });
        }
    }
}

export const subscriptionService = new SubscriptionService();