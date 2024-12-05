import { Request } from 'express';

export const getClientIp = (req: Request): string => {
    // Check for proxied IP addresses
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0];
    }

    // Check various IP sources
    const ip = req.socket.remoteAddress || 
               req.headers['x-real-ip'] || 
               req.ip;

    // Convert IPv6 localhost to IPv4 format
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        return '127.0.0.1';
    }

    return ip as string;
}; 