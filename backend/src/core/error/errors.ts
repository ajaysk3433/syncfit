export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        errorCode: string = 'INTERNAL_ERROR',
        details?: unknown,
        isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request', errorCode: string = 'BAD_REQUEST', details?: unknown) {
        super(message, 400, errorCode, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized', errorCode: string = 'UNAUTHORIZED') {
        super(message, 401, errorCode);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden', errorCode: string = 'FORBIDDEN') {
        super(message, 403, errorCode);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found', errorCode: string = 'NOT_FOUND') {
        super(message, 404, errorCode);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists', errorCode: string = 'CONFLICT', details?: unknown) {
        super(message, 409, errorCode, details);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed', details?: unknown) {
        super(message, 422, 'VALIDATION_ERROR', details);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', details?: unknown) {
        super(message, 500, 'INTERNAL_SERVER_ERROR', details, false);
    }
}
