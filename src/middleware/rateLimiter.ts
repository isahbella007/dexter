import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ErrorBuilder } from '../utils/errors/ErrorBuilder';

// Single operations limiter
const singleOperationsLimiter = new RateLimiterMemory({
    points: 5, // Number of requests
    duration: 60 // Per minute
});

// Bulk operations limiter
const bulkOperationsLimiter = new RateLimiterMemory({
    points: 100, // Number of requests
    duration: 300 // Per 5 minutes
});

export const rateLimitSingle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await singleOperationsLimiter.consume(req.params.userId || req.body.userId);
        next();
    } catch (error) {
        next(ErrorBuilder.tooManyRequests('Too many requests. Please try again later.'));
    }
};

export const rateLimitBulk = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await bulkOperationsLimiter.consume(req.params.userId || req.body.userId);
        next();
    } catch (error) {
        next(ErrorBuilder.tooManyRequests('Too many bulk requests. Please try again later.'));
    }
};
