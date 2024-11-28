import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { ErrorBuilder } from '../utils/errors/ErrorBuilder';
import { config } from '../config';

interface JwtPayload {
    id: string;
    email: string;
    role: string;
  }
  
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw ErrorBuilder.unauthorized('No token provided');
      }
  
      const token = authHeader.split(' ')[1]; // Bearer <token>
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
  
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        throw ErrorBuilder.unauthorized('User not found');
      }
  
      if (user.isEmailVerified === false) {
        throw ErrorBuilder.forbidden(
          'Email not verified. Please verify your email to access this resource.'
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