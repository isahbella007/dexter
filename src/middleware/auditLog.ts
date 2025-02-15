import { Request, Response, NextFunction } from 'express';
import {User} from '../models/User'; // Import User model
import { IAuditLog, AuditLog } from '../models/AuditLog'; // Import AuditLog model and interface
import { diff } from 'deep-diff';
import { IUser } from '../models/interfaces/UserInterface';

export const createAuditLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) {
            return next(new Error('User ID is required.'));
        }

        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return next(new Error('User not found.'));
        }

        // Use deep-diff to compare the existing user with the updates
        const changes = diff(existingUser.toObject(), { ...existingUser.toObject(), ...req.body });
        
        if (!changes || changes.length === 0) {
            // No changes detected, proceed without creating an audit log
            return next();
        }

        const formattedChanges = changes.map((change: any) => ({
            field: change.path?.join('.') || 'unknown',
            oldValue: change.lhs,
            newValue: change.rhs,
        }));

        const adminId = (req.user as IUser)?._id;

        // Create the audit log entry
        const auditLog: IAuditLog = new AuditLog({
            user: userId,
            admin: adminId,
            changes: formattedChanges,
        });

        await auditLog.save();
        next();

    } catch (error: any) {
        next(error);
    }
};