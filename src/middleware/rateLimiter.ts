import rateLimit from 'express-rate-limit';
import { ResponseFormatter } from '../utils/errors/ResponseFormatter';
import { AppError } from '../utils/errors/AppError';
import { ErrorType } from '../utils/errors/errorTypes';

const GeneralRateLimiter = rateLimit({
  limit: 30,
  windowMs: 1 * 60 * 1000,
  message: 'Too many requests',
  statusCode: 429,
  standardHeaders: true,
  handler: (req, res) => {
    ResponseFormatter.error(
      res,
      new AppError(
        'Woah waohhh calm dow, too many requests!!!',
        ErrorType.RATE_LIMIT,
        429
      )
    );
  },
});

export { GeneralRateLimiter };
