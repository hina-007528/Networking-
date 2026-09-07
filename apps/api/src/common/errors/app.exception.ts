import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode, type ApiErrorDetail } from '@stormfiber/types';

/**
 * The single exception type the application throws.
 *
 * Carrying a machine-readable `code` alongside the HTTP status lets the browser react to a
 * specific failure (an expired OTP, an idempotency clash) without string-matching on messages.
 */
export class AppException extends HttpException {
  readonly code: ApiErrorCode;
  readonly details: ApiErrorDetail[];

  constructor(
    code: ApiErrorCode,
    message: string,
    status: HttpStatus,
    details: ApiErrorDetail[] = [],
  ) {
    super({ code, message, details }, status);
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details: ApiErrorDetail[] = []): AppException {
    return new AppException(
      ApiErrorCode.VALIDATION_ERROR,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  static validation(details: ApiErrorDetail[]): AppException {
    return new AppException(
      ApiErrorCode.VALIDATION_ERROR,
      details[0]?.message ?? 'The submitted data did not pass validation',
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  static unauthorized(message = 'Authentication is required'): AppException {
    return new AppException(ApiErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }

  static invalidCredentials(): AppException {
    return new AppException(
      ApiErrorCode.CREDENTIALS_INVALID,
      'The email address, mobile number or password is incorrect',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppException {
    return new AppException(ApiErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }

  static notFound(resource: string): AppException {
    return new AppException(
      ApiErrorCode.NOT_FOUND,
      `${resource} was not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  static conflict(message: string): AppException {
    return new AppException(ApiErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
  }

  static rateLimited(message = 'Too many requests. Please try again shortly.'): AppException {
    return new AppException(ApiErrorCode.RATE_LIMITED, message, HttpStatus.TOO_MANY_REQUESTS);
  }

  static of(
    code: ApiErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details: ApiErrorDetail[] = [],
  ): AppException {
    return new AppException(code, message, status, details);
  }
}
