/**
 * @holoscript/core Logger
 *
 * Simple pluggable logger for HoloScript
 */
class NoOpLogger {
    debug() { }
    info() { }
    warn() { }
    error() { }
}
class ConsoleLogger {
    debug(message, meta) {
        console.debug(`[HoloScript:DEBUG] ${message}`, meta ?? '');
    }
    info(message, meta) {
        console.info(`[HoloScript:INFO] ${message}`, meta ?? '');
    }
    warn(message, meta) {
        console.warn(`[HoloScript:WARN] ${message}`, meta ?? '');
    }
    error(message, meta) {
        console.error(`[HoloScript:ERROR] ${message}`, meta ?? '');
    }
}
let currentLogger = new NoOpLogger();
export function setHoloScriptLogger(logger) {
    currentLogger = logger;
}
export function enableConsoleLogging() {
    currentLogger = new ConsoleLogger();
}
export function resetLogger() {
    currentLogger = new NoOpLogger();
}
export const logger = {
    debug: (msg, meta) => currentLogger.debug(msg, meta),
    info: (msg, meta) => currentLogger.info(msg, meta),
    warn: (msg, meta) => currentLogger.warn(msg, meta),
    error: (msg, meta) => currentLogger.error(msg, meta),
};
export { NoOpLogger, ConsoleLogger };
