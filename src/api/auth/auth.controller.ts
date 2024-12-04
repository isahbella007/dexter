import { Request, Response } from "express";
import { asyncHandler } from "../../utils/helpers/asyncHandler";
import { changePasswordSchema, loginSchema, registerSchema, requestPasswordResetSchema, resetPasswordSchema, setupMFASchema, verifyEmailSchema, verifyMFASetupSchema } from "./auth.schema";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { authService } from "./auth.service";
import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";
import { config } from "../../config";
import { User } from "../../models/User";
import { generateToken } from "../../utils/helpers/jwt";
import { verifyRefreshToken } from "../../utils/helpers/jwt";
import { IUser } from "../../models/interfaces/UserInterface";

export const authController = { 
    register: asyncHandler(async(req:Request, res:Response) => { 
        const {error, value} = registerSchema.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)
        const user = await authService.registerUser(value);
        const responseData = { userId: user._id };
        ResponseFormatter.success(
            res,
            responseData,
            'User registered successfully. Please check your email to verify your account.'
        );
    }), 

    setupMFA: asyncHandler(async (req: Request, res: Response) => {
        const { error, value } = setupMFASchema.validate(req.query);
        if (error) throw ErrorBuilder.badRequest(error.details[0].message);

        const result = await authService.setUpMFA((req.user as IUser)._id);
        ResponseFormatter.success(res, result, 'MFA setup initialized');
    }),

    verifyMFASetup: asyncHandler(async (req: Request, res: Response) => {
        const { error, value } = verifyMFASetupSchema.validate(req.body);
        if (error) throw ErrorBuilder.badRequest(error.details[0].message);

        const result = await authService.verifyAndEnableMFA((req.user as IUser)._id, value.token);
        ResponseFormatter.success(res, result, 'MFA setup completed');
    }),

    login: asyncHandler(async(req:Request, res:Response) => { 
        const {error, value} = loginSchema.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)
    
        const result = await authService.login(value)
         
        // If MFA is required
        if (result.requireMFA) {
            return ResponseFormatter.success(res, { requireMFA: true, userId: result.userId }, 'MFA required');
        }
        const responseData = { 
            accessToken: result.accessToken, 
            refreshToken: result.refreshToken, 
            user: result.user
        }
        ResponseFormatter.success(res, responseData, 'Login successful');
    }),

    verifyEmail: asyncHandler(async(req:Request, res:Response) => { 
        const { error, value } = verifyEmailSchema.validate(req.query);
        if (error) {
            throw ErrorBuilder.badRequest(error.details[0].message);
        }

        console.log('the value sent =>', JSON.stringify(value))
        await authService.verifyEmail(value.token);

        // Check if the client accepts JSON
        if (req.headers.accept?.includes('application/json')) {
            return ResponseFormatter.success(res, null, 'Email verified successfully');
        }

        // Otherwise Redirect to the app with success parameter
        const redirectUrl = new URL('/', config.appUrl);
        redirectUrl.searchParams.set('status', 'success');
        redirectUrl.searchParams.set('message', 'Email verified successfully');

        res.redirect(redirectUrl.toString());
    }),

    resendEmailVerification: asyncHandler(async (req:Request,res:Response) => { 
        const {error, value} = requestPasswordResetSchema.validate(req.body)
        if (error) {
            throw ErrorBuilder.badRequest(error.details[0].message);
        }
        await authService.resendVerificationEmail(value.email)
        ResponseFormatter.success(res, {}, 'Email sent. Please check your email to verify your account')
    }),

    requestPasswordReset: asyncHandler(async (req: Request, res: Response) => {
        const { error, value } = requestPasswordResetSchema.validate(req.body);
        if (error) {
          throw ErrorBuilder.badRequest(error.details[0].message);
        }
    
        await authService.requestPasswordReset(value.email);
        ResponseFormatter.success(
          res,
          null,
          'If an account with that email exists, we have sent a password reset link'
        );
    }),

    resetPassword: asyncHandler(async (req: Request, res: Response) => {
        const { error, value } = resetPasswordSchema.validate(req.body);
        if (error) {
          throw ErrorBuilder.badRequest(error.details[0].message);
        }
    
        await authService.resetPassword(value.token, value.newPassword);
        ResponseFormatter.success(
          res,
          null,
          'Password has been reset successfully'
        );
    }),

    changePassword: asyncHandler(async (req: Request, res: Response) => {
        const { error, value } = changePasswordSchema.validate(req.body);
        if (error) {
          throw ErrorBuilder.badRequest(error.details[0].message);
        }
    
        const userId = (req.user as IUser)._id;
        await authService.changePassword(
          userId,
          value.currentPassword,
          value.newPassword
        );
        ResponseFormatter.success(res, null, 'Password changed successfully');
    }),

    refreshToken: asyncHandler(async(req:Request, res:Response) => { 
        // we need the refresh token from the user and need to check if it is a valid refresh token 
        const {refreshToken} =req.body
        if (!refreshToken) {
            throw ErrorBuilder.badRequest('Refresh token is required');
        }
        const user = await verifyRefreshToken(refreshToken)
        console.log('user =>', JSON.stringify(user))

        const existingUser = await User.findById(user.id);
        if (!existingUser) {
            throw ErrorBuilder.notFound('User not found');
        }
        // Generate a new access token
        const accessToken = await generateToken(existingUser);
        const responseData = { 
            accessToken: accessToken
        }
        return ResponseFormatter.success(res, responseData, 'Access token regenerated')
    }),

    logout: asyncHandler(async(req:Request, res:Response) => { 
         // Frontend will handle:
        // 1. Clearing localStorage/cookies
        // 2. Removing the access token
        // 3. Removing the refresh token
        // 4. Redirecting to login page
        
        ResponseFormatter.success(res, null, 'Logged out successfully');
    })
}