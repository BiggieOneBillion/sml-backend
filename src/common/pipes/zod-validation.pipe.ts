import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodType } from 'zod';
import { ValidationException } from '../exceptions/app.exceptions';

/**
 * ZodValidationPipe validates incoming request data against a Zod schema.
 *
 * Can be used two ways:
 *
 * 1. Per-route (passing schema directly):
 *    @UsePipes(new ZodValidationPipe(RegisterSchema))
 *
 * 2. Per-body parameter (automatic — reads schema from DTO class):
 *    @Body() body: RegisterDto
 *    (The pipe reads MyDto.schema if it exists)
 *
 * On validation failure, throws ValidationException with field-level details
 * that the GlobalExceptionFilter formats into the standard error envelope.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // Only validate body, query, and param — not internal metadata
    if (metadata.type === 'custom') return value;

    // Determine which schema to use
    const schemaToUse =
      this.schema ??
      (metadata.metatype && 'schema' in metadata.metatype
        ? (metadata.metatype as { schema: ZodType }).schema
        : null);

    if (!schemaToUse) return value; // No schema — pass through

    const result = schemaToUse.safeParse(value);

    if (!result.success) {
      const details = result.error.issues.map((e) => ({
        field: e.path.join('.') || undefined,
        message: e.message,
      }));
      throw new ValidationException(details);
    }

    // Return parsed/transformed value (Zod can coerce and transform)
    return result.data;
  }
}
