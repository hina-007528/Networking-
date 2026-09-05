import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { ApiErrorCode, type ApiFailure } from '@stormfiber/types';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { AppException } from '../errors/app.exception';

interface NormalisedError {
  status: number;
  body: ApiFailure['error'];
}

/**
 * Converts every thrown value into the documented error envelope.
 *
 * Stack traces and Prisma internals are logged but never serialised to the client in production —
 * the response carries only a stable code, a human-readable message and field-level details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? undefined;

    const { status, body } = this.normalise(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.debug(`${request.method} ${request.originalUrl} -> ${status} ${body.code}`);
    }

    const payload: ApiFailure = { success: false, error: body, requestId };
    response.status(status).json(payload);
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        body: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          code: ApiErrorCode.RATE_LIMITED,
          message: 'Too many requests. Please slow down and try again shortly.',
          details: [],
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);

      return {
        status,
        body: {
          code: this.codeForStatus(status),
          message: Array.isArray(message) ? message[0] : message,
          details: Array.isArray(message)
            ? message.map((entry) => ({ message: String(entry) }))
            : [],
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.normalisePrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'The request could not be processed with the supplied values',
          details: [],
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ApiErrorCode.INTERNAL_ERROR,
        message: this.config.isProduction
          ? 'Something went wrong on our side. Please try again.'
          : exception instanceof Error
            ? exception.message
            : 'Unknown error',
        details: [],
      },
    };
  }

  private normalisePrisma(error: Prisma.PrismaClientKnownRequestError): NormalisedError {
    const target = (error.meta?.target as string[] | string | undefined) ?? undefined;
    const field = Array.isArray(target) ? target[0] : target;

    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          body: {
            code: ApiErrorCode.CONFLICT,
            message: field
              ? `A record with this ${String(field).replace(/_/g, ' ')} already exists`
              : 'A record with these details already exists',
            details: field ? [{ field: String(field), message: 'Already in use' }] : [],
          },
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'The requested record was not found',
            details: [],
          },
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          body: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'A referenced record does not exist',
            details: field ? [{ field: String(field), message: 'Unknown reference' }] : [],
          },
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: this.config.isProduction
              ? 'Something went wrong on our side. Please try again.'
              : `Database error ${error.code}`,
            details: [],
          },
        };
    }
  }

  private codeForStatus(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.RATE_LIMITED;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ApiErrorCode.VALIDATION_ERROR;
      default:
        return ApiErrorCode.INTERNAL_ERROR;
    }
  }
}
