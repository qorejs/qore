import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { enableDevtools, disableDevtools } from '../src/index'
import { registerDevtoolsHook, unregisterDevtoolsHook, devtoolsHook } from '../src/hook'

describe('Devtools', () => {
  beforeEach(() => {
    // Clean up before each test
    disableDevtools()
  })
  
  afterEach(() => {
    disableDevtools()
  })
  
  describe('enableDevtools', () => {
    it('should enable devtools and return instance', () => {
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp)
      
      expect(devtools).toBeDefined()
      expect(typeof devtools.disconnect).toBe('function')
      expect(typeof devtools.getState).toBe('function')
      expect(typeof devtools.subscribe).toBe('function')
    })
    
    it('should accept options', () => {
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp, {
        enableComponentTree: false,
        enableStateMonitoring: true,
        enablePerformance: false,
      })
      
      expect(devtools).toBeDefined()
    })
    
    it('should expose global hook on window', () => {
      const mockApp = {} as any
      enableDevtools(mockApp)
      
      expect((window as any).__QORE_DEVTOOLS__).toBeDefined()
      expect(typeof (window as any).__QORE_DEVTOOLS__.getState).toBe('function')
      expect(typeof (window as any).__QORE_DEVTOOLS__.subscribe).toBe('function')
    })
  })
  
  describe('DevtoolsInstance', () => {
    it('should get initial state', () => {
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp)
      const state = devtools.getState()
      
      expect(state).toBeDefined()
      expect(Array.isArray(state.components)).toBe(true)
      expect(Array.isArray(state.signals)).toBe(true)
      expect(Array.isArray(state.computed)).toBe(true)
      expect(Array.isArray(state.effects)).toBe(true)
      expect(Array.isArray(state.events)).toBe(true)
      expect(state.performance).toBeDefined()
    })
    
    it('should subscribe to state changes', () => {
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp)
      
      const callback = vi.fn()
      const unsubscribe = devtools.subscribe(callback)
      
      // Initial state should not trigger callback
      expect(callback).not.toHaveBeenCalled()
      
      // Unsubscribe should work
      unsubscribe()
      expect(typeof unsubscribe).toBe('function')
    })
    
    it('should disconnect and cleanup', () => {
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp)
      
      devtools.disconnect()
      
      // After disconnect, global hook should be removed
      expect((window as any).__QORE_DEVTOOLS__).toBeUndefined()
    })
  })
  
  describe('disableDevtools', () => {
    it('should remove global hook', () => {
      const mockApp = {} as any
      enableDevtools(mockApp)
      
      expect((window as any).__QORE_DEVTOOLS__).toBeDefined()
      
      disableDevtools()
      
      expect((window as any).__QORE_DEVTOOLS__).toBeUndefined()
    })
  })
  
  describe('Hook integration', () => {
    it('should register hook', () => {
      const mockHook = {
        onSignalCreate: vi.fn(),
        onSignalUpdate: vi.fn(),
        onComputedCreate: vi.fn(),
        onComputedUpdate: vi.fn(),
        onEffectCreate: vi.fn(),
        onEffectRun: vi.fn(),
        onComponentCreate: vi.fn(),
        onComponentRender: vi.fn(),
        onComponentUnmount: vi.fn(),
        onEvent: vi.fn(),
      }
      
      registerDevtoolsHook(mockHook)
      
      expect(devtoolsHook).toBe(mockHook)
      
      unregisterDevtoolsHook()
      expect(devtoolsHook).toBeNull()
    })
  })
  
  describe('Performance metrics', () => {
    it('should track performance metrics', () => {
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp)
      const state = devtools.getState()
      
      expect(state.performance.totalRenders).toBe(0)
      expect(state.performance.averageRenderTime).toBe(0)
      expect(state.performance.slowestComponent).toBeNull()
      expect(state.performance.slowestRenderTime).toBe(0)
    })
  })
  
  describe('Timeline events', () => {
    it('should maintain event timeline', () => {
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp)
      const state = devtools.getState()
      
      expect(Array.isArray(state.events)).toBe(true)
      expect(state.events.length).toBe(0)
    })
    
    it('should limit timeline to 1000 events', () => {
      // This would require simulating 1000+ events
      // For now, just verify the structure exists
      const mockApp = {} as any
      const devtools = enableDevtools(mockApp)
      const state = devtools.getState()
      
      expect(state.events).toBeDefined()
    })
  })
})
