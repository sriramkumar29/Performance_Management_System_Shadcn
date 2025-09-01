import '@testing-library/jest-dom'
import 'whatwg-fetch'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from './mocks/server'

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished
afterAll(() => server.close())

// Mock sessionStorage with an in-memory store
const sessionStore = new Map<string, string>()
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn((key: string) => (sessionStore.has(key) ? sessionStore.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      sessionStore.set(key, String(value))
    }),
    removeItem: vi.fn((key: string) => {
      sessionStore.delete(key)
    }),
    clear: vi.fn(() => {
      sessionStore.clear()
    }),
  },
  writable: true,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
