import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import httpLogger from './utils/helpers/httpLogger';
import { connectToDatabase } from './config/mongodb';
import { logger } from './utils/helpers/logger';
import passport from 'passport';
// import './config/passport';
import path from 'path';
import session from 'express-session';
import { config } from './config';
import { ErrorHandler } from './middleware/errorHandler';
import { createSubPlan } from './scripts/subscriptionPlan';
import routes from './routes';
import cookieParser from 'cookie-parser';
import subscriptionRoutes from './api/subscription/subscription.routes';
import { SubscriptionController } from './api/subscription/subscription.controller';
import { schedulerService } from './utils/services/scheduler.service';

const app = express();

// Security Headers
app.use(helmet());
app.use(
  cors({
    origin: [config.allowedDevOrigins, config.allowedProdOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
  })
);

// In your Express setup, BEFORE routes
// app.use(express.raw({type: 'application/json'}));
app.use(cookieParser())
// Content Type

app.post('/subscription/webhook/?umm-stripe-webhook=true', express.raw({type: 'application/json'}), SubscriptionController.webhooks);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: config.jwt.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use(routes);

// Logging
app.use(httpLogger);


// Serve from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Global Error Handlers
app.use(ErrorHandler.notFound);
app.use(ErrorHandler.handle);

// Connect to MongoDB
connectToDatabase()
  .then(() => {
    logger.info('MongoDB connected successfully');
    // call the function that then creates the subscriptions used in the system with their product/plan id for free and pro
    // createSubPlan()
    // start the scheduler
    schedulerService.start().catch((error) => {
      logger.error('Failed to start scheduler:', error);
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

  

export default app;
