import morgan from 'morgan';
import { logger } from './logger';

const stream = {
  write: (message: string) => logger.http(message.trim()), // Ensure trimming and logging in the correct format
};

// Define a custom format for morgan logs if needed
const morganFormat =
  ':method :url :status :response-time ms - :res[content-length]';

// Initialize morgan middleware with custom stream
const httpLogger = morgan(morganFormat, { stream });

export default httpLogger;
