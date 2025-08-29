import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PeriodFilter, { type Period } from './PeriodFilter'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

dayjs.extend(quarterOfYear)

const mockOnPeriodChange = vi.fn()

const defaultProps = {
  onChange: mockOnPeriodChange,
  defaultPreset: 'All' as const,
}

describe('PeriodFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render period filter dropdown with default value', () => {
    render(<PeriodFilter {...defaultProps} />)
    
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('should show all period options when opened', async () => {
    render(<PeriodFilter {...defaultProps} />)
    
    const dropdown = screen.getByRole('combobox')
    await userEvent.click(dropdown)
    
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(6) // All presets
    expect(screen.getByText('This Year')).toBeInTheDocument()
    expect(screen.getByText('Last Year')).toBeInTheDocument()
    expect(screen.getByText('This Quarter')).toBeInTheDocument()
    expect(screen.getByText('Last Quarter')).toBeInTheDocument()
    expect(screen.getByText('Custom Range')).toBeInTheDocument()
  })

  it('should call onChange with correct period when preset is selected', async () => {
    render(<PeriodFilter {...defaultProps} />)
    
    const dropdown = screen.getByRole('combobox')
    await userEvent.click(dropdown)
    
    const thisYearOption = screen.getByText('This Year')
    await userEvent.click(thisYearOption)
    
    expect(mockOnPeriodChange).toHaveBeenCalledWith({
      label: 'This Year',
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    })
  })

  it('should handle custom date range selection', async () => {
    render(<PeriodFilter {...defaultProps} />)
    
    // Select Custom Range
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Custom Range'))

    // Should show date inputs
    const startDateInput = screen.getByLabelText('Start Date')
    const endDateInput = screen.getByLabelText('End Date')
    
    // Set custom dates
    await userEvent.clear(startDateInput)
    await userEvent.type(startDateInput, '2024-01-15')
    await userEvent.clear(endDateInput)
    await userEvent.type(endDateInput, '2024-01-31')
    
    // Should call onChange with custom range
    expect(mockOnPeriodChange).toHaveBeenCalledWith({
      label: 'Custom Range',
      startDate: '2024-01-15',
      endDate: '2024-01-31'
    })
  })

  it('should handle all period presets correctly', async () => {
    const testCases = [
      { preset: 'This Year', start: '2024-01-01', end: '2024-12-31' },
      { preset: 'Last Year', start: '2023-01-01', end: '2023-12-31' },
      { preset: 'This Quarter', start: '2024-01-01', end: '2024-03-31' },
      { preset: 'Last Quarter', start: '2023-10-01', end: '2023-12-31' },
    ]

    for (const { preset, start, end } of testCases) {
      mockOnPeriodChange.mockClear()
      
      const { unmount } = render(<PeriodFilter {...defaultProps} />)
      
      await userEvent.click(screen.getByRole('combobox'))
      await userEvent.click(screen.getByText(preset))
      
      expect(mockOnPeriodChange).toHaveBeenCalledWith({
        label: preset,
        startDate: start,
        endDate: end
      })
      
      // Cleanup
      unmount()
    }
  })

  it('should handle controlled value prop', () => {
    const customPeriod: Period = {
      label: 'Custom Range',
      startDate: '2024-02-01',
      endDate: '2024-02-29'
    }
    
    render(<PeriodFilter {...defaultProps} value={customPeriod} />)
    
    expect(screen.getByText('Custom Range')).toBeInTheDocument()
  })

  it('should handle invalid date ranges', async () => {
    render(<PeriodFilter {...defaultProps} />)
    
    // Select Custom Range
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Custom Range'))

    // Set invalid range (end before start)
    const startDateInput = screen.getByLabelText('Start Date')
    const endDateInput = screen.getByLabelText('End Date')
    
    await userEvent.clear(startDateInput)
    await userEvent.type(startDateInput, '2024-03-01')
    await userEvent.clear(endDateInput)
    await userEvent.type(endDateInput, '2024-02-01')
    
    // Should still call onChange but with the dates as provided
    expect(mockOnPeriodChange).toHaveBeenCalledWith({
      label: 'Custom Range',
      startDate: '2024-03-01',
      endDate: '2024-02-01'
    })
  })
})
