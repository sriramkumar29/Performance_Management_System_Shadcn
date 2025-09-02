/**
 * Frontend integration test that communicates with real FastAPI backend.
 * Tests form submission and backend response without API mocking.
 */
import { describe, test, beforeAll, afterEach, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import Login from '../pages/auth/Login'
import App from '../App'
import { waitForBackend, TEST_CREDENTIALS, loginAndGetToken } from './integration-setup'

// Test wrapper with all required providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)

describe('Integration: Frontend ↔ Backend', () => {
  beforeAll(async () => {
    // Ensure backend is running before tests
    await waitForBackend()
  })

  test('login form submits to real backend and shows success', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    )

    // Fill login form
    const emailInput = screen.getByLabelText(/work email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: TEST_CREDENTIALS.email } })
    fireEvent.change(passwordInput, { target: { value: TEST_CREDENTIALS.password } })

    // Submit form and wait for backend response
    fireEvent.click(submitButton)

    // Wait for success toast or navigation
    await waitFor(
      () => {
        // Check if tokens are stored (indicates successful login)
        const token = sessionStorage.getItem('auth_token')
        expect(token).toBeTruthy()
      },
      { timeout: 5000 }
    )
  })

  test('authenticated user can load dashboard with real API calls', async () => {
    // Get auth token from backend
    const token = await loginAndGetToken()
    
    // Set up authenticated session
    sessionStorage.setItem('auth_token', token)
    sessionStorage.setItem('auth_user', JSON.stringify({
      emp_id: 1,
      emp_name: 'Test User',
      emp_email: TEST_CREDENTIALS.email,
      emp_roles: 'Manager',
      emp_roles_level: 5
    }))

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    )

    // Verify dashboard loads
    await waitFor(() => {
      expect(screen.getByText('Performance Management')).toBeInTheDocument()
    })

    // Verify manager sees team tab (role-based UI)
    expect(screen.getByRole('tab', { name: /team appraisal/i })).toBeInTheDocument()
  })

  afterEach(() => {
    // Clean up session storage between tests
    sessionStorage.clear()
  })
})
