import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";

const analyticsRouter = Router();

analyticsRouter.get('/sites', AnalyticsController.fetchSites);
analyticsRouter.get('/', AnalyticsController.fetchAnalytics);


export default analyticsRouter;
