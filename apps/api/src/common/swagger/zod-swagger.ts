import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

type JsonSchema = Record<string, unknown>;

function toOpenApiSchema(schema: ZodTypeAny): JsonSchema {
  return zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as JsonSchema;
}

/**
 * Documents a request body from the shared Zod schema that actually validates it.
 *
 * Deriving the OpenAPI schema from the validation schema means the published contract cannot
 * describe a shape the server would reject.
 */
export function ApiZodBody(schema: ZodTypeAny, description?: string) {
  return ApiBody({ description, schema: toOpenApiSchema(schema) });
}

/** Documents each top-level key of a Zod object schema as a query parameter. */
export function ApiZodQuery(schema: ZodTypeAny) {
  const jsonSchema = toOpenApiSchema(schema);
  const properties = (jsonSchema.properties ?? {}) as Record<string, JsonSchema>;
  const required = (jsonSchema.required ?? []) as string[];

  return applyDecorators(
    ...Object.entries(properties).map(([name, property]) =>
      ApiQuery({
        name,
        required: required.includes(name),
        schema: property,
        description: property.description as string | undefined,
      }),
    ),
  );
}

/** Documents the standard success envelope wrapped around a payload schema. */
export function ApiEnvelope(status: number, description: string, dataSchema?: JsonSchema) {
  return ApiResponse({
    status,
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: dataSchema ?? { type: 'object' },
        message: { type: 'string', example: 'Success' },
      },
      required: ['success', 'data', 'message'],
    },
  });
}

/** Documents the standard error envelope. */
export function ApiErrorEnvelope(status: number, description: string, code: string) {
  return ApiResponse({
    status,
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: code },
            message: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
          required: ['code', 'message', 'details'],
        },
      },
      required: ['success', 'error'],
    },
  });
}
