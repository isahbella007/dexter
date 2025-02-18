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
    OPENAI_API_KEY: Joi.string().required(),

    HUBSPOT_CLIENT_ID: Joi.string().required(),
    HUBSPOT_CLIENT_SECRET: Joi.string().required(),
    HUBSPOT_DEVELOPMENT_REDIRECT_URI: Joi.string().required(),
    HUBSPOT_PRODUCTION_REDIRECT_URI: Joi.string().optional(),

    WP_CLIENT_ID: Joi.string().required(),
    WP_CLIENT_SECRET: Joi.string().required(), 
    WP_DEVELOPMENT_REDIRECT_URI: Joi.string().required(),
    WP_PRODUCTION_REDIRECT_URI: Joi.string().optional(),

    WIX_CLIENT_ID: Joi.string().required(),
    WIX_SECRET: Joi.string().required(),
    WIX_INITIAL_REDIRECT_URI_DEVELOPMENT: Joi.string().required(),
    WIX_INITIAL_REDIRECT_URI_PRODUCTION: Joi.string().optional(),

    WIX_FINAL_REDIRECT_URI_DEVELOPMENT: Joi.string().required(),
    WIX_FINAL_REDIRECT_URI_PRODUCTION: Joi.string().optional(),
    



    GOOGLE_CLIENT_ID: Joi.string().required(),
    GOOGLE_CLIENT_SECRET: Joi.string().required(),
    GOOGLE_DEVELOPMENT_REDIRECT_URI: Joi.string().required(),
    GOOGLE_PRODUCTION_REDIRECT_URI: Joi.string().optional(),

    SHOPIFY_CLIENT_ID: Joi.string().required(),
    SHOPIFY_CLIENT_SECRET: Joi.string().required(),
    SHOPIFY_DEVELOPMENT_REDIRECT_URI: Joi.string().required(),
    SHOPIFY_PRODUCTION_REDIRECT_URI: Joi.string().optional(),

    UNSPLASH_APPLICATION_ID: Joi.string().required(),
    UNSPLASH_ACCESS_KEY: Joi.string().required(),
    UNSPLASH_SECRET_KEY: Joi.string().required(),

    LEONARDO_API_KEY: Joi.string().required()
}).unknown();

// Validate and extract the config
const { value: envVars, error } = configSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export the config object
export const config = {
  allowedDevOrigins: 'http://localhost:5173',
  allowedProdOrigins: 'https://my-dexter.vercel.app',
  allowedAdminProdOrigins: 'https://dexter-admin-theta.vercel.app/',
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongodbUri: envVars.MONGODB_URI,
  appUrl:envVars.APP_URL,
  baseUrl: envVars.BASE_URL,
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
  }, 
  email: { 
    user: envVars.EMAIL_APP,
    password: envVars.EMAIL_PASSWORD, 
    from: envVars.EMAIL_FROM
  }, 
 
  hubspot: { 
    clientId: envVars.HUBSPOT_CLIENT_ID,
    clientSecret: envVars.HUBSPOT_CLIENT_SECRET,
    developmentRedirectUri: envVars.HUBSPOT_DEVELOPMENT_REDIRECT_URI,
    productionRedirectUri: envVars.HUBSPOT_PRODUCTION_REDIRECT_URI
  }, 

  wordpress: { 
    clientId: envVars.WP_CLIENT_ID,
    clientSecret: envVars.WP_CLIENT_SECRET,
    developmentRedirectUri: envVars.WP_DEVELOPMENT_REDIRECT_URI,
    productionRedirectUri: envVars.WP_PRODUCTION_REDIRECT_URI
  }, 

  wix: { 
    clientId: envVars.WIX_CLIENT_ID,
    clientSecret: envVars.WIX_SECRET,
    initialDevelopmentRedirectUri: envVars.WIX_INITIAL_REDIRECT_URI_DEVELOPMENT,
    initialProductionRedirectUri: envVars.WIX_INITIAL_REDIRECT_URI_PRODUCTION,
    finalDevelopmentRedirectUri: envVars.WIX_FINAL_REDIRECT_URI_DEVELOPMENT,
    finalProductionRedirectUri: envVars.WIX_FINAL_REDIRECT_URI_PRODUCTION
  }, 



  google: { 
    clientId: envVars.GOOGLE_CLIENT_ID,
    clientSecret: envVars.GOOGLE_CLIENT_SECRET,
    developmentRedirectUri: envVars.GOOGLE_DEVELOPMENT_REDIRECT_URI,
    productionRedirectUri: envVars.GOOGLE_PRODUCTION_REDIRECT_URI
  }, 

  shopify: { 
    clientId: envVars.SHOPIFY_CLIENT_ID,
    clientSecret: envVars.SHOPIFY_CLIENT_SECRET,
    developmentRedirectUri: envVars.SHOPIFY_DEVELOPMENT_REDIRECT_URI,
    productionRedirectUri: envVars.SHOPIFY_PRODUCTION_REDIRECT_URI
  },

  unsplash: { 
    applicationId: envVars.UNSPLASH_APPLICATION_ID,
    accessKey: envVars.UNSPLASH_ACCESS_KEY,
    secretKey: envVars.UNSPLASH_SECRET_KEY
  }, 

  imageGeneration: {
    leonardoAI: envVars.LEONARDO_API_KEY
  }
  
} as const;

// Type for the config object
export type Config = typeof config;
