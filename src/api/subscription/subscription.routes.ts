import express from "express"
import { SubscriptionController } from "./subscription.controller"
import { authenticate } from "../../middleware/auth.middleware"

const subscriptionRoutes = express()

// check the one the user wants to upgrade to 
subscriptionRoutes.get('/upgrade', SubscriptionController.upgrade)
subscriptionRoutes.get('/success', SubscriptionController.success)
subscriptionRoutes.get('/cancel', SubscriptionController.cancel)

// idk get customer/user billing information bu
subscriptionRoutes.get('/invoice', SubscriptionController.billingDetails)

// cancel subscription 
subscriptionRoutes.post('/cancel-subscription', SubscriptionController.cancelSubscription)

// webhooks
subscriptionRoutes.post('/webhook', SubscriptionController.webhooks)
export default subscriptionRoutes