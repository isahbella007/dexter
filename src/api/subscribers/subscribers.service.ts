import { AuditLog } from "../../models/AuditLog";
import { IUser } from "../../models/interfaces/UserInterface"
import { User } from "../../models/User"
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { generateAllStatusHistoryCSV, generateAllStatusHistoryPDF, generateStatusHistoryCSV, generateStatusHistoryPDF } from "../../utils/helpers/exportHelper";

interface PaymentInfo {
    subscriberEmail: string;
    paymentAmount: number | undefined;
    paymentMethod: string | undefined;
    invoiceDetails?: {
        invoiceId?: string;
        hostedInvoiceUrl?: string;
        invoiceUrl?: string;
    };
    paymentStatus: string | undefined;
    paymentStartDate: Date | undefined;
    paymentEndDate: Date | undefined 
  }
  
  interface PaymentHistoryResponse {
      payments: PaymentInfo[];
      totalPayments: number;
      totalPages: number;
  }

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


    async getPaymentHistory (page: number,limit: number, startDate?: Date,endDate?: Date,subscriber?: string, status?: string, price?: number): Promise<PaymentHistoryResponse> {     
        try{ 
            // 1. Build the Query
            const query: any = {};
                
            // Date range filter
            if (startDate || endDate) {
                
                query['subscription.statusHistory.date'] = {};
                if (startDate) {
                    query['subscription.statusHistory.date'].$gte = startDate;
                }
                if (endDate) {
                    query['subscription.statusHistory.date'].$lte = endDate;
                }
            }

            // Subscriber filter (assuming email for now, could be adapted)
            if (subscriber) {
                query.$or = [
                    { email: subscriber },
                    // Add other fields to search by if needed (e.g., name)
                ];
            }

            // Status filter
            if (status) {
                query['subscription.statusHistory.status'] = status;
            }

            if(price){ 
                query['subscription.statusHistory.price'] = price
            }
            // 2.  Get Total Count (for pagination)
            // The aggregation pipeline is constructed based on the query built in step 1.
            const totalPaymentsAggregation = await User.aggregate([
                { $match: query }, // Apply filters from the initial query
                { $unwind: '$subscription.statusHistory' }, // Deconstruct the statusHistory array
                { $match: query },  // IMPORTANT: Apply the filters *again* after unwinding
                { $count: 'total' } // Count the resulting documents
            ]);

            const totalPayments = totalPaymentsAggregation.length > 0 ? totalPaymentsAggregation[0].total : 0;
            const totalPages = Math.ceil(totalPayments / limit);

            // 3. Perform the Paginated Query with Aggregation
            const paymentsAggregation = await User.aggregate([
                { $match: query }, // Initial filter
                { $unwind: '$subscription.statusHistory' }, // Deconstruct statusHistory
                { $match: query }, // Re-apply filters after unwind!  Crucial.
                {
                    $project: {
                        _id: 0,
                        subscriberEmail: '$email',
                        paymentAmount: '$subscription.statusHistory.price',
                        paymentMethod: '$subscription.statusHistory.paymentMethod',
                        invoiceDetails: {
                            invoiceId: '$subscription.statusHistory.invoiceId',
                            hostedInvoiceUrl: '$subscription.statusHistory.hostedInvoiceUrl',
                            invoiceUrl: '$subscription.statusHistory.invoiceUrl',
                        },
                        paymentStatus: '$subscription.statusHistory.status',
                        paymentStartDate: '$subscription.statusHistory.startDate',
                        paymentEndDate: '$subscription.statusHistory.endDate'
                    },
                },
                { $sort: { 'transactionId': -1 } }, // Sort by transaction ID (or date)
                { $skip: (page - 1) * limit },
                { $limit: limit },
            ]);

            // 4.  Format and Return Results
            const payments: PaymentInfo[] = paymentsAggregation.map(payment => ({
                subscriberEmail: payment.subscriberEmail,
                paymentAmount: payment.paymentAmount,
                paymentMethod: payment.paymentMethod,
                invoiceDetails: payment.invoiceDetails,
                paymentStatus: payment.paymentStatus, 
                paymentStartDate: payment.paymentStartDate, 
                paymentEndDate: payment.paymentEndDate
            }));

            return {
                payments,
                totalPayments,
                totalPages
            };
        }catch(error: any){ 
            throw ErrorBuilder.internal(error.message)
        }
       
    };
}

export const subscribersService = new SubscribersService()
