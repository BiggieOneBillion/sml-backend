import { z } from 'zod';
import { ApiBody } from '@nestjs/swagger';

/**
 * createZodDto — creates a class that can be used as a NestJS DTO
 * while holding a reference to its Zod schema for runtime validation.
 *
 * This pattern lets us:
 *   1. Define validation rules ONCE in Zod (not duplicated in class decorators)
 *   2. Get full TypeScript type inference from the schema
 *   3. Use the class as a NestJS DI token / Swagger schema source
 *
 * Usage:
 *   export class RegisterRequestDto extends createZodDto(RegisterSchema) {}
 *
 * The ZodValidationPipe reads ZodDto.schema to validate incoming requests.
 */
export function createZodDto<T extends z.ZodType>(schema: T) {
  class ZodDto {
    static readonly schema = schema;
  }

  return ZodDto as typeof ZodDto & {
    new (): z.infer<T>;
    readonly schema: T;
  };
}

export type ZodDtoClass<T extends z.ZodType = z.ZodType> = {
  new (): z.infer<T>;
  schema: T;
};

/**
 * ApiZodBody — method decorator that generates Swagger request body docs
 * directly from a Zod schema via Zod v4's built-in z.toJSONSchema().
 *
 * Usage:
 *   @ApiZodBody(RegisterSchema)
 *   async register(@Body() dto: RegisterDto) { ... }
 *
 * Keeps Zod as the single source of truth — no manual @ApiProperty duplication.
 */
export function ApiZodBody(schema: z.ZodType): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = z.toJSONSchema(schema) as any;
  // Remove the $schema meta-key — not valid inside an OpenAPI schema object
  const { $schema: _, ...openApiSchema } = jsonSchema;
  return ApiBody({ schema: openApiSchema });
}
