/**
 * Standardised API response envelope.
 *
 * ALL endpoints return this shape — success or error.
 * This makes client-side handling predictable and allows
 * API gateway / monitoring tools to parse responses uniformly.
 *
 * Success:  { success: true,  data: T,    meta?: PaginationMeta }
 * Error:    { success: false, error: ApiError }
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta | CursorMeta | Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Builder helpers — use these in controllers and services
 * rather than constructing the shape manually.
 */
export class ResponseBuilder {
  static success<T>(
    data: T,
    meta?: ApiSuccessResponse<T>['meta'],
  ): ApiSuccessResponse<T> {
    return { success: true, data, ...(meta ? { meta } : {}) };
  }

  static paginated<T>(
    data: T,
    pagination: { page: number; limit: number; total: number },
  ): ApiSuccessResponse<T> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    return {
      success: true,
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      } satisfies PaginationMeta,
    };
  }

  static cursor<T>(
    data: T,
    cursor: { nextCursor: string | null; hasMore: boolean },
  ): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      meta: cursor satisfies CursorMeta,
    };
  }
}
