import mongoose from 'mongoose';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors/AppError';

interface ErrorLogMetadata {
  userId?: string;
  brandId?: string;
  resourceId?: string;
  additionalInfo?: Record<string, unknown>;
  [key: string]: unknown;
}

export const handleError = (
  error: unknown,
  context: string,
  metadata?: ErrorLogMetadata
): never => {
  const errorId = uuidv4();

  // Log error with structured metadata
  logger.error({
    errorId,
    context,
    ...metadata,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    timestamp: new Date().toISOString(),
  });

  // Handle known error types
  if (error instanceof mongoose.Error.CastError) {
    throw ErrorBuilder.badRequest(`Invalid ID format in ${context}`);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(error.errors).map((err) => err.message);
    throw ErrorBuilder.badRequest(messages.join('. '));
  }

  if (error instanceof mongoose.Error.DocumentNotFoundError) {
    throw ErrorBuilder.notFound(`Resource not found in ${context}`);
  }

  // Pass through our custom AppError
  if (error instanceof AppError) {
    throw error;
  }

  // Handle unexpected errors
  throw ErrorBuilder.internal(`An unexpected error occurred (ID: ${errorId})`);
};
