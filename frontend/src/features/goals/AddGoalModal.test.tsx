import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddGoalModal from './AddGoalModal'
import * as api from '../../utils/api'

// Mock the API module
vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn()
}))

const mockOnClose = vi.fn()
const mockOnGoalAdded = vi.fn()

const mockCategories = [
  { id: 1, name: 'Category 1' },
  { id: 2, name: 'Category 2' },
]

const defaultProps = {
  open: true,
  onClose: mockOnClose,
  onGoalAdded: mockOnGoalAdded,
  appraisalId: 1
}

// Type assertion for the mocked apiFetch
const mockApiFetch = vi.mocked(api.apiFetch)

describe('AddGoalModal', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Set up the default mock implementation
    mockApiFetch.mockImplementation((url: string) => {
      if (url === '/api/goals/categories') {
        return Promise.resolve({
          ok: true,
          data: [...mockCategories] // Return a new array to avoid reference issues
        }) as any
      }
      return Promise.resolve({ ok: false, data: null }) as any
    })
  })


  it('should render modal when open', async () => {
    render(<AddGoalModal {...defaultProps} />)
    
    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Add New Goal')).toBeInTheDocument()
    })
  })

  it('should not render when closed', async () => {
    const { container } = render(<AddGoalModal {...defaultProps} open={false} />)
    
    // The modal should not be in the document at all when closed
    expect(container.firstChild).toBeNull()
  })

  it('should render goal form fields', async () => {
    render(<AddGoalModal {...defaultProps} />)
    
    // Wait for categories to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Now check for form fields
    expect(screen.getByLabelText(/goal title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/performance factor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/importance/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weightage/i)).toBeInTheDocument()
  })

  it('should handle form submission', async () => {
    // Mock the form submission response
    const mockResponse = {
      ok: true,
      data: { 
        id: 1,
        goal_id: 123,
        goal: {
          goal_id: 123,
          goal_title: 'New Goal',
          goal_description: '',
          goal_performance_factor: '',
          goal_importance: '',
          goal_weightage: 25,
          category_id: 1,
          category: { id: 1, name: 'Category 1' }
        }
      }
    }
    
    // Mock the API call for form submission
    mockApiFetch.mockImplementationOnce(async (url: string) => {
      if (url.includes('/api/appraisals/1/goals')) {
        return Promise.resolve(mockResponse) as any
      }
      return Promise.resolve({ ok: false, data: null }) as any
    })
    
    render(<AddGoalModal {...defaultProps} />)
    
    // Wait for categories to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Fill in required fields
    const titleInput = screen.getByLabelText(/goal title/i) as HTMLInputElement
    fireEvent.change(titleInput, {
      target: { value: 'New Goal' }
    })
    
    const weightageInput = screen.getByLabelText(/weightage/i) as HTMLInputElement
    fireEvent.change(weightageInput, {
      target: { value: '25' }
    })
    
    // Select a category from the dropdown
    const categorySelect = screen.getByLabelText(/category/i)
    fireEvent.mouseDown(categorySelect)
    
    const categoryOption = await screen.findByText('Category 1')
    fireEvent.click(categoryOption)
    
    // Submit the form
    const submitButton = screen.getByText('Add Goal')
    fireEvent.click(submitButton)
    
    // Verify the API was called with the correct data
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/appraisals/1/goals'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            goal_title: 'New Goal',
            goal_description: '',
            goal_performance_factor: '',
            goal_importance: '',
            goal_weightage: 25,
            category_id: 1
          })
        })
      )
      expect(mockOnGoalAdded).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should validate required fields', async () => {
    render(<AddGoalModal {...defaultProps} />)
    
    // Wait for categories to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Try to submit without filling required fields
    const submitButton = screen.getByText('Add Goal')
    fireEvent.click(submitButton)
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/weightage is required/i)).toBeInTheDocument()
      expect(screen.getByText(/category is required/i)).toBeInTheDocument()
    })
  })

  it('should validate weightage range', async () => {
    render(<AddGoalModal {...defaultProps} />)
    
    // Wait for categories to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Fill in required fields first
    fireEvent.change(screen.getByLabelText(/goal title/i), {
      target: { value: 'Test Goal' }
    })
    
    // Test invalid weightage (above max)
    fireEvent.change(screen.getByLabelText(/weightage/i), {
      target: { value: '150' }
    })
    
    // Select a category
    fireEvent.mouseDown(screen.getByLabelText(/category/i))
    const categoryOption = await screen.findByText('Category 1')
    fireEvent.click(categoryOption)
    
    const submitButton = screen.getByText('Add Goal')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/weightage must be between 1 and 100/i)).toBeInTheDocument()
    })
    
    // Test invalid weightage (below min)
    fireEvent.change(screen.getByLabelText(/weightage/i), {
      target: { value: '0' }
    })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/weightage must be between 1 and 100/i)).toBeInTheDocument()
    })
    
    // Test valid weightage
    fireEvent.change(screen.getByLabelText(/weightage/i), {
      target: { value: '50' }
    })
    
    // Mock the form submission
    mockApiFetch.mockImplementationOnce(async (url: string) => {
      if (url.includes('/api/appraisals/1/goals')) {
        return Promise.resolve({ 
          ok: true, 
          data: { 
            id: 1, 
            goal_id: 123,
            goal: {
              goal_id: 123,
              goal_title: 'Test Goal',
              goal_weightage: 50,
              category_id: 1,
              category: { id: 1, name: 'Category 1' }
            }
          } 
        }) as any
      }
      return Promise.resolve({ ok: false, data: null }) as any
    })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnGoalAdded).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should close modal when cancel is clicked', async () => {
    render(<AddGoalModal {...defaultProps} />)
    
    // Wait for categories to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })
})
