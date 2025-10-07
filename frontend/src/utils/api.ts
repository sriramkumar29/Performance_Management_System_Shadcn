import { emitUnauthorized } from './auth-events';

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Headers;
};

// Token refresh state
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Get base URL from environment or use empty string for relative paths
function getApiBaseUrl(): string {
  // Force empty string in production to use relative URLs and avoid mixed content
  if (import.meta.env.PROD || import.meta.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return '';
  }

  // Resolve lazily so test setup can mutate import.meta.env at runtime
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || '';

  // Allow tests (or browser) to override via globalThis.__API_BASE_URL__
  const globalObj = typeof globalThis === 'undefined' ? undefined : (globalThis as any);
  const result = (envUrl || globalObj?.__API_BASE_URL__ || '') as string;

  // Only log in development mode for debugging
  if (import.meta.env.DEV) {
    console.log('Development mode - API Base URL:', result);
  }
  return result;
}

const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 10000);
const API_RETRIES = Number(import.meta.env.VITE_API_RETRIES ?? 3);

// Helper functions to reduce cognitive complexity
function buildApiUrl(path: string): string {
  const isAbsolute = /^https?:\/\//i.test(path);
  if (isAbsolute) return path;

  const cleanPath = path.replace(/^\/+/, '');
  const apiPath = cleanPath.startsWith('api/') ? `/${cleanPath}` : `/api/${cleanPath}`;
  return `${getApiBaseUrl()}${apiPath}`;
}

function buildRequestHeaders(init?: RequestInit): Record<string, string> {
  const token = sessionStorage.getItem('auth_token');
  const callerHeaders = new Headers(init?.headers as any);
  const hasContentType = !!callerHeaders.get('Content-Type');

  const baseHeaders: Record<string, string> = {};
  if (token) baseHeaders.Authorization = `Bearer ${token}`;
  if (init?.body !== undefined && !(init?.body instanceof FormData) && !hasContentType) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  return baseHeaders;
}

function setupAbortController(init?: RequestInit): { controller: AbortController; cleanup: () => void } {
  const attemptController = new AbortController();
  const timeoutId = setTimeout(() => attemptController.abort(), API_TIMEOUT);
  let removeAbortListener: (() => void) | null = null;

  if (init?.signal) {
    if (init.signal.aborted) {
      attemptController.abort();
    } else {
      const onAbort = () => attemptController.abort();
      init.signal.addEventListener('abort', onAbort);
      removeAbortListener = () => init.signal?.removeEventListener('abort', onAbort);
    }
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (removeAbortListener) removeAbortListener();
  };

  return { controller: attemptController, cleanup };
}

async function handleUnauthorized(path: string, token: string | null, baseHeaders: Record<string, string>): Promise<boolean> {
  if (token && !path.includes('/refresh') && !path.includes('/login')) {
    // Try to refresh token if we have one and this isn't a refresh/login request
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokens();
    }

    const refreshSuccess = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshSuccess) {
      // Update token in headers for retry
      const newToken = sessionStorage.getItem('auth_token');
      if (newToken) {
        baseHeaders.Authorization = `Bearer ${newToken}`;
        return true; // Indicate retry should happen
      }
    } else {
      // Refresh failed, emit unauthorized
      emitUnauthorized();
    }
  } else if (token && !path.includes('/login')) {
    // Token invalid/expired or unauthorized for login/refresh requests
    emitUnauthorized();
  }

  return false; // No retry needed
}

function shouldRetryError(status: number, attempt: number): boolean {
  return status >= 500 && attempt < API_RETRIES;
}

function shouldRetryNetworkError(attempt: number): boolean {
  return attempt < API_RETRIES;
}

async function processSuccessfulResponse<T>(res: Response): Promise<ApiResult<T>> {
  if (res.status === 204) {
    return { ok: true, status: res.status, headers: res.headers } as ApiResult<T>;
  }

  // Parse JSON; allow empty bodies
  try {
    const data = (await res.json()) as T;
    return { ok: true, data, status: res.status, headers: res.headers };
  } catch {
    return { ok: true, status: res.status, headers: res.headers } as ApiResult<T>;
  }
}

async function processFailedResponse<T>(res: Response): Promise<ApiResult<T>> {
  const msg = await safeText(res);
  return { ok: false, error: msg || res.statusText, status: res.status, headers: res.headers };
}

async function executeFetchAttempt<T>(
  fullUrl: string,
  init: RequestInit | undefined,
  baseHeaders: Record<string, string>,
  path: string,
  token: string | null,
  attempt: number
): Promise<{ result?: ApiResult<T>; shouldRetry: boolean; newAttempt: number }> {
  const { controller: attemptController, cleanup } = setupAbortController(init);

  try {
    const res = await fetch(fullUrl, {
      ...init,
      headers: {
        ...baseHeaders,
        ...(init?.headers),
      },
      credentials: 'include', // Important for cookies/sessions
      signal: attemptController.signal,
    });

    if (!res.ok) {
      if (res.status === 401) {
        const shouldRetry = await handleUnauthorized(path, token, baseHeaders);
        if (shouldRetry) {
          return { shouldRetry: true, newAttempt: 0 }; // Reset attempt counter for retry
        }
      }

      // Retry only for 5xx responses
      if (shouldRetryError(res.status, attempt)) {
        await sleep(1000 * 2 ** attempt + getSecureRandomJitter());
        return { shouldRetry: true, newAttempt: attempt + 1 };
      }
      const result = await processFailedResponse<T>(res);
      return { result, shouldRetry: false, newAttempt: attempt };
    }

    const result = await processSuccessfulResponse<T>(res);
    return { result, shouldRetry: false, newAttempt: attempt };
  } catch (err: any) {
    // Network error or abort; retry if attempts remain
    if (shouldRetryNetworkError(attempt)) {
      await sleep(1000 * 2 ** attempt + getSecureRandomJitter());
      return { shouldRetry: true, newAttempt: attempt + 1 };
    }
    if (err?.name === 'AbortError') {
      return { result: { ok: false, error: 'Request timed out' }, shouldRetry: false, newAttempt: attempt };
    }
    return { result: { ok: false, error: err?.message || 'Network error' }, shouldRetry: false, newAttempt: attempt };
  } finally {
    cleanup();
  }
}

// Token refresh function
async function refreshTokens(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/employees/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid/expired
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
      return false;
    }

    const data = await response.json();
    sessionStorage.setItem('auth_token', data.access_token);
    sessionStorage.setItem('refresh_token', data.refresh_token);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Token refresh failed:', error);
    }
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    return false;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let attempt = 0;
  const fullUrl = buildApiUrl(path);
  const token = sessionStorage.getItem('auth_token');
  const baseHeaders = buildRequestHeaders(init);

  // Debug logging only in development
  if (import.meta.env.DEV) {
    console.log('Final URL being used:', fullUrl);
    console.log('getApiBaseUrl() returned:', getApiBaseUrl());
  }

  while (true) {
    const { result, shouldRetry, newAttempt } = await executeFetchAttempt<T>(
      fullUrl,
      init,
      baseHeaders,
      path,
      token,
      attempt
    );

    if (result) return result;
    if (!shouldRetry) return { ok: false, error: 'Request failed' };

    attempt = newAttempt;
  }
}

function extractMessageFromJsonObject(j: any): string {
  if (typeof j === 'string') return j;

  if (j && typeof j === 'object') {
    // Handle the new backend error structure: { error: { message: "..." } }
    if (j.error && typeof j.error === 'object' && j.error.message !== undefined) {
      return String(j.error.message);
    }
    // Handle legacy detail field
    if (j.detail !== undefined) {
      return typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
    }
    // Handle direct message field
    if (j.message !== undefined) {
      return String(j.message);
    }
  }

  return JSON.stringify(j);
}

async function safeText(res: Response) {
  try {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const jsonData = await res.json();
      return extractMessageFromJsonObject(jsonData);
    }

    return await res.text();
  } catch {
    return '';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Secure random jitter for retry delays (0-200ms)
function getSecureRandomJitter(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Use crypto-secure random for better security
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] / (2 ** 32)) * 200; // Scale to 0-200ms
  }
  // Fallback for environments without crypto (like some test environments)
  return Math.random() * 200;
}

// API client with common methods
export const api = {
  get: async <T>(path: string, init?: RequestInit) => {
    return apiFetch<T>(path, { method: 'GET', ...init });
  },

  post: async <T>(path: string, data?: unknown, init?: RequestInit) => {
    return apiFetch<T>(path, {
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data),
      ...init,
    });
  },

  put: async <T>(path: string, data?: unknown, init?: RequestInit) => {
    return apiFetch<T>(path, {
      method: 'PUT',
      body: data === undefined ? undefined : JSON.stringify(data),
      ...init,
    });
  },

  patch: async <T>(path: string, data?: unknown, init?: RequestInit) => {
    return apiFetch<T>(path, {
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data),
      ...init,
    });
  },

  delete: async <T>(path: string, init?: RequestInit) => {
    return apiFetch<T>(path, { method: 'DELETE', ...init });
  }
}
