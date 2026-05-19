import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

/**
 * WHY STRUCTURED LOGGING?
 * In production, logs are ingested by Datadog/CloudWatch.
 * JSON format allows log aggregation, filtering, and alerting on specific fields
 * (e.g., alert when error_code = "PAYMENT_FAILED" appears > 5 times per minute).
 *
 * In development, colorized text is far easier to read.
 *
 * NEVER log PII — emails and phone numbers are masked at the service layer.
 * The request_id field is threaded from HTTP request through every log entry
 * in the same request lifecycle via AsyncLocalStorage (added in interceptor).
 */

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ timestamp, level, message, context, requestId, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const rid = requestId ? ` rid:${requestId}` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}${rid} ${ctx} ${message}${extra}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json(),
);

export function createLoggerConfig(nodeEnv: string): WinstonModuleOptions {
  const isDev = nodeEnv === 'development' || nodeEnv === 'test';

  return {
    level: isDev ? 'debug' : 'info',
    format: isDev ? devFormat : prodFormat,
    defaultMeta: {
      service: 'sml-api',
      environment: nodeEnv,
    },
    transports: [
      new winston.transports.Console({
        silent: nodeEnv === 'test', // suppress logs during unit tests
      }),
      // In production, add file transport or use a cloud transport
      // (Datadog, CloudWatch) via separate winston transport package
    ],
    // Don't exit on handled exceptions — NestJS handles graceful shutdown
    exitOnError: false,
  };
}
