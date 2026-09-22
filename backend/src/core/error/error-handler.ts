import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { AppError } from './errors.js';
import { logger } from '../logs/logs.js';


export const errorHandler: ErrorRequestHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const activeSpan = trace.getSpan(context.active());
    const spanContext = activeSpan?.spanContext();
    const traceId = spanContext?.traceId;

    if (activeSpan) {
        activeSpan.recordException(err);
        activeSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: err.message || 'Unhandled error',
        });
    }

    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const errorCode = isAppError ? err.errorCode : 'INTERNAL_SERVER_ERROR';
    const message = (isAppError || process.env.ENV !== 'production')
        ? err.message
        : 'An unexpected internal error occurred';

    logger.error(`[${req.method} ${req.originalUrl}] - ${err.message}`, {
        errorCode,
        statusCode,
        traceId,
        stack: err.stack,
        details: isAppError ? err.details : undefined,
    });

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message,
            traceId,
            ...(isAppError && err.details ? { details: err.details } : {}),
            timestamp: new Date().toISOString(),
        },
    });
};
