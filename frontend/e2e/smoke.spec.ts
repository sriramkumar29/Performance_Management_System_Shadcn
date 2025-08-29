import { test, expect } from '@playwright/test'

test.describe('Performance Management System - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend API for E2E tests
    await page.route('**/api/employees/login', async route => {
      const request = route.request()
      const body = await request.postDataJSON()
      
      if (body.email === 'test@company.com' && body.password === 'password123') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token'
          })
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid credentials' })
        })
      }
    })

    await page.route('**/api/employees/by-email*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          emp_id: 1,
          emp_name: 'Test User',
          emp_email: 'test@company.com',
          emp_roles: 'Manager',
          emp_roles_level: 4,
          emp_department: 'Engineering'
        })
      })
    })

    await page.route('**/api/employees', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            emp_id: 1,
            emp_name: 'Test User',
            emp_email: 'test@company.com',
            emp_roles: 'Manager',
            emp_roles_level: 4
          },
          {
            emp_id: 2,
            emp_name: 'Jane Smith',
            emp_email: 'jane.smith@company.com',
            emp_roles: 'Developer',
            emp_roles_level: 3
          },
          {
            emp_id: 3,
            emp_name: 'Bob Wilson',
            emp_email: 'bob.wilson@company.com',
            emp_roles: 'VP',
            emp_roles_level: 6
          }
        ])
      })
    })

    await page.route('**/api/appraisal-types', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Annual', has_range: false },
          { id: 2, name: 'Half-yearly', has_range: true },
          { id: 3, name: 'Quarterly', has_range: true }
        ])
      })
    })

    await page.route('**/api/appraisals', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appraisal_id: 123,
            status: 'Draft'
          })
        })
      }
    })

    await page.route('**/api/appraisals/123/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          appraisal_id: 123,
          status: 'Submitted'
        })
      })
    })
  })

  test('should complete login flow successfully', async ({ page }) => {
    await page.goto('/login')

    // Verify login page loads
    await expect(page.getByRole('heading', { name: /performance management/i })).toBeVisible()
    await expect(page.getByText(/welcome back! please sign in to continue/i)).toBeVisible()

    // Fill login form
    await page.getByLabel(/work email address/i).fill('test@company.com')
    await page.getByLabel(/password/i).fill('password123')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard/home
    await expect(page).toHaveURL('/')
    
    // Should show success toast (if visible)
    await expect(page.getByText(/welcome back!/i)).toBeVisible({ timeout: 5000 })
  })

  test('should handle login failure gracefully', async ({ page }) => {
    await page.goto('/login')

    // Fill with invalid credentials
    await page.getByLabel(/work email address/i).fill('wrong@company.com')
    await page.getByLabel(/password/i).fill('wrongpassword')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 })
    
    // Should remain on login page
    await expect(page).toHaveURL('/login')
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/appraisal/create')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: /performance management/i })).toBeVisible()
  })

  test('should navigate to protected routes after authentication', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/work email address/i).fill('test@company.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for redirect
    await expect(page).toHaveURL('/')

    // Navigate to create appraisal
    await page.goto('/appraisal/create')
    
    // Should load the create appraisal page
    await expect(page.getByRole('heading', { name: /create new appraisal/i })).toBeVisible()
    await expect(page.getByText(/new draft/i)).toBeVisible()
  })

  test('should complete create appraisal happy path', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/work email address/i).fill('test@company.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')

    // Navigate to create appraisal
    await page.goto('/appraisal/create')
    await expect(page.getByRole('heading', { name: /create new appraisal/i })).toBeVisible()

    // Fill appraisal details
    // Select employee
    await page.getByRole('combobox', { name: /employee/i }).click()
    await page.getByRole('option', { name: /jane smith/i }).click()

    // Select reviewer
    await page.getByRole('combobox', { name: /reviewer/i }).click()
    await page.getByRole('option', { name: /bob wilson/i }).click()

    // Select appraisal type
    await page.getByRole('combobox', { name: /appraisal type/i }).click()
    await page.getByRole('option', { name: /annual/i }).click()

    // Wait for period to be auto-calculated
    await expect(page.locator('input[value="2024-01-01"]')).toBeVisible()
    await expect(page.locator('input[value="2024-12-31"]')).toBeVisible()

    // Save draft
    await page.getByRole('button', { name: /save draft/i }).click()

    // Should show success message
    await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/your draft appraisal has been created/i)).toBeVisible({ timeout: 5000 })

    // Status should change to Draft
    await expect(page.getByText('Draft')).toBeVisible()
  })

  test('should validate form fields and show appropriate errors', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/work email address/i).fill('test@company.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')

    // Navigate to create appraisal
    await page.goto('/appraisal/create')

    // Try to save without filling required fields
    const saveButton = page.getByRole('button', { name: /save draft/i })
    await expect(saveButton).toBeDisabled()

    // Add Goal button should be disabled with reason
    const addGoalButton = page.getByRole('button', { name: /add goal/i })
    await expect(addGoalButton).toBeDisabled()
    await expect(page.getByText(/select an employee first/i)).toBeVisible()
  })

  test('should handle navigation and back button', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/work email address/i).fill('test@company.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')

    // Navigate to create appraisal
    await page.goto('/appraisal/create')
    await expect(page.getByRole('heading', { name: /create new appraisal/i })).toBeVisible()

    // Click back button
    await page.getByRole('button', { name: /back/i }).click()

    // Should navigate back (in this case, likely to home)
    await expect(page).toHaveURL('/')
  })

  test('should show loading states appropriately', async ({ page }) => {
    // Login with loading state
    await page.goto('/login')
    await page.getByLabel(/work email address/i).fill('test@company.com')
    await page.getByLabel(/password/i).fill('password123')

    // Click submit and check for loading state
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()

    // Should briefly show loading state
    await expect(page.getByText(/signing in.../i)).toBeVisible({ timeout: 2000 })
  })

  test('should handle responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /performance management/i })).toBeVisible()

    // Form should be responsive
    const emailInput = page.getByLabel(/work email address/i)
    const passwordInput = page.getByLabel(/password/i)
    const submitButton = page.getByRole('button', { name: /sign in/i })

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()

    // Complete login
    await emailInput.fill('test@company.com')
    await passwordInput.fill('password123')
    await submitButton.click()

    await expect(page).toHaveURL('/')

    // Navigate to create appraisal and check mobile layout
    await page.goto('/appraisal/create')
    await expect(page.getByRole('heading', { name: /create new appraisal/i })).toBeVisible()

    // Back button should show only icon on mobile
    const backButton = page.getByRole('button', { name: /back/i })
    await expect(backButton).toBeVisible()
  })

  test('should persist authentication across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/work email address/i).fill('test@company.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')

    // Navigate to protected route
    await page.goto('/appraisal/create')
    await expect(page.getByRole('heading', { name: /create new appraisal/i })).toBeVisible()

    // Refresh the page
    await page.reload()

    // Should still be authenticated and on the same page
    await expect(page.getByRole('heading', { name: /create new appraisal/i })).toBeVisible()
    await expect(page).toHaveURL('/appraisal/create')
  })
})
