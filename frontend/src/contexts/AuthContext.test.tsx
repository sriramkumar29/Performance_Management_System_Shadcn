import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import * as authEvents from '../utils/auth-events'

// Mock auth-events
vi.mock('../utils/auth-events', () => ({
  emitUnauthorized: vi.fn(),
  onUnauthorized: vi.fn()
}))

// Mock API
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn()
}))

const TestComponent = () => {
  const { user, status, loginWithCredentials, logout } = useAuth()
  
  return (
    <div>
      <div data-testid="auth-status">
        {status === 'succeeded' && user ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-name">
        {user?.emp_name || 'no-user'}
      </div>
      <button onClick={() => loginWithCredentials('test@company.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('should provide initial unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('no-user')
  })

  it('should restore user from sessionStorage on mount', () => {
    const mockUser = {
      emp_id: 1,
      emp_name: 'John Doe',
      emp_email: 'john@company.com',
      emp_roles: 'Manager',
      emp_roles_level: 5,
      emp_department: 'Engineering',
      token: 'mock-token'
    }

    sessionStorage.setItem('user', JSON.stringify(mockUser))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
  })

  it('should handle successful login', async () => {
    const mockUser = {
      emp_id: 1,
      emp_name: 'John Doe',
      emp_email: 'john@company.com',
      emp_roles: 'Manager',
      emp_roles_level: 5,
      emp_department: 'Engineering',
      token: 'mock-token'
    }

    const { apiFetch } = await import('../utils/api')
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: mockUser })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    
    await act(async () => {
      loginButton.click()
    })

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
  })

  it('should handle logout', () => {
    const mockUser = {
      emp_id: 1,
      emp_name: 'John Doe',
      emp_email: 'john@company.com',
      token: 'mock-token'
    }

    sessionStorage.setItem('user', JSON.stringify(mockUser))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const logoutButton = screen.getByText('Logout')
    
    act(() => {
      logoutButton.click()
    })

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('no-user')
    expect(sessionStorage.getItem('user')).toBeNull()
  })

  it('should handle unauthorized events', () => {
    const mockUser = {
      emp_id: 1,
      emp_name: 'John Doe',
      token: 'mock-token'
    }

    sessionStorage.setItem('user', JSON.stringify(mockUser))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Simulate unauthorized event
    const onUnauthorizedCallback = vi.mocked(authEvents.onUnauthorized).mock.calls[0][0]
    
    act(() => {
      onUnauthorizedCallback()
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
    expect(sessionStorage.getItem('user')).toBeNull()
  })
})
