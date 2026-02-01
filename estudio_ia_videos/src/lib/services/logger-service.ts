import { logger as mainLogger } from '../logger';

export const LoggerService = {
  info: mainLogger.info.bind(mainLogger),
  error: mainLogger.error.bind(mainLogger),
  warn: mainLogger.warn.bind(mainLogger),
  debug: mainLogger.debug.bind(mainLogger),
};

// Re-export logger for convenience
export { mainLogger as logger };
