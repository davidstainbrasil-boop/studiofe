"use strict";
/**
 * Monitoring Logger
 * Logger estruturado para monitoramento
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.log = exports.createLogger = exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(context) {
        this.context = context;
    }
    debug(message, meta) {
        console.debug(`[${this.context}] ${message}`, meta);
    }
    info(message, meta) {
        console.info(`[${this.context}] ${message}`, meta);
    }
    warn(message, meta) {
        console.warn(`[${this.context}] ${message}`, meta);
    }
    error(message, error, meta) {
        console.error(`[${this.context}] ${message}`, error, meta);
    }
    security(message, meta) {
        console.warn(`[SECURITY][${this.context}] ${message}`, meta);
    }
    apiRequest(method, path, duration, status) {
        this.info(`API Request: ${method} ${path}`, { duration, status });
    }
}
exports.Logger = Logger;
const createLogger = (context) => new Logger(context);
exports.createLogger = createLogger;
exports.log = (0, exports.createLogger)('default');
exports.logger = exports.log;
