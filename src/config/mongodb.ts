import mongoose from 'mongoose';
import { logger } from '../utils/helpers/logger'; // Assume we have a logger utility
import { config } from '.';

const MONGODB_URI = config.mongodbUri;

const options: mongoose.ConnectOptions = {
  autoIndex: true,
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

export async function connectToDatabase(): Promise<void> {
  try {
    logger.info('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, options);
    logger.info('Successfully connected to MongoDB');

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    // Log more details about the error
    if (error instanceof Error) {
      logger.error('Error name:', error.name);
      logger.error('Error message:', error.message);
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

export function getMongoDBUri(): string {
  return MONGODB_URI;
}

export default mongoose;
