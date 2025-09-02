/**
 * Integration test setup for frontend tests that communicate with real backend.
 * Disables MSW mocking and configures API to use live FastAPI server.
 */
import { beforeAll } from 'vitest'

// Override API base URL to point to live backend (test server on port 7001)
const BACKEND_URL = 'http://localhost:7001'

// Helper to wait for backend availability
export async function waitForBackend(timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BACKEND_URL}/`)
      if (response.ok) return
    } catch (e) {
      // Backend not ready, continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Backend at ${BACKEND_URL} not available after ${timeoutMs}ms`)
}

// Test credentials (must match backend seed data)
export const TEST_CREDENTIALS = {
  email: 'john.ceo@example.com',
  password: 'password123'
}

// Helper to perform login and get auth token
export async function loginAndGetToken(): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/api/employees/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS)
  })
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }
  
  const data = await response.json()
  return data.access_token
}

// Override environment variables for integration tests
beforeAll(() => {
  // Ensure API calls go to live backend, not mocked
  import.meta.env.VITE_API_BASE_URL = BACKEND_URL
  // Disable MSW if it's running
  if (typeof window !== 'undefined' && (window as any).msw) {
    (window as any).msw.stop()
  }
})
