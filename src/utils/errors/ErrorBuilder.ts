import { AppError } from './AppError';
import { ErrorType } from './errorTypes';

export class ErrorBuilder {
  private message: string = '';
  private type: ErrorType = ErrorType.INTERNAL;
  private statusCode: number = 500;
  private isOperational: boolean = true;

  setMessage(message: string): ErrorBuilder {
    this.message = message;
    return this;
  }

  setType(type: ErrorType): ErrorBuilder {
    this.type = type;
    return this;
  }

  setStatusCode(statusCode: number): ErrorBuilder {
    this.statusCode = statusCode;
    return this;
  }

  setOperational(isOperational: boolean): ErrorBuilder {
    this.isOperational = isOperational;
    return this;
  }

  build(): AppError {
    return new AppError(
      this.message,
      this.type,
      this.statusCode,
      this.isOperational
    );
  }

  // Convenience methods for common error types
  static badRequest(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.VALIDATION)
      .setStatusCode(400)
      .build();
  }

  static unauthorized(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.UNAUTHORIZED)
      .setStatusCode(401)
      .build();
  }

  static paymentRequired(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.PAYMENT_REQURIED)
      .setStatusCode(402)
      .build();
  }

  static paymentProcessingError(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.PAYMENT_REQURIED)
      .setStatusCode(402)
      .build();
  }

  static forbidden(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.FORBIDDEN)
      .setStatusCode(403)
      .build();
  }

  static notFound(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.NOT_FOUND)
      .setStatusCode(404)
      .build();
  }

  static conflict(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.CONFLICT)
      .setStatusCode(409)
      .build();
  }

  static internal(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.INTERNAL)
      .setStatusCode(500)
      .build();
  }

  static tooManyRequests(message: string): AppError {
    return new ErrorBuilder()
      .setMessage(message)
      .setType(ErrorType.RATE_LIMIT)
      .setStatusCode(429)
      .build();
  }
}
