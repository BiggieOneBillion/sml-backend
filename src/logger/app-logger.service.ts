import { Injectable, LoggerService, Inject, Optional } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

/**
 * AppLogger wraps Winston with a consistent interface.
 *
 * Usage:
 *   constructor(private readonly logger: AppLogger) {}
 *
 *   this.logger.setContext('UserService');
 *   this.logger.log('User created', { userId, email: maskEmail(email) });
 *   this.logger.error('Payment failed', error, { userId, ideaId });
 *
 * WHY NOT USE NestJS DEFAULT LOGGER?
 * NestJS Logger uses console.log. Winston gives us:
 *  - JSON formatting for log aggregation
 *  - Log levels with filtering
 *  - Multiple transports (console + cloud)
 *  - Consistent metadata (service, environment, requestId)
 */
@Injectable()
export class AppLogger implements LoggerService {
  private context?: string;

  constructor(
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winston: WinstonLogger,
  ) {}

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: string, meta?: Record<string, unknown>): void {
    this.winston?.info(message, { context: this.context, ...meta });
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errorMeta =
      error instanceof Error
        ? { errorMessage: error.message, stack: error.stack, errorName: error.name }
        : { errorRaw: error };

    this.winston?.error(message, {
      context: this.context,
      ...errorMeta,
      ...meta,
    });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.winston?.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.winston?.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    this.winston?.verbose(message, { context: this.context, ...meta });
  }
}
