import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle'

const mockUseTheme = vi.fn()
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: mockUseTheme
}))

const mockThemeContext = {
  theme: 'light' as const,
  toggleTheme: vi.fn()
}

const renderThemeToggle = () => {
  return render(<ThemeToggle />)
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTheme.mockReturnValue(mockThemeContext)
  })

  it('should render theme toggle button', () => {
    renderThemeToggle()
    
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toBeInTheDocument()
  })

  it('should show sun icon for light theme', () => {
    renderThemeToggle()
    
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
  })

  it('should show moon icon for dark theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn()
    })
    
    renderThemeToggle()
    
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
  })

  it('should call toggleTheme when clicked', () => {
    renderThemeToggle()
    
    const toggleButton = screen.getByRole('button')
    fireEvent.click(toggleButton)
    
    expect(mockThemeContext.toggleTheme).toHaveBeenCalledOnce()
  })

  it('should have proper accessibility attributes', () => {
    renderThemeToggle()
    
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toHaveAttribute('aria-label', 'Toggle theme')
  })
})
