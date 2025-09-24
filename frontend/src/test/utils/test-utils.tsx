import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'
import { vi } from 'vitest'

// Mock AuthContext for testing
type MockAuthContextValue = AuthContextValue

const createMockAuthContext = (overrides: Partial<MockAuthContextValue> = {}): MockAuthContextValue => ({
  user: null,
  status: 'idle',
  loginWithCredentials: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  ...overrides
})

// Test utilities for setting up sessionStorage
export const setupAuthTokens = (accessToken = 'test-token', refreshToken = 'test-refresh') => {
  const mockSessionStorage = {
    getItem: vi.fn((key: string) => {
      if (key === 'auth_token') return accessToken
      if (key === 'refresh_token') return refreshToken
      if (key === 'auth_user') return JSON.stringify({
        emp_id: 1,
        emp_name: 'Test User',
        emp_email: 'test@company.com',
        emp_roles: 'Manager',
        emp_roles_level: 4
      })
      return null
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
  
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true
  })
  
  return mockSessionStorage
}

export const clearAuthTokens = () => {
  const mockSessionStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
  
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true
  })
  
  return mockSessionStorage
}

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  auth?: Partial<MockAuthContextValue>
  withRouter?: boolean
}

// Custom render function
export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    initialEntries = ['/'],
    auth = {},
    withRouter = true,
    ...renderOptions
  } = options

  const mockAuthValue = createMockAuthContext(auth)

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const content = (
      <AuthContext.Provider value={mockAuthValue}>
        {children}
      </AuthContext.Provider>
    )

    if (withRouter) {
      return (
        <MemoryRouter initialEntries={initialEntries}>
          {content}
        </MemoryRouter>
      )
    }

    return <>{content}</>
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockAuth: mockAuthValue
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Override the default render with our custom render
export { customRender as render }
