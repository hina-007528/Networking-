import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import type { ApiErrorDetail } from '@stormfiber/types';
import type { ZodIssue, ZodTypeAny, z } from 'zod';
import { AppException } from '../errors/app.exception';

function toDetail(issue: ZodIssue): ApiErrorDetail {
  return {
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    code: issue.code,
    message: issue.message,
  };
}

/**
 * Validates a request body, query or param against a shared Zod schema.
 *
 * Using the very same schemas the browser forms use is what keeps client and server validation
 * from drifting; the server still re-validates everything, because the client's checks are only a
 * convenience.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.infer<TSchema> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw AppException.validation(result.error.issues.map(toDetail));
    }

    return result.data;
  }
}

/** Convenience factory so controllers read `@Body(zodBody(schema))`. */
export function zodPipe<TSchema extends ZodTypeAny>(schema: TSchema): ZodValidationPipe<TSchema> {
  return new ZodValidationPipe(schema);
}
