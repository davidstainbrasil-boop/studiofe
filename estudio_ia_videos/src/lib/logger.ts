/**
 * 📝 Professional Logger Service
 * Centralized logging with levels, formatting, and production-ready features
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: Error
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private minLevel: LogLevel = process.env.LOG_LEVEL as LogLevel || 'info'
  private namespace: string | null = null

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  constructor(namespace?: string) {
    if (namespace) {
      this.namespace = namespace
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel]
  }

  private formatMessage(entry: LogEntry): string {
    // In production, return JSON string for structured logging
    if (!this.isDevelopment) {
      return JSON.stringify({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp,
        ...this.namespace ? { namespace: this.namespace } : {},
        ...entry.context,
        ...entry.error ? { 
          error: {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name
          }
        } : {}
      });
    }

    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }

    const parts = [
      `${emoji[entry.level]} [${entry.level.toUpperCase()}]`,
      entry.timestamp,
    ]

    if (this.namespace) {
      parts.push(`[${this.namespace}]`)
    }

    parts.push(entry.message)

    if (entry.context) {
      // Pretty print context in dev
      parts.push(JSON.stringify(entry.context, null, 2))
    }

    if (entry.error) {
      parts.push(`\nError: ${entry.error.message}`)
      if (this.isDevelopment && entry.error.stack) {
        parts.push(`\nStack: ${entry.error.stack}`)
      }
    }

    return parts.join(' ')
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }

    const formatted = this.formatMessage(entry)

    // In production, send to logging service (e.g., Sentry, LogRocket)
    if (!this.isDevelopment) {
      if (level === 'error' && error) {
        Sentry.captureException(error, {
          extra: { ...context, message }
        });
      } else if (level === 'error' || level === 'warn') {
        Sentry.captureMessage(message, {
          level: level === 'warn' ? 'warning' : 'error',
          extra: context
        });
      }
    }

    // Console output
    switch (level) {
      case 'debug':
        if (this.isDevelopment) console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }


  private normalizeContext(...args: unknown[]): Record<string, unknown> | undefined {
    if (args.length === 0) return undefined
    if (args.length === 1) {
      const arg = args[0]
      if (arg === null || arg === undefined) return undefined
      if (typeof arg === 'object' && !Array.isArray(arg) && !(arg instanceof Error)) {
        return arg as Record<string, unknown>
      }
      return { data: arg }
    }
    return { data: args }
  }

  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, this.normalizeContext(...args))
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, this.normalizeContext(...args))
  }

  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, this.normalizeContext(...args))
  }

  error(message: string, ...args: unknown[]) {
    // Extract Error if first arg is Error-like
    let err: Error | undefined
    let ctx: Record<string, unknown> | undefined
    
    if (args.length >= 1 && args[0] instanceof Error) {
      err = args[0]
      ctx = args.length >= 2 ? this.normalizeContext(args[1]) : undefined
    } else if (args.length >= 1) {
      // First arg might be an unknown error from catch blocks
      const maybeError = args[0]
      if (maybeError && typeof maybeError === 'object' && 'message' in maybeError) {
        err = maybeError as Error
        ctx = args.length >= 2 ? this.normalizeContext(args[1]) : undefined
      } else {
        ctx = this.normalizeContext(...args)
      }
    }
    
    this.log('error', message, ctx, err)
  }

  withContext(context: Record<string, unknown>): Logger {
    const newLogger = new Logger(this.namespace || undefined);
    // Override log method to merge context
    const originalLog = newLogger.log.bind(newLogger);
    newLogger.log = (level: LogLevel, message: string, logContext?: Record<string, unknown>, error?: Error) => {
      originalLog(level, message, { ...context, ...logContext }, error);
    };
    return newLogger;
  }
}

// Export singleton instance
export const logger = new Logger()

// Export the Logger class for custom instantiation
export { Logger }

// Export convenience functions
export const log = {
  debug: (message: string, ...args: unknown[]) => logger.debug(message, ...args),
  info: (message: string, ...args: unknown[]) => logger.info(message, ...args),
  warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
  error: (message: string, ...args: unknown[]) => logger.error(message, ...args),
}
