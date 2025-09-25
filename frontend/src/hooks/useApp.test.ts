import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useApp } from './useApp'

describe('useApp', () => {
  it('should return message methods', () => {
    const { result } = renderHook(() => useApp())
    
    expect(result.current).toHaveProperty('message')
    expect(typeof result.current.message.success).toBe('function')
    expect(typeof result.current.message.error).toBe('function')
    expect(typeof result.current.message.info).toBe('function')
    expect(typeof result.current.message.warning).toBe('function')
  })

  it('should log success messages correctly', () => {
    const consoleSpy = vi.spyOn(console, 'log')
    const { result } = renderHook(() => useApp())
    
    result.current.message.success('Test success')
    expect(consoleSpy).toHaveBeenCalledWith('Success:', 'Test success')
    
    consoleSpy.mockRestore()
  })

  it('should log error messages correctly', () => {
    const consoleSpy = vi.spyOn(console, 'error')
    const { result } = renderHook(() => useApp())
    
    result.current.message.error('Test error')
    expect(consoleSpy).toHaveBeenCalledWith('Error:', 'Test error')
    
    consoleSpy.mockRestore()
  })

  it('should log info messages correctly', () => {
    const consoleSpy = vi.spyOn(console, 'info')
    const { result } = renderHook(() => useApp())
    
    result.current.message.info('Test info')
    expect(consoleSpy).toHaveBeenCalledWith('Info:', 'Test info')
    
    consoleSpy.mockRestore()
  })

  it('should log warning messages correctly', () => {
    const consoleSpy = vi.spyOn(console, 'warn')
    const { result } = renderHook(() => useApp())
    
    result.current.message.warning('Test warning')
    expect(consoleSpy).toHaveBeenCalledWith('Warning:', 'Test warning')
    
    consoleSpy.mockRestore()
  })
})
