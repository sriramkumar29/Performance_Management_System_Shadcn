import { describe, it, expect, vi, beforeEach } from 'vitest'
import { emitUnauthorized, onUnauthorized } from './auth-events'

describe('auth-events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should emit unauthorized event', () => {
    const mockCallback = vi.fn()
    onUnauthorized(mockCallback)
    
    emitUnauthorized()
    
    expect(mockCallback).toHaveBeenCalledOnce()
  })

  it('should register unauthorized event listener', () => {
    const mockCallback = vi.fn()
    
    onUnauthorized(mockCallback)
    
    // Emit the event to test the listener
    emitUnauthorized()
    
    expect(mockCallback).toHaveBeenCalledOnce()
  })

  it('should handle multiple listeners', () => {
    const mockCallback1 = vi.fn()
    const mockCallback2 = vi.fn()
    
    onUnauthorized(mockCallback1)
    onUnauthorized(mockCallback2)
    
    emitUnauthorized()
    
    expect(mockCallback1).toHaveBeenCalledOnce()
    expect(mockCallback2).toHaveBeenCalledOnce()
  })

  it('should not throw error when no listeners registered', () => {
    expect(() => {
      emitUnauthorized()
    }).not.toThrow()
  })
})
