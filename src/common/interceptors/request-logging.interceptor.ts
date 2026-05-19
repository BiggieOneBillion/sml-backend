import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * RequestLoggingInterceptor
 *
 * Attaches a unique requestId to every request and logs:
 *  - Incoming: method, path, user agent
 *  - Outgoing: status, duration
 *
 * The requestId is added to the response header (X-Request-ID) so clients
 * and our own error responses can reference it for debugging.
 *
 * WHY INTERCEPTOR vs MIDDLEWARE?
 * Interceptors run inside the NestJS DI context, so they have access to
 * route metadata and the authenticated user. Middleware runs before route
 * matching. We use middleware for helmet/cors, interceptors for logging.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate or propagate request ID
    const requestId =
      (request.headers['x-request-id'] as string) ?? uuidv4();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);

    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] ?? '';
    const startAt = Date.now();

    this.logger.log(`→ ${method} ${url}`, {
      requestId,
      ip,
      userAgent: userAgent.substring(0, 80), // truncate long UAs
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startAt;
          const { statusCode } = response;

          // Warn on slow responses in development
          const logLevel = duration > 1000 ? 'warn' : 'log';
          this.logger[logLevel](`← ${method} ${url} ${statusCode} ${duration}ms`, {
            requestId,
            statusCode,
            duration,
          });
        },
        error: () => {
          // Error logging is handled by GlobalExceptionFilter
          // We still log timing here for observability
          const duration = Date.now() - startAt;
          this.logger.warn(`← ${method} ${url} ERROR ${duration}ms`, {
            requestId,
            duration,
          });
        },
      }),
    );
  }
}
