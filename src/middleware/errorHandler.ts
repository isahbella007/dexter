import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors/AppError';
import { logger } from '../utils/helpers/logger';
import { ResponseFormatter } from '../utils/errors/ResponseFormatter';
import { ErrorBuilder } from '../utils/errors/ErrorBuilder';

class ErrorHandler {
  public static handle(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    let error: AppError;

    if (err instanceof AppError) {
      error = err;
    } else if (err.name === 'ValidationError') {
      error = ErrorBuilder.badRequest(err.message);
    } else if (err.name === 'CastError') {
      error = ErrorBuilder.badRequest('Invalid ID format');
    } else {
      error = ErrorBuilder.internal('An unexpected error occurred');
      logger.error('Unhandled error:', err);
    }

    ResponseFormatter.error(res, error);

    // Log the error
    logger.error(`${error.name}: ${error.message}`, {
      stack: error.stack,
      path: req.path,
      method: req.method,
      statusCode: error.statusCode,
    });
    next();
  }

  public static notFound(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    next(ErrorBuilder.notFound('Resource not found'));
  }
}

export { ErrorHandler };
