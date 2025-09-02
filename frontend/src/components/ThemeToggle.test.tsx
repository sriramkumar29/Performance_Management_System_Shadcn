import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle'

// Use hoisted mock to avoid ReferenceError during module mocking
const { mockUseTheme } = vi.hoisted(() => {
  return { mockUseTheme: vi.fn() }
})

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

  it('should have correct aria-label for light theme', () => {
    renderThemeToggle()
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toHaveAttribute('aria-label', 'Switch to dark mode')
    expect(toggleButton).toHaveAttribute('title', 'Switch to dark mode')
  })

  it('should have correct aria-label for dark theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn()
    })
    
    renderThemeToggle()
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toHaveAttribute('aria-label', 'Switch to light mode')
    expect(toggleButton).toHaveAttribute('title', 'Switch to light mode')
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
    expect(toggleButton).toHaveAttribute('aria-label', 'Switch to dark mode')
    expect(toggleButton).toHaveAttribute('title', 'Switch to dark mode')
  })
})
