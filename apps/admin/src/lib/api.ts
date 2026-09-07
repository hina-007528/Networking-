import type { ApiResponse, AuthSessionDto, Paginated } from '@stormfiber/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/$/,
  '',
);

const ACCESS_TOKEN_KEY = 'sf.admin.accessToken';
const ADMIN_SESSION_COOKIE = 'sf_admin_session';

function writeAdminSessionCookie(signedIn: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = signedIn
    ? `${ADMIN_SESSION_COOKIE}=1; Path=/; SameSite=Lax`
    : `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function userFacingApiError(error: { message: string; details?: Array<{ message: string }> }): string {
  return error.details?.find((detail) => detail.message)?.message ?? error.message;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    writeAdminSessionCookie(true);
    return;
  }
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  writeAdminSessionCookie(false);
}

export function persistSession(session: AuthSessionDto): void {
  setAccessToken(session.tokens.accessToken);
}

export function readItems<T>(payload: Paginated<T> | T[] | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, method: init?.method ?? 'GET' });
}

export async function apiSend<T>(
  path: string,
  body?: unknown,
  init?: RequestInit & { method?: string },
): Promise<T> {
  return request<T>(path, {
    method: init?.method ?? 'POST',
    ...init,
    body: body === undefined ? init?.body : JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

export async function apiDelete(path: string): Promise<void> {
  await request<unknown>(path, { method: 'DELETE' });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await authorizedFetch(path, init);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw unreachableApiError();
  }

  const payload = await readJson<ApiResponse<T>>(response);

  if (!payload.success) {
    throw new ApiClientError(userFacingApiError(payload.error), payload.error.code, response.status);
  }

  return payload.data;
}

function unreachableApiError(): ApiClientError {
  return new ApiClientError(
    `Cannot reach the API at ${API_BASE}. Start it with pnpm --filter @stormfiber/api dev.`,
    'INTERNAL_ERROR',
    0,
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new ApiClientError(
      `The API at ${API_BASE} returned an empty response (HTTP ${response.status}).`,
      'INTERNAL_ERROR',
      response.status,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiClientError(
      `The API at ${API_BASE} returned a non-JSON response (HTTP ${response.status}).`,
      'INTERNAL_ERROR',
      response.status,
    );
  }
}

async function authorizedFetch(path: string, init: RequestInit, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (typeof window === 'undefined' && !headers.has('Cookie')) {
    try {
      const { cookies } = await import('next/headers');
      const jar = await cookies();
      const cookie = jar.toString();
      if (cookie) headers.set('Cookie', cookie);
    } catch {
      // Server components without a request cookie store still fall through to bearer auth.
    }
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
    cache: init.cache ?? 'no-store',
  });

  if (response.status === 401 && !retried && typeof window !== 'undefined') {
    const refreshed = await refreshSession();
    if (refreshed) {
      return authorizedFetch(path, init, true);
    }
  }

  return response;
}

export async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    const payload = await readJson<ApiResponse<AuthSessionDto>>(response);
    if (!payload.success) {
      setAccessToken(null);
      return false;
    }
    persistSession(payload.data);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}
