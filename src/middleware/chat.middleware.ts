import { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth.middleware';
import { v4 as uuidv4 } from 'uuid';

export const chatAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // First try to authenticate the user
        const authHeader = req.headers.authorization;
        
        if (authHeader) {
            // If there's an auth header, use the regular authentication
            return authenticate(req, res, next);
        }

        // If no auth header, treat as visitor
        // Check for existing visitor ID in cookies
        let visitorId = req.cookies.visitorId;
        
        if (!visitorId) {
            // Generate new visitor ID
            visitorId = uuidv4();
            
            // Set cookie with appropriate options
            res.cookie('visitorId', visitorId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'strict'
            });
        }
        // Attach visitor info to request
        (req as Express.Request & { visitor?: { id: string, isVisitor: boolean } }).visitor = {
            id: visitorId,
            isVisitor: true
        };

        next();
    } catch (error) {
        next(error);
    }
}; 