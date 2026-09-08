import type { ApiResponse, AuthSessionDto, Paginated } from '@stormfiber/types';

export function readItems<T>(payload: Paginated<T> | { items: T[] } | T[] | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.items) ? payload.items : [];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/$/,
  '',
);

const ACCESS_TOKEN_KEY = 'sf.accessToken';
const UI_SESSION_COOKIE = 'sf_ui_session';

function writeUiSessionCookie(signedIn: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = signedIn
    ? `${UI_SESSION_COOKIE}=1; Path=/; SameSite=Lax`
    : `${UI_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
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
    writeUiSessionCookie(true);
    return;
  }
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  writeUiSessionCookie(false);
}

export function persistSession(session: AuthSessionDto): void {
  setAccessToken(session.tokens.accessToken);
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

export async function apiBlob(path: string): Promise<Blob> {
  const response = await authorizedFetch(path, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new ApiClientError('Could not download the file', 'DOWNLOAD_FAILED', response.status);
  }
  return response.blob();
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await authorizedFetch(path, init);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError(
      `Cannot reach the API at ${API_BASE}. Start it with pnpm --filter @stormfiber/api dev.`,
      'INTERNAL_ERROR',
      0,
    );
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      `The API at ${API_BASE} returned a non-JSON response (HTTP ${response.status}).`,
      'INTERNAL_ERROR',
      response.status,
    );
  }

  if (!payload.success) {
    throw new ApiClientError(userFacingApiError(payload.error), payload.error.code, response.status);
  }

  return payload.data;
}

async function authorizedFetch(path: string, init: RequestInit, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const cache = init.cache ?? (typeof window === 'undefined' ? undefined : 'no-store');
  const serverInit =
    typeof window === 'undefined' && init.cache !== 'no-store'
      ? { next: { revalidate: 60 } }
      : {};

  const response = await fetch(apiUrl(path), {
    ...init,
    ...serverInit,
    headers,
    credentials: 'include',
    cache,
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
    const payload = (await response.json()) as ApiResponse<AuthSessionDto>;
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
