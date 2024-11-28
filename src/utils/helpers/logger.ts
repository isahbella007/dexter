import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../../config';
import { addColors } from 'winston/lib/winston/config';
const { combine, timestamp, printf, colorize, errors } = format;

const isProduction = config.env === 'production';

// Define custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

// Apply custom log levels and colors
// require("winston").addColors(customLevels.colors);
addColors(customLevels.colors);

// Define custom log format
const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Create the logger instance
const logger: Logger = createLogger({
  levels: customLevels.levels,
  level: isProduction ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    customFormat,
    colorize()
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
});

export { logger };
