import { config } from "../../config";
import { SubscriptionPlan } from "../../models/SubscriptionPlan";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { handleError } from "../../utils/helpers/general";
import { User } from "../../models/User";
import { BillingCycle, SubscriptionStatus, SubscriptionType } from "../../models/Subscription";
import { IUser } from "../../models/interfaces/UserInterface";

const stripe = require('stripe')(config.apikeys.stripe);

export class SubscriptionService {
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
                customer: user.stripeCustomerId,
                line_items: [{
                    price: planDetails.stripePlanPriceId,
                    quantity: 1
                }],
                metadata: {
                    userId: user._id.toString(),
                    planId: planId.toString()
                },
                success_url: `http://localhost:5000/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${config.appUrl}/subscription/cancel`
            });

            console.log('session -> services', session)
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
            
            // Update user subscription details
            const userId = session.metadata.userId;
            const planId = session.metadata.planId;
            
            console.log('redirect success ->', userId)
            // Add subscription update logic here
            // for testing, let us say we set the user type to pro plan 
            const userDetails = await User.findById(userId)
            if(!userDetails) throw ErrorBuilder.notFound('No user')

            // update fields needed to be updated
            userDetails.subscription.type = SubscriptionType.PRO
            userDetails.subscription.status = SubscriptionStatus.ACTIVE
            userDetails.subscription.billingCycle = BillingCycle.MONTHS
            userDetails.subscription.price = session.subscription.plan.amount/100
            userDetails.subscription.startDate = new Date(session.subscription.start_date * 1000), 
            userDetails.subscription.lastBillingDate = new Date(session.subscription.current_period_start * 1000),
            userDetails.subscription.nextBillingDate = new Date(session.subscription.current_period_end * 1000),
            userDetails.subscription.stripePlanId = session.subscription.id,
            userDetails.subscription.autoRenew = !session.subscription.cancel_at_period_end,
            userDetails.subscription.paymentHistory = [{
                paymentId: session.invoice,
                amount: session.amount_total / 100,
                status: session.payment_status,
                date: new Date()
            }],
            userDetails.subscription.statusHistory = [{
                status: SubscriptionStatus.ACTIVE,
                date: new Date(),
                reason: 'Initial subscription'
            }]
            await userDetails.save()
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
    
            // Cancel at period end
            const canceledSubscription = await stripe.subscriptions.update(
                user.subscription.stripePlanId,
                { cancel_at_period_end: true }
            );
    
            // Update local subscription
            user.subscription.status = SubscriptionStatus.CANCELLING;
            user.subscription.autoRenew = false;
            user.subscription.statusHistory.push({
                status: SubscriptionStatus.CANCELLING,
                date: new Date(),
                reason: 'User requested cancellation'
            });
    
            await user.save();
            return {
                endDate: new Date(canceledSubscription.current_period_end * 1000),
                status: user.subscription.status
            };
        } catch (error) {
            throw handleError(error, 'cancelSubscription', { userId });
        }
    }
    async handleWebhookEvent(event: any) {
        try {
            switch(event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                case 'invoice.paid':
                    await this.handleInvoicePaid(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
            }
        } catch (error) {
            throw handleError(error, 'handleWebhookEvent', { eventType: event.type });
        }
    }

    private async createCustomer(user:IUser){ 
        try{ 
            const userDetail = await User.findById(user._id)
            if(!userDetail) throw ErrorBuilder.notFound('No user')
            const customer = await stripe.customers.create({
                name: user.email,
                email: user.email,
            });
            console.log('we created the customer in stripe =>', JSON.stringify(customer))
            // assign the user the customer primary key from stripe 
            userDetail.stripeCustomerId = customer.id
            await userDetail.save()

            return customer;
        }catch(error){ 
            throw handleError(error, 'failed to create stripe customer', {user})
        }
        
    }
    // Private webhook handlers
    private async handleCheckoutCompleted(session: any) {
        // Implementation
        console.log('You made it for now yay')
    }

    private async handleInvoicePaid(invoice: any) {
        // Implementation
        return 
    }

    private async handlePaymentFailed(invoice: any) {
        // Implementation
        return
    }

    private async handleSubscriptionUpdated(subscription: any) {
        // Implementation
        return 
    }
}

export const subscriptionService = new SubscriptionService();