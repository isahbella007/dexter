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

export default authRouter