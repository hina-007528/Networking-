import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Structured access logging.
 *
 * Every request is given a request id (reused if the caller supplied one) which is echoed in the
 * response header and included in error envelopes, so a user-reported failure can be traced to a
 * single log line.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const response = http.getResponse<Response>();

    const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.write(request, response.statusCode, startedAt, requestId),
        error: (error: { status?: number }) =>
          this.write(request, error?.status ?? 500, startedAt, requestId),
      }),
    );
  }

  private write(
    request: Request & { user?: AuthenticatedUser },
    status: number,
    startedAt: number,
    requestId: string,
  ): void {
    const duration = Date.now() - startedAt;
    const entry = {
      requestId,
      method: request.method,
      path: request.route?.path ?? request.originalUrl,
      status,
      durationMs: duration,
      userId: request.user?.id,
    };

    const line = `${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms${
      entry.userId ? ` user=${entry.userId}` : ''
    } id=${entry.requestId}`;

    if (status >= 500) {
      this.logger.error(line);
    } else if (status >= 400) {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }
  }
}
