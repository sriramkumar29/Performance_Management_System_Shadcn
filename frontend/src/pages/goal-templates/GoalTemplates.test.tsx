import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import GoalTemplates from './GoalTemplates'
import * as api from '../../utils/api'

vi.mock('../../utils/api')

// ✅ hoist mockUseAuth so it's available at mock time
const { mockUseAuth } = vi.hoisted(() => {
  return { mockUseAuth: vi.fn() }
})

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}))

const mockManagerUser = {
  emp_id: 2,
  emp_name: 'Manager One',
  emp_email: 'manager@company.com',
  emp_roles: 'Manager',
  emp_roles_level: 5,
  emp_department: 'Engineering',
}

const renderGoalTemplates = () => {
  return render(
    <BrowserRouter>
      <GoalTemplates />
    </BrowserRouter>
  )
}

describe('GoalTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockManagerUser,
      status: 'succeeded',
      loginWithCredentials: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('should render page title', () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] })

    renderGoalTemplates()

    expect(screen.getByText('Goal Templates')).toBeInTheDocument()
  })

  it('should show create template button', () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] })

    renderGoalTemplates()

    expect(screen.getByText('Create New Template')).toBeInTheDocument()
  })

  it('should display goal templates when loaded', async () => {
    const mockTemplates = [
      {
        temp_id: 1,
        temp_title: 'Technical Skills',
        temp_description: 'Improve technical capabilities',
        temp_category: 'Technical',
        temp_importance: 'High',
        temp_weightage: 30,
      },
    ]

    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: mockTemplates })

    renderGoalTemplates()

    await waitFor(() => {
      expect(screen.getByText('Technical Skills')).toBeInTheDocument()
      expect(screen.getByText('Improve technical capabilities')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('30%')).toBeInTheDocument()
    })
  })

  it('should handle template deletion', async () => {
    const mockTemplates = [
      {
        temp_id: 1,
        temp_title: 'Technical Skills',
        temp_description: 'Improve technical capabilities',
        temp_category: 'Technical',
        temp_importance: 'High',
        temp_weightage: 30,
      },
    ]

    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: mockTemplates })
    vi.mocked(api.apiFetch).mockResolvedValueOnce({ ok: true, data: {} })

    renderGoalTemplates()

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      fireEvent.click(deleteButton)
    })

    expect(api.apiFetch).toHaveBeenCalledWith('/goals/templates/1', { method: 'DELETE' })
  })

  it('should handle template editing', async () => {
    const mockTemplates = [
      {
        temp_id: 1,
        temp_title: 'Technical Skills',
        temp_description: 'Improve technical capabilities',
        temp_category: 'Technical',
        temp_importance: 'High',
        temp_weightage: 30,
      },
    ]

    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: mockTemplates })

    renderGoalTemplates()

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit/i })
      fireEvent.click(editButton)
    })

    expect(screen.getByText('Edit Template')).toBeInTheDocument()
  })

  it('should filter templates by category', async () => {
    const mockTemplates = [
      {
        temp_id: 1,
        temp_title: 'Technical Skills',
        temp_category: 'Technical',
        temp_importance: 'High',
        temp_weightage: 30,
      },
    ]

    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: mockTemplates })

    renderGoalTemplates()

    await waitFor(() => {
      const categoryFilter = screen.getByRole('combobox', { name: /category/i })
      expect(categoryFilter).toBeInTheDocument()
    })
  })

  it('should show empty state when no templates', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ ok: true, data: [] })

    renderGoalTemplates()

    await waitFor(() => {
      expect(screen.getByText('No goal templates found')).toBeInTheDocument()
    })
  })
})
