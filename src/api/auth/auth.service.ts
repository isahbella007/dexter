import { authenticator } from "otplib";
import { User } from "../../models/User"
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder"
import { handleError } from "../../utils/helpers/general"
import { generateRefreshToken, generateToken } from "../../utils/helpers/jwt";
import { hashPassword } from "../../utils/helpers/passwordUtils"
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import { IUser } from "../../models/interfaces/UserInterface";
import { MigrationService } from "../../utils/services/migrationService";
import { emailService } from "../../utils/services/emailService";

export class AuthService{ 
    async registerUser(userData: Partial<IUser>, ipAddress:string, visitorId?:string): Promise<IUser>{ 
        try{ 
            const {email, password} = userData

            // Check for existing user
            let existingUser = null
            // if there is a visitorId, check if the user exists with that visitorId
            if(visitorId !== undefined && userData.email !== undefined){ 
                console.log('the visitor id is =>', visitorId)
                existingUser = await User.findOne({ 
                    $or: [
                        { email },
                        // { ipAddress }
                        {visitorId}
                    ]
                });
            } 

            // if there is no visitorId, check if the user exists with the email
            if(visitorId === undefined && email !== undefined){ 
                existingUser = await User.findOne({ email });
            }
           
            if(existingUser) throw ErrorBuilder.badRequest('User already exists aaa')

            const {hash: passwordHash, salt} = await hashPassword(password as string)
            const verificationToken = uuidv4()
            const newUser = new User({ 
                email, 
                password: passwordHash, 
                emailVerificationToken: verificationToken, 
                emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                ipAddress,
                visitorId
            })

            if(visitorId){ 
                await MigrationService.migrateVisitorChats(newUser._id, visitorId, newUser?.ipAddress as string)
            }
            await newUser.save()
            // send the user the verification email 
            // await this.sendVerificationEmail(newUser.email, verificationToken)
            return newUser
        }catch(error){ 
            console.log('error', error)
            throw handleError(error, 'registerUser')
        }
    }

    async setUpMFA(userId:string){ 
        authenticator.options={
            window:1
        }
        const user = await User.findById(userId)
        if(!user){ 
            throw ErrorBuilder.notFound('User not found')
        }
        
        // Generate a new secret using speakeasy
        const secret = speakeasy.generateSecret({
            name: `Dexter:${user.email}`,  // This will show up in the authenticator app
            issuer: 'Dexter'  // Your app name
        });
        // Store secret temporarily until verification
        user.mfa = {
            secret: secret.base32,
            enabled: false,
            backupCodes: []
        };
        await user.save();
        
        return { secret: secret.base32, otpauth: secret.otpauth_url };
    }
  // After scanning QR code, user enters the code from authenticator:
    async verifyAndEnableMFA(userId: string, token: string) {
        console.log('userId =>', userId)
        console.log('token =>', token)
        const user = await User.findById(userId);
        if (!user?.mfa?.secret) throw ErrorBuilder.badRequest('MFA not initialized');

         // Verify the token against the secret
         const verified = speakeasy.totp.verify({
            secret: user.mfa.secret,
            encoding: 'base32',
            token: token,
            window: 1  // Allow for 1 step before/after for time drift
        });

        console.error(JSON.stringify(verified))
        if (!verified) {
            throw ErrorBuilder.unauthorized('Invalid code',);
        }

        // Enable MFA
        user.mfa.enabled = true;
        await user.save();

        return { success: true };
    }

    async login(credentials: Partial<IUser>) {
        let user: IUser | null = null;
     
        if (credentials.email && credentials.password) {
            user = await this.validateEmailPassword(credentials.email, credentials.password);
        }
        if (!user) {
            throw ErrorBuilder.unauthorized('Invalid credentials');
        }

        if (!user.isEmailVerified) {
            throw ErrorBuilder.unauthorized(
                'Email not verified. Please check your email for verification instructions.'
            );
        }

        // If MFA is enabled, verify the token
        if (user.mfa?.enabled) {
            if (!credentials.mfaToken) {
                return { requireMFA: true, userId: user._id };
            }

            // Get user with MFA secret
            user = await User.findById(user._id).select('+mfa.secret');

            const verified = speakeasy.totp.verify({
                secret: user!.mfa.secret!,
                encoding: 'base32',
                token: credentials.mfaToken,
                window: 1
            });

            if (!verified) {
                throw ErrorBuilder.unauthorized('Invalid MFA code');
            }
        }

        if (!user) {
            throw ErrorBuilder.unauthorized('Invalid credentials');
        }

        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        return { user, accessToken, refreshToken };
    }

    async verifyEmail(token: string): Promise<IUser> {
        try {
            const now = Date.now();
            const user = await User.findOne({
                emailVerificationToken: token,
                emailVerificationExpires: { $gt: Date.now() },
            });
        
            if (!user) {
                throw ErrorBuilder.badRequest('Invalid or expired verification token');
            }
        
            user.isEmailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
        
            await user.save();
        
            return user;
        } catch (error) {
          throw handleError(error, 'verifyEmail');
        }
    }

    // in the frontend, if their verfication token has expired, send then a verification token again 
    async resendVerificationEmail(email: string): Promise<void> {
        try {
          const user = await User.findOne({ email });
          if (!user) {
            // Don't reveal that the user doesn't exist
            return;
          }
    
          if (user.isEmailVerified) {
            throw ErrorBuilder.badRequest('Email is already verified');
          }
    
          const verificationToken = uuidv4();
          user.emailVerificationToken = verificationToken;
          user.emailVerificationExpires = new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ); // 24 hours
          await user.save();
    
          await this.sendVerificationEmail(email, verificationToken);
        } catch (error) {
          throw handleError(error, 'resendVerificationEmail', { email });
        }
    }

    // flow: on the ui, the reset password btn is displayed and they enter their email. They are sent the token and the frontend url. When they click on the url, they go to the frontend page and enter this new password. rest password is in charge of that
    async requestPasswordReset(email: string): Promise<void>{ 
        try{ 
            const user = await User.findOne({ email });
            if (!user) {
              // Don't reveal that the user doesn't exist
              return;
            }
      
            const resetToken = uuidv4();
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
            user.passwordResetToken = resetToken;
            user.passwordResetExpires = resetExpires;
            await user.save();
      
            await this.sendPasswordResetEmail(email, resetToken);
        }catch(error){ 
            throw handleError(error, 'requestPasswordReset')
        }
    }
    
    async resetPassword(token: string, newPassword:string): Promise<void>{ 
        try {
            const user = await User.findOne({
              passwordResetToken: token,
              passwordResetExpires: { $gt: Date.now() },
            });
      
            if (!user) {
              throw ErrorBuilder.badRequest(
                'Invalid or expired password reset token'
              );
            }
      
            const { hash: passwordHash } = await hashPassword(newPassword);
            user.password = passwordHash;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
      
            await user.save();
          } catch (error) {
            throw handleError(error, 'resetPassword');
        }
    }

    // this is for authenticated users only 
    async changePassword(userId:string,currentPassword: string,newPassword: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw ErrorBuilder.notFound('User not found');
            }
        
            const isValidPassword = await user.comparePassword(currentPassword);
            if (!isValidPassword) {
                throw ErrorBuilder.unauthorized('Current password is incorrect');
            }
        
            const { hash: passwordHash } = await hashPassword(newPassword);
            user.password = passwordHash;
            await user.save();
        } catch (error) {
          throw handleError(error, 'changePassword', { userId });
        }
    }

    async logout(userId: string){ 

    }

    async logoutFromAllDevices(userId: string) {
        const user = await User.findById(userId);
        if (!user) {
          throw ErrorBuilder.notFound("User not found");
        }
    
        // Clear MFA settings completely
        user.mfa.secret = undefined;
        user.mfa.enabled = false;
        user.tokenVersion = (user.tokenVersion || 0) + 1;

        await user.save();
    
        return {
          message: "Successfully logged out from all devices and disabled MFA"
        };
    }
    // private classes
    private async validateEmailPassword(
        email: string,
        password: string
      ): Promise<IUser | null> {
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
          return null;
        }
        return user;
    }

    private async sendPasswordResetEmail(email:string, token:string): Promise<void>{ 
        // call the emailService you set up here
        await emailService.sendPasswordResetEmail(email, token);
    }

    private async sendVerificationEmail(email:string, token: string): Promise<void>{ 
        // call the emailService that will handle sending email verification
        await emailService.sendVerificationEmail(email, token);
    }
}

export const authService = new AuthService()