/**
 * @layer    core
 * @module   error
 * @fires    none
 * @listens  none
 * @depends  none
 */

export const ERROR_LEVEL = {
    RECOVERABLE: 'recoverable',
    DRIVER_INIT: 'driver_init',
    FATAL: 'fatal',
};

export class AppError extends Error {
    constructor(code, message, level, detail) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.level = level || ERROR_LEVEL.RECOVERABLE;
        this.detail = detail || {};
    }
}

export function normalizeError(error, fallbackCode) {
    if (error instanceof AppError) {
        return error;
    }
    const message = error && error.message ? error.message : String(error);
    return new AppError(fallbackCode || 'UNKNOWN_ERROR', message, ERROR_LEVEL.RECOVERABLE, {});
}
