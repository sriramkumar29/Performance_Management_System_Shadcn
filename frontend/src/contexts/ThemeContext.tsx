import React, { createContext, useContext, useState, useEffect } from 'react'

interface ThemeContextType {
  isDarkMode: boolean
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Force light mode globally
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleTheme = () => {
    // No-op: app is locked to light theme
    setIsDarkMode(false)
    localStorage.setItem('theme', 'light')
  }

  // Apply theme class to document
  useEffect(() => {
    // Always enforce light theme
    localStorage.setItem('theme', 'light')
    document.documentElement.classList.remove('dark')
    setIsDarkMode(false)
  }, [])

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme: 'light', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
