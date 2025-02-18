import { Router } from "express";
import { SubscriberController } from "./subscribers.controller";
import { createAuditLog } from "../../middleware/auditLog";

const subscriberRouter = Router()

subscriberRouter.get('/', SubscriberController.getSubscribers)
subscriberRouter.patch('/', createAuditLog, SubscriberController.editSubscriberInfo)
subscriberRouter.get('/history', SubscriberController.getSubscriberHistory)
subscriberRouter.get('/history/export/csv', SubscriberController.exportSubscriberHistoryCSV)
subscriberRouter.get('/history/export/pdf', SubscriberController.exportSubscriberHistoryPDF)

subscriberRouter.get('/payment', SubscriberController.getPayment)
subscriberRouter.get('/export/csv', SubscriberController.exportSubscribersCSV)
subscriberRouter.get('/export/pdf', SubscriberController.exportSubscribersPDF)

subscriberRouter.get('/admin/logs', SubscriberController.getAuditLogs)
export default subscriberRouter