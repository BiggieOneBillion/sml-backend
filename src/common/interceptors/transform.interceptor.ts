import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../types/api-response.types';

/**
 * TransformInterceptor
 *
 * Automatically wraps every successful controller return value in:
 *   { success: true, data: <return_value> }
 *
 * Controllers can return either:
 *   1. A plain object/value → wrapped automatically
 *   2. An ApiSuccessResponse (already has success:true) → passed through as-is
 *      (used when the controller needs to include pagination meta)
 *
 * This means controllers stay clean — they just return their data,
 * and the envelope is added here.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the controller already returned a ResponseBuilder result, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data as ApiSuccessResponse<T>;
        }
        return { success: true, data } as ApiSuccessResponse<T>;
      }),
    );
  }
}
