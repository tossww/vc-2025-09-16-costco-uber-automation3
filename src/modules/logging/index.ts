import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const sensitivePatterns = [
  /password["\s]*[:=]["\s]*["']?[\w\S]+["']?/gi,
  /token["\s]*[:=]["\s]*["']?[\w\S]+["']?/gi,
  /api[_-]?key["\s]*[:=]["\s]*["']?[\w\S]+["']?/gi,
  /secret["\s]*[:=]["\s]*["']?[\w\S]+["']?/gi,
  /\b\d{13,19}\b/g, // Credit card numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses in logs
  /Bearer\s+[\w\-.]+/gi, // Bearer tokens
  /code["\s]*[:=]["\s]*["']?\w{8,}["']?/gi, // Gift card codes
];

const sanitizeMessage = (message: any): any => {
  if (typeof message === 'string') {
    let sanitized = message;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }

  if (typeof message === 'object' && message !== null) {
    const sanitized: any = Array.isArray(message) ? [] : {};
    for (const key in message) {
      if (message.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('key') ||
          lowerKey.includes('code') ||
          lowerKey.includes('credential')
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitizeMessage(message[key]);
        }
      }
    }
    return sanitized;
  }

  return message;
};

const customFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const sanitizedMessage = sanitizeMessage(message);
  const sanitizedMeta = sanitizeMessage(meta);

  let logMessage = `${timestamp} [${level.toUpperCase()}]: ${
    typeof sanitizedMessage === 'object' ? JSON.stringify(sanitizedMessage) : sanitizedMessage
  }`;

  if (Object.keys(sanitizedMeta).length > 0) {
    logMessage += ` ${JSON.stringify(sanitizedMeta)}`;
  }

  return logMessage;
});

class Logger {
  private logger: winston.Logger;

  constructor(module: string = 'general') {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        customFormat
      ),
      defaultMeta: { module },
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'audit.log'),
          level: 'info',
          maxsize: 5242880, // 5MB
          maxFiles: 10,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          customFormat
        ),
      }));
    }
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = error instanceof Error ? {
      error: error.message,
      stack: error.stack,
      ...meta
    } : { error, ...meta };

    this.logger.error(message, errorMeta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public audit(action: string, details: any): void {
    this.logger.info('AUDIT', {
      action,
      details: sanitizeMessage(details),
      timestamp: new Date().toISOString(),
      user: process.env.USER || 'system'
    });
  }

  public transaction(type: 'purchase' | 'redemption', details: any): void {
    this.logger.info('TRANSACTION', {
      type,
      details: sanitizeMessage(details),
      timestamp: new Date().toISOString()
    });
  }
}

export const createLogger = (module: string): Logger => {
  return new Logger(module);
};

export const logger = createLogger('main');