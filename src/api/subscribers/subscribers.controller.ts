import { ResponseFormatter } from "../../utils/errors/ResponseFormatter";
import { asyncHandler } from "../../utils/helpers/asyncHandler";
import { Request, Response } from "express";
import { ErrorBuilder } from "../../utils/errors/ErrorBuilder";
import { IUser } from "../../models/interfaces/UserInterface";
import { SubscribersService, subscribersService } from "./subscribers.service";

export const SubscriberController = { 
    getSubscribers: asyncHandler(async(req: Request, res: Response) => { 
        const page = parseInt(req.query.page as string) || 1; // Get page from query, default to 1
        const limit = parseInt(req.query.limit as string) || 10; // Get limit from query, default to 10

        const result = await subscribersService.getSubscribers( page, limit); // Pass page and limit

        ResponseFormatter.success(res, result, 'Subscribers fetched successfully')
    }), 

    editSubscriberInfo: asyncHandler(async(req: Request, res: Response) => { 
        const userId = req.query.userId as string
        const subscriber = await subscribersService.editSubscriberInfo(userId, req.body as IUser)
        ResponseFormatter.success(res, subscriber, 'Subscriber info updated successfully')
    }), 

    getSubscriberHistory: asyncHandler(async(req: Request, res: Response) => { 
        const userId = req.query.userId as string
        const subscriber = await subscribersService.getSubscriberHistory(userId)
        ResponseFormatter.success(res, subscriber, 'Subscriber history fetched successfully')
    }), 

    exportSubscriberHistoryCSV: asyncHandler(async(req: Request, res: Response) => { 
        const userId = req.query.userId as string
        if(!userId) throw ErrorBuilder.badRequest('User ID is required')
        const subscriberCSV = await subscribersService.exportSubscriberHistoryCSV(userId)
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subscription-history.csv');
        res.send(subscriberCSV);
    }), 

    exportSubscriberHistoryPDF: asyncHandler(async(req: Request, res: Response) => { 
        const userId = req.query.userId as string
        if(!userId) throw ErrorBuilder.badRequest('User ID is required')
        const subscriberPDF = await subscribersService.exportSubscriberHistoryPDF(userId)
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=subscription-history.pdf');
        res.send(subscriberPDF);
    }), 

    exportSubscribersCSV: asyncHandler(async(req: Request, res: Response) => { 
        const subscribersCSV = await subscribersService.exportSubscribersCSV()
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
        res.send(subscribersCSV);
    }), 

    exportSubscribersPDF: asyncHandler(async(req: Request, res: Response) => { 
        const subscribersPDF = await subscribersService.exportSubscribersPDF()
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.pdf');
        res.send(subscribersPDF);
    }), 

    getAuditLogs: asyncHandler(async(req: Request, res: Response) => { 
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const dateStr = req.query.date as string; // Expected format: YYYY-MM-DD
        const fromDate = req.query.fromDate as string;
        const endDate = req.query.endDate as string;
        // Date validation
        // Date validation
         const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
         if (fromDate) {
            if (!dateRegex.test(fromDate)) {
              throw ErrorBuilder.badRequest('fromDate must be in YYYY-MM-DD format');
            }
            const date = new Date(fromDate);
            if (isNaN(date.getTime())) {
              throw ErrorBuilder.badRequest('Invalid fromDate provided');
            }
          }
    
          if (endDate) {
            if (!dateRegex.test(endDate)) {
              throw ErrorBuilder.badRequest('endDate must be in YYYY-MM-DD format');
            }
            const date = new Date(endDate);
            if (isNaN(date.getTime())) {
              throw ErrorBuilder.badRequest('Invalid endDate provided');
            }
    
            // If both dates are provided, validate range
            if (fromDate && new Date(fromDate) > new Date(endDate)) {
              throw ErrorBuilder.badRequest('fromDate cannot be later than endDate');
            }
          }

        const auditLogs = await subscribersService.getAuditLogs(page, limit, fromDate, endDate)
        ResponseFormatter.success(res, auditLogs, 'Audit logs fetched successfully')
    }), 

    getPayment: asyncHandler(async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;
      const subscriber = req.query.subscriber as string | undefined;
      const status = req.query.status as string | undefined;
      const priceStr = req.query.price as string | undefined; 
  
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let price: number | undefined;
  
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
      // Helper function for date parsing and validation
      const parseDate = (dateStr: string | undefined): Date | undefined => {
          if (!dateStr) {
              return undefined;
          }
          if (!dateRegex.test(dateStr)) {
              throw ErrorBuilder.badRequest(`${dateStr} must be in YYYY-MM-DD format`);
          }
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
              throw ErrorBuilder.badRequest(`Invalid date provided: ${dateStr}`);
          }
          return date;
      };
  
      try {
          startDate = parseDate(startDateStr);
          endDate = parseDate(endDateStr);
  
          if (startDate && endDate && startDate > endDate) {
              throw ErrorBuilder.badRequest('startDate cannot be later than endDate');
          }

          // Parse price to number, handling undefined and invalid input
          if (priceStr) {
            const parsedPrice = parseFloat(priceStr);
            if (isNaN(parsedPrice)) {
                throw ErrorBuilder.badRequest('Invalid price provided');
            }
            price = parsedPrice;
          }
  
          const result = await subscribersService.getPaymentHistory(page, limit, startDate, endDate, subscriber, status, price);
          ResponseFormatter.success(res, result, 'All payment history');
  
      } catch (error) {
          // Catch any errors thrown by parseDate or getPaymentHistory
          throw error; // Re-throw the error to be handled by your global error handler
      }
  })
    
}