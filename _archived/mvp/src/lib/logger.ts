type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.minLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();

    if (!this.isDev) {
      // Structured JSON for production
      const entry = { level, message, timestamp, ...context };
      switch (level) {
        case 'error': console.error(JSON.stringify(entry)); break;
        case 'warn': console.warn(JSON.stringify(entry)); break;
        default: console.log(JSON.stringify(entry));
      }
      return;
    }

    // Pretty print for development
    const emoji = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' };
    const parts = [`${emoji[level]} [${level.toUpperCase()}] ${message}`];
    if (context) parts.push(JSON.stringify(context, null, 2));

    switch (level) {
      case 'error': console.error(...parts); break;
      case 'warn': console.warn(...parts); break;
      case 'debug': console.debug(...parts); break;
      default: console.info(...parts);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
