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
import { getClientIp } from "../../utils/helpers/ipHelper";
import { oAuthService } from "./oAuth.service";
import { wordpressService, WordPressService } from "../../utils/services/wordpress.service";
import { wixService } from "../../utils/services/wix.service";
import { googleService } from "../../utils/services/google.services";
import { generateOAuthState, verifyOAuthState } from "../../utils/helpers/encrypt";
import { stateSecret } from "../../constant/systemPrompt";
import { shopifyService } from "../../utils/services/shopify.service";
import {createHmac} from 'crypto'

export const authController = { 
    register: asyncHandler(async(req:Request, res:Response) => { 
        const {error, value} = registerSchema.validate(req.body)
        if(error) throw ErrorBuilder.badRequest(error.details[0].message)
        
        const ipAddress = getClientIp(req);
        let visitorId:string | undefined = undefined;
        
        console.log('there is a visitor id in the cookies =>', req.cookies.visitorId)
        if(req.cookies.visitorId){ 
            console.log('found')
            visitorId = req.cookies.visitorId
            console.log(visitorId, (req as any).visitor)
        }
        const user = await authService.registerUser(value, ipAddress, visitorId);
        const responseData = { userId: user._id };
        if(visitorId){ 
            // Clear the visitor cookie by setting it to expire immediately
            res.cookie('visitorId', '', {
                httpOnly: true,
                secure: true,
                expires: new Date(0),
                maxAge: 0,
                sameSite: 'none'
            });

            (req as any).visitor = undefined
        }
        ResponseFormatter.success(
            res,
            responseData,
            'User registered successfully. Please check your email to verify your account.'
        );
    }), 

    setupMFA: asyncHandler(async (req: Request, res: Response) => {
        // const { error, value } = setupMFASchema.validate(req.query);
        // if (error) throw ErrorBuilder.badRequest(error.details[0].message);

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
    }),

    logoutAllDevices: asyncHandler(async(req:Request, res:Response) => { 
        const userId = (req.user as IUser)._id;
        await authService.logoutFromAllDevices(userId);
        ResponseFormatter.success(res, null, 'Logged out from all devices successfully');
    }),

    getHubSpotAccessToken: asyncHandler(async(req:Request, res:Response) => { 
        console.log('you are getting to the oauth for hubspot')
        const token = req.query.code as string
        if(!token) throw ErrorBuilder.badRequest('Token must be sent from hubspot')

        await oAuthService.getHubSpotAccessToken(token)
        ResponseFormatter.success(res, {}, 'App installed in your hub spot.')

        // TODO:: redirect the user to a frontend 
    }), 

    initiateWordPressOAuth: asyncHandler(async(req:Request, res:Response) => {
        // * generate a unique state parameter that includes encrypted 
        const state = await generateOAuthState((req.user as IUser)._id, stateSecret) 
        const authUrl = await wordpressService.getAuthorizationUrl(state)
        console.log('wordpress -> redirect auth', authUrl)
        res.redirect(authUrl)
    }), 

    handleWordPressCallback: asyncHandler(async(req:Request, res:Response) => { 
        const {code, state} = req.query
        console.log('cose', code,state)

        if(!code) throw ErrorBuilder.forbidden('User denied dexter access to their wordpress account')

        if(!state) throw ErrorBuilder.badRequest('Missing state parameter')
        
        const userId = await verifyOAuthState(state as unknown as string, stateSecret)
        await wordpressService.handleAuthCallback(code as string, userId)
        // go back to the apps dashboard 
        ResponseFormatter.success(res, {}, 'Wordpress auth callback handled successfully')
    }), 

    initiateWixOAuth: asyncHandler(async(req:Request, res:Response) => { 
        const userId = req.user as IUser
        const authUrl = await wixService.getAuthorizationUrl(userId._id)
        console.log('the auth url =>', authUrl.redirectSession.fullUrl)
        ResponseFormatter.success(res, {redirectUrl: authUrl.redirectSession.fullUrl}, 'Wix auth url generated')
        
    }), 

    handleWixCallback: asyncHandler(async(req:Request, res:Response) => { 
        console.log('you are getting to the wix callback', req.query)
        const {code, state} = req.query

        if(!code || !state) throw ErrorBuilder.badRequest('Code and state are required')

        await wixService.handleAuthCallback(code as string, state as string)

        // TODO:: discuss where to take them back to on the frontend but for now 
        ResponseFormatter.success(res, {}, 'Wix auth callback handled successfully')
    }), 

    // get the wix member if this makes any damn sense 
    getWixMember: asyncHandler(async(req:Request, res:Response) =>{
        const userId = req.user as IUser
        await wixService.getMember(userId._id )
        ResponseFormatter.success(res, {}, 'Wix member fetched successfully')
    }), 

    //** */ google oauth
    initiateGoogleOAuth: asyncHandler(async(req:Request, res:Response) => { 
        console.log('the redirect url is coming here strange')
        const state = await generateOAuthState((req.user as IUser)._id, stateSecret)
        const authUrl = await googleService.getAuthorizationUrl(state)
        console.log('the auth url =>', authUrl)
        ResponseFormatter.success(res, {redirectUrl: authUrl}, 'Google auth url generated')
    }), 

    handleGoogleCallback: asyncHandler(async(req:Request, res:Response) => { 
        console.log('you are getting to the google callback', req.query)
        const {code, state} = req.query
        if(!code) throw ErrorBuilder.badRequest('User denied access to their Google account')

        const userId = await verifyOAuthState(state as unknown as string, stateSecret)
        await googleService.handleCallBack(code as string, userId as string)
        

        ResponseFormatter.success(res, {}, 'Google OAuth successful');
    }), 

    initiateShopifyOAuth: asyncHandler(async(req:Request, res:Response) => { 
        const {store} = req.body
        if(!store){ 
            throw ErrorBuilder.badRequest('Store is required')
        }
       const state = await generateOAuthState((req.user as IUser)._id, stateSecret)
       const authUrl = await shopifyService.getAuthorizationUrl(state, store as string)
       console.log('the auth url =>', authUrl)
       res.redirect(authUrl)
    }), 

    handleShopifyCallback: asyncHandler(async(req:Request, res:Response) => { 
        console.log('you are getting to the shopify callback', req.query)
        const { code, shop, state, hmac } = req.query;
        if(!code) throw ErrorBuilder.badRequest('User denied access to their Shopify account')

        if(!state) throw ErrorBuilder.badRequest('State is required')
        
        // Step 1: Validate the HMAC for security
        const queryParams = { ...req.query };
        delete queryParams["hmac"]; // Exclude the HMAC for verification
        const message = Object.keys(queryParams)
            .sort() // Sort keys
            .map((key) => `${key}=${queryParams[key]}`)
            .join("&");
        const generatedHmac = createHmac("sha256", config.shopify.clientSecret)
            .update(message)
            .digest("hex");

        if (generatedHmac !== hmac) {
            return res.status(403).send("HMAC validation failed.");
        }
        const userId = await verifyOAuthState(state as unknown as string, stateSecret)
        await shopifyService.handleCallback(code as string, userId as string, shop as string)
        ResponseFormatter.success(res, {}, 'Shopify OAuth successful');     
    })
}