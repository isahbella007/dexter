// src/config/index.ts
import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';

// Load environment-specific .env file
const envFile = path.resolve(
  __dirname,
  `../../.env.${process.env.NODE_ENV || 'development'}`
);
dotenv.config({ path: envFile });

// Define configuration schema
const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.string().required(),
  MONGODB_URI: Joi.string().required(),
  APP_URL:Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
    STRIPE_SECRET_KEY: Joi.string().required(), 
    STRIPE_WEBHOOK_KEY: Joi.string().required(),
    OPENAI_API_KEY: Joi.string().required()
}).unknown();

// Validate and extract the config
const { value: envVars, error } = configSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export the config object
export const config = {
  allowedOrigins: '*',
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongodbUri: envVars.MONGODB_URI,
  appUrl:envVars.APP_URL,
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  logLevel: envVars.LOG_LEVEL,
  apikeys: { 
    stripe: envVars.STRIPE_SECRET_KEY,
    stripeEndpoint: envVars.STRIPE_WEBHOOK_KEY, 
    openAI: envVars.OPENAI_API_KEY
  }
} as const;

// Type for the config object
export type Config = typeof config;
