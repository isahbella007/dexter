import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
const authRouter = Router()

authRouter.post('/register', authController.register)
authRouter.post('/verify-email', authController.verifyEmail)
authRouter.post('/resend-verification', authController.resendEmailVerification)

authRouter.post('/forgot-password', authController.requestPasswordReset)
authRouter.post('/reset-password', authController.resetPassword)
authRouter.post('/change-password', authenticate,  authController.changePassword)

authRouter.post('/refresh-token', authController.refreshToken)

authRouter.post('/login', authController.login)
authRouter.post('/logout', authenticate, authController.logout)
authRouter.post('/logout-all-devices', authenticate, authController.logoutAllDevices)

// MFA
authRouter.post('/setup-mfa', authenticate, authController.setupMFA)
authRouter.post('/verify-mfa-setup', authenticate, authController.verifyMFASetup)

// everything oAuth related 
authRouter.get('/callback/hubspot', authController.getHubSpotAccessToken)

// Wordpress oAuth
authRouter.get('/wordpress', authenticate, authController.initiateWordPressOAuth)
authRouter.get('/callback/wordpress', authController.handleWordPressCallback)

// Wix oAuth
authRouter.get('/wix', authenticate, authController.initiateWixOAuth)
authRouter.get('/callback/wix', authController.handleWixCallback)

// get the wix member 
authRouter.get('/wix/member', authenticate, authController.getWixMember)

// Google oAuth
authRouter.get('/google', authenticate, authController.initiateGoogleOAuth)
authRouter.get('/callback/google', authController.handleGoogleCallback)

// Shopify oAuth
authRouter.post('/shopify', authenticate, authController.initiateShopifyOAuth)
authRouter.get('/callback/shopify', authController.handleShopifyCallback)

export default authRouter