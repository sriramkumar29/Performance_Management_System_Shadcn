export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
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
