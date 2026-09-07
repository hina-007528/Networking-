/** Transport-level contracts: the response envelope, pagination and error shapes. */

export interface ApiSuccess<TData> {
  success: true;
  data: TData;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
  requestId?: string;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export function isApiSuccess<TData>(response: ApiResponse<TData>): response is ApiSuccess<TData> {
  return response.success;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<TItem> {
  items: TItem[];
  pagination: PaginationMeta;
}

export type SortOrder = 'asc' | 'desc';

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
}

/** Canonical machine-readable error codes returned by the API. */
export const ApiErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_ATTEMPTS_EXCEEDED: 'OTP_ATTEMPTS_EXCEEDED',
  OTP_COOLDOWN: 'OTP_COOLDOWN',
  CREDENTIALS_INVALID: 'CREDENTIALS_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  COVERAGE_UNAVAILABLE: 'COVERAGE_UNAVAILABLE',
  OUTSIDE_SERVICE_CITY: 'OUTSIDE_SERVICE_CITY',
  PLAN_UNAVAILABLE_IN_CITY: 'PLAN_UNAVAILABLE_IN_CITY',
  INVOICE_NOT_PAYABLE: 'INVOICE_NOT_PAYABLE',
  PAYMENT_VERIFICATION_FAILED: 'PAYMENT_VERIFICATION_FAILED',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  UNSUPPORTED_FILE: 'UNSUPPORTED_FILE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
