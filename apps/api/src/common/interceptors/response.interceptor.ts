import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiSuccess } from '@stormfiber/types';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY, SKIP_ENVELOPE_KEY } from '../decorators/response.decorators';

/**
 * Wraps every successful handler return value in the documented success envelope, so controllers
 * return plain domain objects and never assemble the transport shape themselves.
 *
 * Handlers that stream a file or return a raw buffer opt out with `@SkipEnvelope()`.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Success';

    return next.handle().pipe(
      map((data): ApiSuccess<T> => {
        // A handler may return `{ data, meta }` when it needs to attach pagination metadata.
        if (
          data !== null &&
          typeof data === 'object' &&
          'data' in (data as Record<string, unknown>) &&
          'meta' in (data as Record<string, unknown>)
        ) {
          const envelope = data as unknown as { data: T; meta: Record<string, unknown> };
          return { success: true, data: envelope.data, message, meta: envelope.meta };
        }

        return { success: true, data, message };
      }),
    );
  }
}
