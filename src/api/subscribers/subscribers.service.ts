import { AuditLog } from "../../models/AuditLog";
import { IUser } from "../../models/interfaces/UserInterface"
import { User } from "../../models/User"
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { generateAllStatusHistoryCSV, generateAllStatusHistoryPDF, generateStatusHistoryCSV, generateStatusHistoryPDF } from "../../utils/helpers/exportHelper";

export class SubscribersService { 
    async getSubscribers( page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
    
        const subscribers = await User.find({ role: { $ne: 'admin' } })
            .skip(skip)
            .limit(limit)
            .select('email subscription role') // Add other fields as needed
            .exec();
    
        const total = await User.countDocuments({ role: { $ne: 'admin' } });
    
        return {
            subscribers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async editSubscriberInfo(userId: string, subscriberDetails: IUser) { 
        const subscriber = await User.findByIdAndUpdate({_id: userId}, subscriberDetails, {new: true})
        return subscriber
    }

    async getSubscriberHistory(userId: string){
        const user = await User.findById(userId)
        .select('email subscription.statusHistory') // Keep this projection
        .exec();

        if (!user) {
            throw ErrorBuilder.notFound('User not found')
        }

        return user;
    }

    async exportSubscriberHistoryCSV(userId: string){
        const user = await this.getSubscriberHistory(userId)
        const csv = generateStatusHistoryCSV(user.subscription.statusHistory)
        return csv
    }

    async exportSubscriberHistoryPDF(userId: string){
        const user = await this.getSubscriberHistory(userId)
        const pdf = generateStatusHistoryPDF(user.subscription.statusHistory, user.email)
        return pdf
    }

    async exportSubscribersCSV(){
        const subscribers = await User.find({ role: { $ne: 'admin' } })
            .select('email subscription role') // Add other fields as needed
            .exec();
        if(!subscribers) throw ErrorBuilder.notFound('No subscribers found')
         // Transform subscribers to match CustomerStatusHistory interface
        const formattedData = subscribers.map(subscriber => ({
            customerEmail: subscriber.email,
            statusHistory: subscriber.subscription?.statusHistory || []
        }));

        const csv = generateAllStatusHistoryCSV(formattedData);
        return csv;
    }

    async exportSubscribersPDF(){
        const subscribers = await User.find({ role: { $ne: 'admin' } })
            .select('email subscription role') // Add other fields as needed
            .exec();

        if(!subscribers) throw ErrorBuilder.notFound('No subscribers found')
            // Transform subscribers to match CustomerStatusHistory interface
            const formattedData = subscribers.map(subscriber => ({
                customerEmail: subscriber.email,
                statusHistory: subscriber.subscription?.statusHistory || []
            }));
       
        const pdf = generateAllStatusHistoryPDF(formattedData);
        return pdf;
    }

    async getAuditLogs(page: number = 1, limit: number = 10, fromDate:string, endDate:string){
        try{ 
            const skip = (page - 1) * limit;
            const query: any = {};
    
             // Add date filter if provided
            if (fromDate) {
                const startDate = new Date(fromDate);
                startDate.setUTCHours(0, 0, 0, 0);

                if (endDate) {
                const finalDate = new Date(endDate);
                finalDate.setUTCHours(23, 59, 59, 999);

                query.createdAt = {
                    $gte: startDate,
                    $lte: finalDate
                };
                } else {
                // If only fromDate is provided, get all results from that date
                query.createdAt = {
                    $gte: startDate
                };
                }
            }
        
            // Fetch audit logs with populated user and admin fields
            const auditLogs = await AuditLog.find(query)
                .populate('user', 'email') // Only get email from user
                .populate('admin', 'email') // Only get email from admin
                .sort({ createdAt: -1 }) // Sort by most recent first
                .skip(skip)
                .limit(limit);
        
            // Format the response
            const formattedLogs = auditLogs.map(log => {
                const changes = log.changes
                .filter(change => change.newValue !== undefined) // Filter out changes with no new value
                .map(change => ({
                    field: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue
                }));
        
                return {
                userEmail: (log.user as any)?.email,
                authoredBy: (log.admin as any)?.email,
                changes,
                createdAt: log.createdAt
                };
            });
        
            // Get total count for pagination
            const totalCount = await AuditLog.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);
        
            return {
                auditLogs: formattedLogs,
                pagination: { 
                    currentPage: page,
                totalPages,
                totalItems: totalCount,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
                }
            };
    
        }catch (error: any){ 
            throw ErrorBuilder.internal(error.message)
        }
        
    }
}

export const subscribersService = new SubscribersService()
