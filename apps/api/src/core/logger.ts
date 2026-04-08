import pino, { type LoggerOptions } from 'pino';
import { loadConfig } from './config.js';

const config = loadConfig();

const options: LoggerOptions = {
  level: config.LOG_LEVEL,
  base: { service: 'signal-watcher-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.apiKey',
      '*.password',
      '*.GEMINI_API_KEY',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const logger =
  config.NODE_ENV === 'development'
    ? pino({
        ...options,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
        },
      })
    : pino(options);
