/**
 * 📝 Pino Logger Integration
 * High-performance structured logging
 */

import pino from 'pino';

// Create base logger
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
    app: 'estudio-ia-videos',
  },
  redact: ['password', 'token', 'apiKey', 'authorization', 'cookie'],
});

// Create child loggers for different modules
export const apiLogger = pinoLogger.child({ module: 'api' });
export const renderLogger = pinoLogger.child({ module: 'render' });
export const authLogger = pinoLogger.child({ module: 'auth' });
export const dbLogger = pinoLogger.child({ module: 'database' });
export const queueLogger = pinoLogger.child({ module: 'queue' });
export const storageLogger = pinoLogger.child({ module: 'storage' });
export const ttsLogger = pinoLogger.child({ module: 'tts' });

// Default export
export default pinoLogger;

// Re-export types
export type { Logger } from 'pino';
