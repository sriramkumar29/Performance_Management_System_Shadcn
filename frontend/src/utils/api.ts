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

// Get base URL from window override (preferred) or environment, else empty string for relative paths
function getApiBaseUrl(): string {
  // Allow tests to override via window.__API_BASE_URL__ (takes precedence)
  const win = typeof window !== 'undefined' ? (window as any) : undefined;
  const winUrl = win && win.__API_BASE_URL__;
  // Resolve lazily so test setup can mutate import.meta.env at runtime
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || '';
  return (winUrl || envUrl || '') as string;
}
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 10000);
const API_RETRIES = Number(import.meta.env.VITE_API_RETRIES ?? 3);

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
    console.error('Token refresh failed:', error);
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');
    return false;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let attempt = 0;

  // Build URL with absolute URL passthrough; otherwise normalize to /api
  const isAbsolute = /^https?:\/\//i.test(path);
  const cleanPath = path.replace(/^\/+/, '');
  const apiPath = cleanPath.startsWith('api/') ? `/${cleanPath}` : `/api/${cleanPath}`;
  const fullUrl = isAbsolute ? path : `${getApiBaseUrl()}${apiPath}`;

  // Get JWT token from sessionStorage
  const token = sessionStorage.getItem('auth_token');

  // Base headers: Authorization if token present. Only set JSON Content-Type when a body exists and it's not FormData,
  // and caller hasn't already provided Content-Type.
  const callerHeaders = new Headers(init?.headers as any);
  const hasContentType = !!callerHeaders.get('Content-Type');
  const baseHeaders: Record<string, string> = {};
  if (token) baseHeaders.Authorization = `Bearer ${token}`;
  if (init?.body !== undefined && !(init?.body instanceof FormData) && !hasContentType) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  while (true) {
    // Per-attempt timeout and merged AbortSignal
    const attemptController = new AbortController();
    const timeoutId = setTimeout(() => attemptController.abort(), API_TIMEOUT);
    let removeAbortListener: (() => void) | null = null;
    if (init?.signal) {
      if (init.signal.aborted) {
        attemptController.abort();
      } else {
        const onAbort = () => attemptController.abort();
        init.signal.addEventListener('abort', onAbort);
        removeAbortListener = () => init.signal && init.signal.removeEventListener('abort', onAbort);
      }
    }

    try {
      const   res = await fetch(fullUrl, {
        ...init,
        headers: {
          ...baseHeaders,
          ...(init?.headers || {}),
        },
        credentials: 'include', // Important for cookies/sessions
        signal: attemptController.signal,
      });

      if (res.status === 204) {
        return { ok: true, status: res.status, headers: res.headers } as ApiResult<T>;
      }

      if (!res.ok) {
        if (res.status === 401 && token && !path.includes('/refresh') && !path.includes('/login')) {
          // Try to refresh token if we have one and this isn't a refresh/login request
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshTokens();
          }
          
          const refreshSuccess = await refreshPromise;
          isRefreshing = false;
          refreshPromise = null;
          
          if (refreshSuccess) {
            // Retry the original request with new token
            const newToken = sessionStorage.getItem('auth_token');
            if (newToken) {
              baseHeaders.Authorization = `Bearer ${newToken}`;
              attempt = 0; // Reset attempt counter for retry
              continue;
            }
          } else {
            // Refresh failed, emit unauthorized
            emitUnauthorized();
          }
        } else if (res.status === 401) {
          // Token invalid/expired or unauthorized for login/refresh requests
          if (token && !path.includes('/login')) emitUnauthorized();
        }
        
        // Retry only for 5xx responses
        if (res.status >= 500 && attempt < API_RETRIES) {
          attempt++;
          await sleep(1000 * 2 ** attempt + Math.random() * 200);
          continue;
        }
        const msg = await safeText(res);
        return { ok: false, error: msg || res.statusText, status: res.status, headers: res.headers };
      }

      // Parse JSON; allow empty bodies
      try {
        const data = (await res.json()) as T;
        return { ok: true, data, status: res.status, headers: res.headers };
      } catch {
        return { ok: true, status: res.status, headers: res.headers } as ApiResult<T>;
      }
    } catch (err: any) {
      // Network error or abort; retry if attempts remain
      if (attempt < API_RETRIES) {
        attempt++;
        await sleep(1000 * 2 ** attempt + Math.random() * 200);
        continue;
      }
      if (err?.name === 'AbortError') {
        return { ok: false, error: 'Request timed out' };
      }
      return { ok: false, error: err?.message || 'Network error' };
    } finally {
      clearTimeout(timeoutId);
      if (removeAbortListener) removeAbortListener();
    }
  }
}

async function safeText(res: Response) {
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j: any = await res.json();
      if (typeof j === 'string') return j;
      if (j && typeof j === 'object') {
        if (j.detail !== undefined) {
          return typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
        }
        if (j.message !== undefined) {
          return String(j.message);
        }
      }
      return JSON.stringify(j);
    }
    return await res.text();
  } catch {
    return '';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// API client with common methods
export const api = {
  get: async <T>(path: string, init?: RequestInit) => {
    return apiFetch<T>(path, { method: 'GET', ...init });
  },
  
  post: async <T>(path: string, data?: unknown, init?: RequestInit) => {
    return apiFetch<T>(path, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...init,
    });
  },
  
  /**
   * PUT request with JSON body.
   *
   * @param path URL path
   * @param data Optional JSON-serializable data to send in the request body
   * @param init Optional `RequestInit` object
   * @returns Result of the API call
   */
  put: async <T>(path: string, data?: unknown, init?: RequestInit) => {
    return apiFetch<T>(path, {
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...init,
    });
  },
  
  patch: async <T>(path: string, data?: unknown, init?: RequestInit) => {
    return apiFetch<T>(path, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...init,
    });
  },
  
  delete: async <T>(path: string, init?: RequestInit) => {
    return apiFetch<T>(path, { method: 'DELETE', ...init });
  }
}
