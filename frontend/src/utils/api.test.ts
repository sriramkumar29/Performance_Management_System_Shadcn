import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { apiFetch, api } from './api'
import { emitUnauthorized } from './auth-events'

// Mock auth-events
vi.mock('./auth-events', () => ({
  emitUnauthorized: vi.fn()
}))

// Mock environment variables
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
vi.stubEnv('VITE_API_TIMEOUT', '5000')
vi.stubEnv('VITE_API_RETRIES', '2')

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear sessionStorage
    sessionStorage.clear()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('URL construction', () => {
    it('should handle absolute URLs without modification', async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await apiFetch('https://external-api.com/data')

      expect(fetch).toHaveBeenCalledWith(
        'https://external-api.com/data',
        expect.any(Object)
      )
    })

    it('should normalize relative paths to /api/', async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await apiFetch('employees')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/employees',
        expect.any(Object)
      )
    })

    it('should handle paths that already start with api/', async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await apiFetch('api/employees')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/employees',
        expect.any(Object)
      )
    })
  })

  describe('Authorization headers', () => {
    it('should add Authorization header when token exists', async () => {
      sessionStorage.setItem('auth_token', 'test-token')
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await apiFetch('employees')

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      )
    })

    it('should not add Authorization header when no token', async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await apiFetch('employees')

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit
      expect(callArgs.headers).not.toHaveProperty('Authorization')
    })
  })

  describe('Content-Type handling', () => {
    it('should set JSON Content-Type for non-FormData body', async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await apiFetch('employees', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' })
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should not override existing Content-Type', async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await apiFetch('employees', {
        method: 'POST',
        body: 'raw data',
        headers: { 'Content-Type': 'text/plain' }
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/plain'
          })
        })
      )
    })

    it('should not set Content-Type for FormData', async () => {
      const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      const formData = new FormData()

      await apiFetch('employees', {
        method: 'POST',
        body: formData
      })

      const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit
      const headers = callArgs.headers as Record<string, string>
      expect(headers).not.toHaveProperty('Content-Type')
    })
  })

  describe('Response handling', () => {
    it('should handle 204 No Content responses', async () => {
      const mockResponse = { 
        ok: true, 
        status: 204, 
        headers: new Headers(),
        json: () => Promise.reject(new Error('No content'))
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await apiFetch('employees/1', { method: 'DELETE' })

      expect(result).toEqual({
        ok: true,
        status: 204,
        headers: expect.any(Headers)
      })
    })

    it('should parse JSON responses successfully', async () => {
      const mockData = { id: 1, name: 'Test' }
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockData)
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await apiFetch('employees')

      expect(result).toEqual({
        ok: true,
        data: mockData,
        status: 200,
        headers: expect.any(Headers)
      })
    })

    it('should handle empty JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.reject(new Error('Unexpected end of JSON input'))
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await apiFetch('employees')

      expect(result).toEqual({
        ok: true,
        status: 200,
        headers: expect.any(Headers)
      })
    })
  })

  describe('Error handling', () => {
    it('should parse JSON error with detail field', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ detail: 'Validation error' }),
        text: () => Promise.resolve(''),
        statusText: 'Bad Request'
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await apiFetch('employees')

      expect(result).toEqual({
        ok: false,
        error: 'Validation error',
        status: 400,
        headers: expect.any(Headers)
      })
    })

    it('should parse JSON error with message field', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Something went wrong' }),
        text: () => Promise.resolve(''),
        statusText: 'Bad Request'
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await apiFetch('employees')

      expect(result).toEqual({
        ok: false,
        error: 'Something went wrong',
        status: 400,
        headers: expect.any(Headers)
      })
    })

    it('should fallback to text response for non-JSON errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/plain' }),
        json: () => Promise.reject(new Error('Not JSON')),
        text: () => Promise.resolve('Internal Server Error'),
        statusText: 'Internal Server Error'
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await apiFetch('employees')

      expect(result).toEqual({
        ok: false,
        error: 'Internal Server Error',
        status: 500,
        headers: expect.any(Headers)
      })
    })
  })

  describe('401 handling and token refresh', () => {
    it('should attempt token refresh on 401 and retry original request', async () => {
      sessionStorage.setItem('auth_token', 'expired-token')
      sessionStorage.setItem('refresh_token', 'valid-refresh')

      // First call returns 401
      const unauthorizedResponse = {
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Token expired' }),
        text: () => Promise.resolve(''),
        statusText: 'Unauthorized'
      }

      // Refresh call succeeds
      const refreshResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          access_token: 'new-token',
          refresh_token: 'new-refresh'
        })
      }

      // Retry with new token succeeds
      const retryResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ data: 'success' })
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce(unauthorizedResponse as any)  // Original request
        .mockResolvedValueOnce(refreshResponse as any)       // Refresh request
        .mockResolvedValueOnce(retryResponse as any)         // Retry request

      const result = await apiFetch('employees')

      expect(fetch).toHaveBeenCalledTimes(3)
      expect(sessionStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token')
      expect(sessionStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh')
      expect(result).toEqual({
        ok: true,
        data: { data: 'success' },
        status: 200,
        headers: expect.any(Headers)
      })
    })

    it('should emit unauthorized event when refresh fails', async () => {
      sessionStorage.setItem('auth_token', 'expired-token')
      sessionStorage.setItem('refresh_token', 'invalid-refresh')

      // First call returns 401
      const unauthorizedResponse = {
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Token expired' }),
        text: () => Promise.resolve(''),
        statusText: 'Unauthorized'
      }

      // Refresh call fails
      const refreshResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Invalid refresh token' })
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce(unauthorizedResponse as any)
        .mockResolvedValueOnce(refreshResponse as any)

      const result = await apiFetch('employees')

      expect(emitUnauthorized).toHaveBeenCalled()
      expect(result.ok).toBe(false)
    })

    it('should not attempt refresh for login endpoints', async () => {
      sessionStorage.setItem('auth_token', 'some-token')

      const unauthorizedResponse = {
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Invalid credentials' }),
        text: () => Promise.resolve(''),
        statusText: 'Unauthorized'
      }

      vi.mocked(fetch).mockResolvedValueOnce(unauthorizedResponse as any)

      const result = await apiFetch('employees/login')

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(result.ok).toBe(false)
    })
  })

  describe('Retry logic', () => {
    it('should retry on 5xx errors up to configured limit', async () => {
      const serverErrorResponse = {
        ok: false,
        status: 500,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Server error' }),
        text: () => Promise.resolve(''),
        statusText: 'Internal Server Error'
      }

      const successResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ data: 'success' })
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce(serverErrorResponse as any)
        .mockResolvedValueOnce(serverErrorResponse as any)
        .mockResolvedValueOnce(successResponse as any)

      const result = await apiFetch('employees')

      expect(fetch).toHaveBeenCalledTimes(3)
      expect(result.ok).toBe(true)
    })

    it('should not retry 4xx errors', async () => {
      const clientErrorResponse = {
        ok: false,
        status: 400,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Bad request' }),
        text: () => Promise.resolve(''),
        statusText: 'Bad Request'
      }

      vi.mocked(fetch).mockResolvedValueOnce(clientErrorResponse as any)

      const result = await apiFetch('employees')

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(result.ok).toBe(false)
    })
  })

  describe('Timeout handling', () => {
    it('should return timeout error when request times out', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100)
        })
      )

      const result = await apiFetch('employees')

      expect(result).toEqual({
        ok: false,
        error: 'Request timed out'
      })
    })
  })

  describe('Network error handling', () => {
    it('should handle network errors with retries', async () => {
      const networkError = new Error('Network error')
      const successResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ data: 'success' })
      }

      vi.mocked(fetch)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse as any)

      const result = await apiFetch('employees')

      expect(fetch).toHaveBeenCalledTimes(3)
      expect(result.ok).toBe(true)
    })

    it('should return network error after max retries', async () => {
      const networkError = new Error('Network error')

      vi.mocked(fetch).mockRejectedValue(networkError)

      const result = await apiFetch('employees')

      expect(fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
      expect(result).toEqual({
        ok: false,
        error: 'Network error'
      })
    })
  })
})

describe('api helper methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should call GET with correct parameters', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    await api.get('employees')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('employees'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('should call POST with JSON body', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    const data = { name: 'test' }
    await api.post('employees', data)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('employees'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(data)
      })
    )
  })

  it('should call PUT with JSON body', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    const data = { name: 'updated' }
    await api.put('employees/1', data)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('employees/1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(data)
      })
    )
  })

  it('should call DELETE with correct parameters', async () => {
    const mockResponse = { ok: true, status: 204 }
    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    await api.delete('employees/1')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('employees/1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
