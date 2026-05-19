import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exceptions';
import { ApiErrorResponse } from '../types/api-response.types';

/**
 * GlobalExceptionFilter — catches every thrown exception and maps it to the
 * standard { success: false, error: { code, message, details, requestId } } shape.
 *
 * EXCEPTION HIERARCHY:
 *   AppException    → typed business errors with machine-readable codes
 *   HttpException   → NestJS built-in errors (guards, pipes)
 *   Error           → unexpected errors (bugs, DB failures, etc.)
 *
 * SECURITY NOTE:
 *   In production, we NEVER expose internal error details or stack traces.
 *   The internal error is logged with full context; the client only sees
 *   a safe, generic message for 500-class errors.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) ?? 'unknown';
    const isProduction = process.env.NODE_ENV === 'production';

    // ── Typed application exceptions ─────────────────────────────────────
    if (exception instanceof AppException) {
      const status = exception.getStatus();

      // Log 5xx as errors, 4xx as warnings (not bugs — expected flows)
      if (status >= 500) {
        this.logger.error('Application exception', exception.stack, {
          requestId,
          path: request.url,
          method: request.method,
        });
      } else {
        this.logger.warn(`${exception.errorCode}: ${exception.message}`, {
          requestId,
          path: request.url,
          status,
        });
      }

      const body: ApiErrorResponse = {
        success: false,
        error: {
          code: exception.errorCode,
          message: exception.message,
          ...(exception.details ? { details: exception.details } : {}),
          requestId,
        },
      };

      response.status(status).json(body);
      return;
    }

    // ── NestJS built-in HttpExceptions (validation pipe, guards) ─────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // NestJS validation pipe returns { message: string[], error: string }
      let details: Array<{ field?: string; message: string }> | undefined;
      let message = 'Request failed';

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(resp.message)) {
          // Class-validator pipe messages
          details = resp.message.map((m: string) => ({ message: m }));
          message = 'Validation failed';
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        }
      }

      this.logger.warn(`HttpException ${status}: ${message}`, {
        requestId,
        path: request.url,
      });

      response.status(status).json({
        success: false,
        error: {
          code: this.httpStatusToCode(status),
          message,
          ...(details ? { details } : {}),
          requestId,
        },
      } satisfies ApiErrorResponse);
      return;
    }

    // ── Unexpected errors (bugs, DB failures, etc.) ───────────────────────
    const err = exception instanceof Error ? exception : new Error(String(exception));

    this.logger.error('Unhandled exception', err.stack, {
      requestId,
      path: request.url,
      method: request.method,
      errorName: err.name,
      errorMessage: err.message,
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        // In production, hide internal error details from client
        message: isProduction
          ? 'An unexpected error occurred. Please try again later.'
          : err.message,
        requestId,
      },
    } satisfies ApiErrorResponse);
  }

  private httpStatusToCode(status: HttpStatus): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? 'HTTP_ERROR';
  }
}
