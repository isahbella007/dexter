import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { ErrorBuilder } from '../utils/errors/ErrorBuilder';
import { config } from '../config';

interface JwtPayload {
    id: string;
    email: string;
    tokenVersion: number;
    role?: string;
    iat?: number;
    exp?: number
  }
  
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw ErrorBuilder.unauthorized('No token provided uuuu');
      }
  
      const token = authHeader.split(' ')[1]; // Bearer <token>
      const decoded = jwt.verify(token, config.jwt.secret) as Partial<JwtPayload>;
  
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        throw ErrorBuilder.unauthorized('User not found');
      }

      let decodedTokenVersion = decoded.tokenVersion ? decoded.tokenVersion : 0
      if(user.tokenVersion !== decodedTokenVersion){
        console.log('user token version', user.tokenVersion)
        console.log('decoded token version', decoded.tokenVersion)
        throw ErrorBuilder.unauthorized('Token version mismatch. You must have signed out from all devices. Sign in again');
      }
  
      if (!user.isEmailVerified) {
        throw ErrorBuilder.forbidden(
          'Please verify your email to continue using Dexter API'
        );
      }
  
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return next(ErrorBuilder.unauthorized('Invalid token'));
      }
      if (error instanceof jwt.TokenExpiredError) {
        return next(ErrorBuilder.unauthorized('Token expired'));
      }
      next(error);
    }
  };