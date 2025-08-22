import { emitUnauthorized } from './auth-events';

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

// Get base URL from environment or use empty string for relative paths
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    // Remove leading slash from path if present and ensure it starts with /api
    const cleanPath = path.replace(/^\/+/, '');
    const apiPath = cleanPath.startsWith('api/') ? `/${cleanPath}` : `/api/${cleanPath}`;
    
    // Get JWT token from sessionStorage
    const token = sessionStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_BASE_URL}${apiPath}`, {
      headers: { 
        ...headers,
        ...(init?.headers || {}) 
      },
      credentials: 'include', // Important for cookies/sessions
      ...init,
    });
    if (!res.ok) {
      if (res.status === 401) {
        // Token invalid/expired or unauthorized. Notify listeners to logout.
        emitUnauthorized();
      }
      const msg = await safeText(res);
      return { ok: false, error: msg || res.statusText };
    }
    // Handle empty/204 responses gracefully
    if (res.status === 204) {
      return { ok: true } as ApiResult<T>;
    }
    // Try JSON; if it fails but status is 2xx, still consider it ok with undefined data
    try {
      const data = (await res.json()) as T;
      return { ok: true, data };
    } catch {
      return { ok: true } as ApiResult<T>;
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
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
  
  put: async <T>(path: string, data?: unknown, init?: RequestInit) => {
    return apiFetch<T>(path, {
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...init,
    });
  },
  
  delete: async <T>(path: string, init?: RequestInit) => {
    return apiFetch<T>(path, { method: 'DELETE', ...init });
  }
}
