import { ErrorType } from './errorTypes';

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number,
    isOperational: boolean = true
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode || 500;
    this.isOperational = isOperational;
    // Customize stack trace
    Error.captureStackTrace(this, this.constructor);
    this.stack = this.customizeStackTrace(this.stack);
  }

  private customizeStackTrace(stack: string | undefined): string {
    if (!stack) return '';
    const lines = stack.split('\n');
    // return [lines[0], this.message].join('\n');
    // Keep the error message and the first 3 lines of the stack trace
    return lines.slice(0, 4).join('\n');
  }
}
