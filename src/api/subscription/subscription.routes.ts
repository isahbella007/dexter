import express from "express"
import { SubscriptionController } from "./subscription.controller"
import { authenticate } from "../../middleware/auth.middleware"

const subscriptionRoutes = express()

// get the plan to show the user 
subscriptionRoutes.get('/plan', SubscriptionController.plans)
// check the one the user wants to upgrade to 
subscriptionRoutes.post('/upgrade', SubscriptionController.upgrade)
subscriptionRoutes.post('/trial-upgrade', SubscriptionController.upgradeTrial)
subscriptionRoutes.get('/success', SubscriptionController.success)
subscriptionRoutes.get('/cancel', SubscriptionController.cancel)

// idk get customer/user billing information bu
subscriptionRoutes.get('/invoice', SubscriptionController.billingDetails)

// cancel subscription 
subscriptionRoutes.post('/cancel-subscription', SubscriptionController.cancelSubscription)

// webhooks
// subscriptionRoutes.post('/webhook', SubscriptionController.webhooks)
export default subscriptionRoutes