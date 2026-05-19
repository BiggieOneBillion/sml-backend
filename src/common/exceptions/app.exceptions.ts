import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all application-level business exceptions.
 *
 * WHY CUSTOM EXCEPTIONS OVER PLAIN HttpException?
 * - Structured error codes (machine-readable) for client handling
 * - Consistent shape across all error types
 * - Type discrimination in the global filter
 * - Can carry additional context without polluting the message string
 *
 * Usage:
 *   throw new ResourceNotFoundException('User', userId);
 *   throw new BusinessRuleException('MINIMUM_INVESTMENT_NOT_MET', 'Minimum investment is $1,000');
 */
export class AppException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Array<{ field?: string; message: string }>,
  ) {
    super({ errorCode, message, details }, status);
  }
}

// ── 400 Bad Request ───────────────────────────────────────────────────────────
export class ValidationException extends AppException {
  constructor(details: Array<{ field?: string; message: string }>) {
    super('VALIDATION_ERROR', 'Validation failed', HttpStatus.BAD_REQUEST, details);
  }
}

// ── 401 Unauthorized ─────────────────────────────────────────────────────────
export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', HttpStatus.UNAUTHORIZED);
  }
}

export class TokenExpiredException extends AppException {
  constructor() {
    super('TOKEN_EXPIRED', 'Your session has expired. Please log in again.', HttpStatus.UNAUTHORIZED);
  }
}

export class EmailNotVerifiedException extends AppException {
  constructor() {
    super(
      'EMAIL_NOT_VERIFIED',
      'Please verify your email address before continuing.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

// ── 403 Forbidden ─────────────────────────────────────────────────────────────
export class ForbiddenException extends AppException {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class SubscriptionRequiredException extends AppException {
  constructor(feature = 'this feature') {
    super(
      'SUBSCRIPTION_REQUIRED',
      `An active Investor Premium subscription is required to access ${feature}.`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class KycRequiredException extends AppException {
  constructor() {
    super(
      'KYC_REQUIRED',
      'Identity verification is required before you can invest.',
      HttpStatus.FORBIDDEN,
    );
  }
}

// ── 404 Not Found ─────────────────────────────────────────────────────────────
export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id?: string) {
    super(
      'RESOURCE_NOT_FOUND',
      id ? `${resource} with id "${id}" was not found` : `${resource} was not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

// ── 409 Conflict ─────────────────────────────────────────────────────────────
export class ConflictException extends AppException {
  constructor(errorCode: string, message: string) {
    super(errorCode, message, HttpStatus.CONFLICT);
  }
}

export class DuplicateEmailException extends AppException {
  constructor() {
    super(
      'EMAIL_ALREADY_EXISTS',
      'An account with this email address already exists.',
      HttpStatus.CONFLICT,
    );
  }
}

// ── 422 Unprocessable (Business Rule Violations) ──────────────────────────────
export class BusinessRuleException extends AppException {
  constructor(errorCode: string, message: string) {
    super(errorCode, message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class MinimumInvestmentException extends AppException {
  constructor(minimumAmount: number, currency = 'USD') {
    super(
      'MINIMUM_INVESTMENT_NOT_MET',
      `Minimum investment amount is ${currency} ${minimumAmount.toFixed(2)}.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class IdeaNotLiveException extends AppException {
  constructor() {
    super(
      'IDEA_NOT_LIVE',
      'This idea is not currently accepting investments.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

// ── 429 Rate Limited ─────────────────────────────────────────────────────────
export class RateLimitException extends AppException {
  constructor(message = 'Too many requests. Please try again later.') {
    super('RATE_LIMITED', message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

// ── 500 Internal Server Error ─────────────────────────────────────────────────
export class InternalException extends AppException {
  constructor(message = 'An unexpected error occurred') {
    super('INTERNAL_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
