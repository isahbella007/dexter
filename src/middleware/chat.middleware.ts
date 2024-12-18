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
        // Check for existing visitor ID in cookies

        let visitorId = req.cookies.visitorId;
        console.log(' the visitor id in the chat middleware =>', visitorId)

        const clientIp = getClientIp(req);
        console.log('The client IP is', clientIp)
        // check if the IP already has a registered user 
        // !!TODO:: Uncomment this 
        // const existingUser = await User.findOne({ ipAddress: clientIp });
        // if(existingUser){ 
        //     throw ErrorBuilder.forbidden('An account already exists with this IP address. Please login to continue.')
        // }
        
        if (visitorId == undefined) {
            // Generate new visitor ID
            visitorId = uuidv4();
            console.log('the new visitor id is =>', visitorId)
            
            // Set cookie with appropriate options
            res.cookie('visitorId', visitorId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'strict'
            });
        }
        // Attach visitor info to request
        (req as Express.Request & { visitor?: { id: string, isVisitor: boolean, ip: string } }).visitor = {
            id: visitorId,
            isVisitor: true, 
            ip:clientIp
        };

        next();
    } catch (error) {
        next(error);
    }
}; 