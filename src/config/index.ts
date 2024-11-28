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
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
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
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
  logLevel: envVars.LOG_LEVEL,
} as const;

// Type for the config object
export type Config = typeof config;
