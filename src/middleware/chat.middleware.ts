import { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import { getClientIp } from '../utils/helpers/ipHelper';
import { User } from '../models/User';
import { ErrorBuilder } from '../utils/errors/ErrorBuilder';

export const chatAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // First try to authenticate the user
        const authHeader = req.headers.authorization;
        
        if (authHeader) {
            // If there's an auth header, use the regular authentication
            return authenticate(req, res, next);
        }

        // If no auth header, treat as visitor
        const clientIp = getClientIp(req);
        
        // IMPORTANT: Always check cookie first
        let visitorId = req.cookies.visitorId;
        console.log('Cookie visitorId:', visitorId);

        if (!visitorId) {
            // Only generate new if we don't have a cookie
            visitorId = uuidv4();
            console.log('Generated new visitor id:', visitorId);
            
            // Set cookie only when we generate a new ID
            res.cookie('visitorId', visitorId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            });
        }

        // IMPORTANT: Always attach the visitor object with the cookie value
        (req as Express.Request & { visitor?: { id: string, isVisitor: boolean, ip: string } }).visitor = {
            id: visitorId,
            isVisitor: true, 
            ip: clientIp
        };

        console.log('Attached visitor object:', (req as any).visitor);
        next();
    } catch (error) {
        next(error);
    }
}; 