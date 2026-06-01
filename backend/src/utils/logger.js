import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: 'info', // Default log level
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Log stack traces for errors
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        logFormat
      ),
    }),
    // You can add more transports here, e.g., for file logging in production
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' })
  ],
});

export default logger;
