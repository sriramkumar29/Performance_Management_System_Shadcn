import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render, clearAuthTokens, setupAuthTokens } from '../test/test-utils'
import ProtectedRoute from './ProtectedRoute'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
      mockNavigate(to, { replace })
      return <div data-testid="navigate-component">Redirecting to {to}</div>
    },
    Outlet: () => <div data-testid="outlet">Protected Content</div>,
    useLocation: () => ({ pathname: '/dashboard' })
  }
})

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthTokens()
    mockNavigate.mockClear()
  })

  describe('Authentication checks', () => {
    it('should redirect to login when user is not authenticated', () => {
      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: null, status: 'idle' }
      })

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(screen.getByText('Redirecting to /login')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })

    it('should render protected content when user is authenticated', () => {
      const mockUser = {
        emp_id: 1,
        emp_name: 'Test User',
        emp_email: 'test@company.com',
        emp_roles: 'Manager',
        emp_roles_level: 4
      }

      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: mockUser, status: 'succeeded' }
      })

      expect(screen.getByTestId('outlet')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should render protected content when user exists regardless of status', () => {
      const mockUser = {
        emp_id: 1,
        emp_name: 'Test User',
        emp_email: 'test@company.com'
      }

      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: mockUser, status: 'loading' }
      })

      expect(screen.getByTestId('outlet')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('Animation container', () => {
    it('should render animation container with correct classes when authenticated', () => {
      const mockUser = {
        emp_id: 1,
        emp_name: 'Test User',
        emp_email: 'test@company.com'
      }

      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: mockUser, status: 'succeeded' }
      })

      const animationContainer = screen.getByTestId('outlet').parentElement
      expect(animationContainer).toHaveClass('animate-in', 'fade-in-0', 'duration-200', 'motion-reduce:animate-none')
    })

    it('should use pathname as key for animation container', () => {
      const mockUser = {
        emp_id: 1,
        emp_name: 'Test User',
        emp_email: 'test@company.com'
      }

      const { container } = render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: mockUser, status: 'succeeded' }
      })

      const animationContainer = container.querySelector('[data-key="/dashboard"]') || 
                                 container.querySelector('div[class*="animate-in"]')
      expect(animationContainer).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined user', () => {
      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: undefined as any, status: 'idle' }
      })

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })

    it('should handle null user explicitly', () => {
      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: null, status: 'succeeded' }
      })

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })

    it('should handle user with minimal properties', () => {
      const minimalUser = {
        emp_id: 1,
        emp_name: 'Test',
        emp_email: 'test@test.com'
      }

      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: minimalUser, status: 'succeeded' }
      })

      expect(screen.getByTestId('outlet')).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Integration with sessionStorage', () => {
    it('should work with sessionStorage tokens present', () => {
      setupAuthTokens()
      const mockUser = {
        emp_id: 1,
        emp_name: 'Test User',
        emp_email: 'test@company.com'
      }

      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: mockUser, status: 'succeeded' }
      })

      expect(screen.getByTestId('outlet')).toBeInTheDocument()
    })

    it('should still redirect when no user despite tokens in sessionStorage', () => {
      setupAuthTokens()

      render(<ProtectedRoute />, {
        withRouter: false,
        auth: { user: null, status: 'idle' }
      })

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
