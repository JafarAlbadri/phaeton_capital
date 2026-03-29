import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const asyncLocalStorage = new AsyncLocalStorage<string>();

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    mixin() {
        return {
            correlationId: asyncLocalStorage.getStore() || 'no-correlation-id'
        };
    },
});

// Polyfill to safely wrap instances where console is used maliciously by multiple arguments format
export const logWrapper = {
    info: (...args: any[]) => {
        if (args.length === 1 && typeof args[0] === 'string') {
            logger.info(args[0]);
        } else {
            logger.info({ context: args.slice(1) }, typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]));
        }
    },
    error: (...args: any[]) => {
        if (args.length === 1 && typeof args[0] === 'string') {
            logger.error(args[0]);
        } else if (args[0] instanceof Error) {
            logger.error(args[0]);
        } else {
            logger.error({ context: args.slice(1) }, typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]));
        }
    },
    warn: (...args: any[]) => {
        logger.warn({ context: args }, "Warning");
    }
};
