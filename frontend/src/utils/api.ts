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
  try { return await res.text(); } catch { return ''; }
}

// API client with common methods
export const api = {
  get: async (path: string) => {
    const response = await fetch(path.startsWith('/api') ? path : `/api${path}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },
  
  post: async (path: string, data: any) => {
    const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },
  
  put: async (path: string, data: any) => {
    const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },
  
  delete: async (path: string) => {
    const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }
}
