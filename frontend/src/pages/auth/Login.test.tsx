import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render, userEvent, clearAuthTokens, setupAuthTokens } from '../../test/test-utils'
import Login from './Login'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthTokens()
    mockNavigate.mockClear()
  })

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      render(<Login />, { withRouter: false })

      expect(screen.getByRole('heading', { name: /performance management/i })).toBeInTheDocument()
      expect(screen.getByText(/welcome back! please sign in to continue/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/work email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should have proper form structure and accessibility', () => {
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Authentication redirect', () => {
    it('should redirect to home when user is already authenticated', () => {
      setupAuthTokens()
      const mockUser = {
        emp_id: 1,
        emp_name: 'Test User',
        emp_email: 'test@company.com'
      }

      render(<Login />, { 
        withRouter: false,
        auth: { user: mockUser, status: 'succeeded' }
      })

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should not redirect when user is not authenticated', () => {
      render(<Login />, { 
        withRouter: false,
        auth: { user: null, status: 'idle' }
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Form validation', () => {
    it('should show email validation error for empty email', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter your email/i)).toBeInTheDocument()
      })
    })

    it('should show email validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('should show password validation error for empty password', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      const submitButton = screen.getRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@company.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter your password/i)).toBeInTheDocument()
      })
    })

    it('should show password validation error for short password', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@company.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })

    it('should clear validation errors when inputs are corrected', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Trigger validation errors
      await user.click(submitButton)
      await waitFor(() => {
        expect(screen.getByText(/please enter your email/i)).toBeInTheDocument()
      })

      // Fix the inputs
      await user.type(emailInput, 'test@company.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/please enter your email/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/please enter your password/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form submission', () => {
    it('should disable submit button and show loading state during login', async () => {
      const user = userEvent.setup()
      const mockLoginWithCredentials = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<Login />, { 
        withRouter: false,
        auth: { 
          status: 'loading',
          loginWithCredentials: mockLoginWithCredentials
        }
      })

      const submitButton = screen.getByRole('button', { name: /signing in.../i })
      
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument()
      expect(screen.getByTestId('loader-icon') || screen.getByRole('img', { hidden: true })).toBeInTheDocument()
    })

    it('should call loginWithCredentials with correct parameters on valid submission', async () => {
      const user = userEvent.setup()
      const mockLoginWithCredentials = vi.fn().mockResolvedValue(undefined)
      const { toast } = await import('sonner')

      render(<Login />, { 
        withRouter: false,
        auth: { 
          status: 'idle',
          loginWithCredentials: mockLoginWithCredentials
        }
      })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@company.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLoginWithCredentials).toHaveBeenCalledWith('test@company.com', 'password123')
      })

      expect(toast.success).toHaveBeenCalledWith('Welcome back!')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should show error toast on login failure', async () => {
      const user = userEvent.setup()
      const mockLoginWithCredentials = vi.fn().mockRejectedValue(
        new Error('Invalid credentials')
      )
      const { toast } = await import('sonner')

      render(<Login />, { 
        withRouter: false,
        auth: { 
          status: 'idle',
          loginWithCredentials: mockLoginWithCredentials
        }
      })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@company.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid credentials')
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should show generic error message when error has no message', async () => {
      const user = userEvent.setup()
      const mockLoginWithCredentials = vi.fn().mockRejectedValue(new Error())
      const { toast } = await import('sonner')

      render(<Login />, { 
        withRouter: false,
        auth: { 
          status: 'idle',
          loginWithCredentials: mockLoginWithCredentials
        }
      })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@company.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please check your credentials and try again.')
      })
    })
  })

  describe('Keyboard navigation', () => {
    it('should allow form submission via Enter key', async () => {
      const user = userEvent.setup()
      const mockLoginWithCredentials = vi.fn().mockResolvedValue(undefined)

      render(<Login />, { 
        withRouter: false,
        auth: { 
          status: 'idle',
          loginWithCredentials: mockLoginWithCredentials
        }
      })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@company.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockLoginWithCredentials).toHaveBeenCalledWith('test@company.com', 'password123')
      })
    })

    it('should allow tabbing between form elements', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      emailInput.focus()
      expect(emailInput).toHaveFocus()

      await user.keyboard('{Tab}')
      expect(passwordInput).toHaveFocus()

      await user.keyboard('{Tab}')
      expect(submitButton).toHaveFocus()
    })
  })

  describe('Input handling', () => {
    it('should update email state when typing in email field', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      
      await user.type(emailInput, 'test@company.com')
      
      expect(emailInput).toHaveValue('test@company.com')
    })

    it('should update password state when typing in password field', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(passwordInput, 'mypassword')
      
      expect(passwordInput).toHaveValue('mypassword')
    })

    it('should clear form inputs when cleared', async () => {
      const user = userEvent.setup()
      render(<Login />, { withRouter: false })

      const emailInput = screen.getByLabelText(/work email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(emailInput, 'test@company.com')
      await user.type(passwordInput, 'password123')
      
      await user.clear(emailInput)
      await user.clear(passwordInput)
      
      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
    })
  })
})
