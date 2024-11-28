/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { AppError } from './AppError';
import { ErrorType } from './errorTypes';
import { config } from '../../config';

class ResponseFormatter {
  static success(
    res: Response,
    data: any,
    message: string = 'Success',
    status: number = 200
  ) {
    // Handle primitive types
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      res.status(status).json({
        success: true,
        message,
        data: { value: data }
      });
      return;
    }

    // Handle paginated responses
    if (data && typeof data === 'object' && this.isPaginatedResponse(data)) {
      res.status(status).json({
        success: true,
        message,
        data: data.data,
        metadata: data.metadata
      });
      return;
    }

    // Handle regular objects/arrays
    res.status(status).json({
      success: true,
      message,
      data
    });
  }

  private static isPaginatedResponse(
    data: any
  ): boolean {
    const value = data.data;
    return value && typeof value === 'object' && 'metadata' in data;
  }

  static error(res: Response, error: AppError): void {
    const statusCode =
      error.statusCode && !isNaN(error.statusCode) ? error.statusCode : 500;
    const response: any = {
      status: 'error',
      type: error.type || ErrorType.UNKNOWN,
      message: error.message || 'An unexpected error occurred',
    };

    if (config.env === 'development') {
      response.stack = error.stack;
    }

    if (error.type === ErrorType.VALIDATION) {
      response.errors = error.errors;
    }

    res.status(statusCode).json(response);
  }
}

export { ResponseFormatter };
