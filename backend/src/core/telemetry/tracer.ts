import {
    trace,
    context,
    SpanStatusCode,
    type Tracer,
    type Span,
    type SpanOptions,
    type Attributes,
} from '@opentelemetry/api';


export const tracer: Tracer = trace.getTracer("syncfit-backend");

export interface ExtendedSpanOptions extends SpanOptions {
    attributes?: Attributes;
}

/**
 * Executes an asynchronous function within an active OpenTelemetry span.
 * Automatically manages span lifecycle, error recording, status codes, and attributes.
 */
export async function withSpan<T>(
    spanName: string,
    fn: (span: Span) => Promise<T>,
    options?: ExtendedSpanOptions
): Promise<T> {
    return tracer.startActiveSpan(spanName, options || {}, async (span) => {
        try {
            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error: any) {
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error?.message || 'Unknown error occurred',
            });
            throw error;
        } finally {
            span.end();
        }
    });
}

/**
 * Executes a synchronous function within an active OpenTelemetry span.
 * Automatically manages span lifecycle, error recording, status codes, and attributes.
 */
export function withSpanSync<T>(
    spanName: string,
    fn: (span: Span) => T,
    options?: ExtendedSpanOptions
): T {
    return tracer.startActiveSpan(spanName, options || {}, (span) => {
        try {
            const result = fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error: any) {
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error?.message || 'Unknown error occurred',
            });
            throw error;
        } finally {
            span.end();
        }
    });
}

/**
 * Extracts the current active trace ID if available.
 */
export function getCurrentTraceId(): string | undefined {
    const activeSpan = trace.getSpan(context.active());
    return activeSpan?.spanContext().traceId;
}

/**
 * Extracts the current active span ID if available.
 */
export function getCurrentSpanId(): string | undefined {
    const activeSpan = trace.getSpan(context.active());
    return activeSpan?.spanContext().spanId;
}
