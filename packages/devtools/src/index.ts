/**
 * Qore Devtools
 * 
 * Browser developer tools for Qore Framework.
 * Provides component tree inspection, reactive state monitoring,
 * performance profiling, and event timeline debugging.
 */

import type { App } from '@qore/core'
import { registerDevtoolsHook, unregisterDevtoolsHook, type DevtoolsHook } from './hook'

export interface DevtoolsOptions {
  /** Enable component tree inspection */
  enableComponentTree?: boolean
  
  /** Enable reactive state monitoring */
  enableStateMonitoring?: boolean
  
  /** Enable performance profiling */
  enablePerformance?: boolean
  
  /** Enable event timeline */
  enableTimeline?: boolean
  
  /** Enable hot reload support */
  enableHotReload?: boolean
  
  /** Devtools panel position */
  panelPosition?: 'bottom' | 'right' | 'window'
  
  /** Auto-connect to Chrome DevTools */
  autoConnect?: boolean
}

export interface DevtoolsInstance {
  /** Disconnect devtools */
  disconnect: () => void
  
  /** Get current state snapshot */
  getState: () => DevtoolsState
  
  /** Subscribe to state changes */
  subscribe: (callback: (state: DevtoolsState) => void) => () => void
}

export interface DevtoolsState {
  /** Component tree */
  components: ComponentNode[]
  
  /** Reactive signals */
  signals: SignalNode[]
  
  /** Computed values */
  computed: ComputedNode[]
  
  /** Effects */
  effects: EffectNode[]
  
  /** Performance metrics */
  performance: PerformanceMetrics
  
  /** Event timeline */
  events: TimelineEvent[]
}

export interface ComponentNode {
  id: string
  name: string
  props: Record<string, any>
  state: Record<string, any>
  children: string[]
  parentId: string | null
  renderTime: number
  renderCount: number
  lastRendered: number
}

export interface SignalNode {
  id: string
  name: string
  value: any
  subscribers: number
  createdAt: number
  updatedAt: number
  updateCount: number
}

export interface ComputedNode {
  id: string
  name: string
  value: any
  dependencies: string[]
  subscribers: number
  computeCount: number
  lastComputed: number
}

export interface EffectNode {
  id: string
  name: string
  dependencies: string[]
  runCount: number
  lastRun: number
  isActive: boolean
}

export interface PerformanceMetrics {
  totalRenders: number
  averageRenderTime: number
  slowestComponent: string | null
  slowestRenderTime: number
  updatesPerSecond: number
}

export interface TimelineEvent {
  id: string
  timestamp: number
  type: 'signal' | 'computed' | 'effect' | 'component' | 'event'
  action: string
  payload: any
  duration?: number
}

/**
 * Component registry for tracking
 */
const componentRegistry = new Map<string, ComponentNode>()

/**
 * Signal registry for tracking
 */
const signalRegistry = new Map<string, SignalNode>()

/**
 * Computed registry for tracking
 */
const computedRegistry = new Map<string, ComputedNode>()

/**
 * Effect registry for tracking
 */
const effectRegistry = new Map<string, EffectNode>()

/**
 * Event timeline
 */
const timeline: TimelineEvent[] = []

/**
 * Performance metrics
 */
const metrics: PerformanceMetrics = {
  totalRenders: 0,
  averageRenderTime: 0,
  slowestComponent: null,
  slowestRenderTime: 0,
  updatesPerSecond: 0,
}

/**
 * Subscribers for state changes
 */
const subscribers = new Set<(state: DevtoolsState) => void>()

/**
 * Generate unique ID
 */
let idCounter = 0
function generateId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Date.now()}`
}

/**
 * Add event to timeline
 */
function addTimelineEvent(type: TimelineEvent['type'], action: string, payload: any, duration?: number): void {
  const event: TimelineEvent = {
    id: generateId('evt'),
    timestamp: Date.now(),
    type,
    action,
    payload,
    duration,
  }
  
  timeline.push(event)
  
  // Keep only last 1000 events
  if (timeline.length > 1000) {
    timeline.shift()
  }
  
  notifySubscribers()
}

/**
 * Notify all subscribers of state changes
 */
function notifySubscribers(): void {
  const state = getState()
  subscribers.forEach(callback => callback(state))
}

/**
 * Get current devtools state
 */
function getState(): DevtoolsState {
  return {
    components: Array.from(componentRegistry.values()),
    signals: Array.from(signalRegistry.values()),
    computed: Array.from(computedRegistry.values()),
    effects: Array.from(effectRegistry.values()),
    performance: { ...metrics },
    events: [...timeline],
  }
}

/**
 * Create devtools hook implementation
 */
function createDevtoolsHook(): DevtoolsHook {
  return {
    onSignalCreate(signal) {
      const id = generateId('sig')
      signalRegistry.set(id, {
        id,
        name: signal.constructor.name || 'Signal',
        value: signal.peek?.() ?? signal.value,
        subscribers: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updateCount: 0,
      })
      
      addTimelineEvent('signal', 'create', { id, name: signal.constructor.name })
      notifySubscribers()
    },
    
    onSignalUpdate(signal, oldValue, newValue) {
      // Find signal in registry
      for (const [id, node] of signalRegistry.entries()) {
        if (node.value === oldValue || Object.is(node.value, oldValue)) {
          node.value = newValue
          node.updatedAt = Date.now()
          node.updateCount++
          
          addTimelineEvent('signal', 'update', { 
            id, 
            oldValue, 
            newValue,
          })
          notifySubscribers()
          break
        }
      }
    },
    
    onComputedCreate(computed) {
      const id = generateId('cmp')
      computedRegistry.set(id, {
        id,
        name: computed.constructor.name || 'Computed',
        value: computed.peek?.() ?? computed.value,
        dependencies: [],
        subscribers: 0,
        computeCount: 0,
        lastComputed: Date.now(),
      })
      
      addTimelineEvent('computed', 'create', { id })
      notifySubscribers()
    },
    
    onComputedUpdate(computed, oldValue, newValue) {
      for (const [id, node] of computedRegistry.entries()) {
        if (Object.is(node.value, oldValue)) {
          node.value = newValue
          node.computeCount++
          node.lastComputed = Date.now()
          
          addTimelineEvent('computed', 'update', { 
            id, 
            oldValue, 
            newValue,
          })
          notifySubscribers()
          break
        }
      }
    },
    
    onEffectCreate(effect) {
      const id = generateId('eff')
      effectRegistry.set(id, {
        id,
        name: 'Effect',
        dependencies: [],
        runCount: 0,
        lastRun: Date.now(),
        isActive: true,
      })
      
      addTimelineEvent('effect', 'create', { id })
      notifySubscribers()
    },
    
    onEffectRun(effect, deps) {
      for (const [id, node] of effectRegistry.entries()) {
        node.runCount++
        node.lastRun = Date.now()
        node.dependencies = deps
        
        addTimelineEvent('effect', 'run', { id, depsCount: deps.length })
        notifySubscribers()
        break
      }
    },
    
    onComponentCreate(component, props) {
      const id = generateId('cmp')
      componentRegistry.set(id, {
        id,
        name: component.constructor?.name || 'Component',
        props: props || {},
        state: {},
        children: [],
        parentId: null,
        renderTime: 0,
        renderCount: 0,
        lastRendered: Date.now(),
      })
      
      addTimelineEvent('component', 'create', { 
        id, 
        name: component.constructor?.name,
      })
      notifySubscribers()
    },
    
    onComponentRender(component, props, duration) {
      for (const [id, node] of componentRegistry.entries()) {
        node.renderCount++
        node.renderTime = duration
        node.lastRendered = Date.now()
        node.props = props || {}
        
        // Update metrics
        metrics.totalRenders++
        metrics.averageRenderTime = 
          (metrics.averageRenderTime * (metrics.totalRenders - 1) + duration) / 
          metrics.totalRenders
        
        if (duration > metrics.slowestRenderTime) {
          metrics.slowestRenderTime = duration
          metrics.slowestComponent = node.name
        }
        
        addTimelineEvent('component', 'render', { 
          id, 
          name: node.name,
          duration,
        }, duration)
        notifySubscribers()
        break
      }
    },
    
    onComponentUnmount(component) {
      for (const [id, node] of componentRegistry.entries()) {
        componentRegistry.delete(id)
        
        addTimelineEvent('component', 'unmount', { id, name: node.name })
        notifySubscribers()
        break
      }
    },
    
    onEvent(event, payload) {
      addTimelineEvent('event', event, payload)
      notifySubscribers()
    },
  }
}

/**
 * Enable devtools for an app
 * @param app - The Qore app instance
 * @param options - Devtools options
 * @returns Devtools instance
 */
export function enableDevtools(app: App, options: DevtoolsOptions = {}): DevtoolsInstance {
  const {
    enableComponentTree = true,
    enableStateMonitoring = true,
    enablePerformance = true,
    enableTimeline = true,
    enableHotReload = false,
    panelPosition = 'bottom',
    autoConnect = true,
  } = options
  
  // Register the devtools hook
  const hook = createDevtoolsHook()
  registerDevtoolsHook(hook)
  
  // Expose devtools globally for browser extension
  if (typeof window !== 'undefined') {
    ;(window as any).__QORE_DEVTOOLS__ = {
      getState,
      subscribe: (callback: (state: DevtoolsState) => void) => {
        subscribers.add(callback)
        return () => subscribers.delete(callback)
      },
      disconnect: () => {
        unregisterDevtoolsHook()
        subscribers.clear()
      },
    }
    
    // Auto-connect to Chrome DevTools if available
    if (autoConnect && (window as any).chrome?.devtools) {
      connectToChromeDevTools(panelPosition)
    }
  }
  
  // Setup hot reload if enabled
  if (enableHotReload && typeof window !== 'undefined') {
    setupHotReload()
  }
  
  return {
    disconnect: () => {
      unregisterDevtoolsHook()
      subscribers.clear()
      componentRegistry.clear()
      signalRegistry.clear()
      computedRegistry.clear()
      effectRegistry.clear()
      timeline.length = 0
      
      if (typeof window !== 'undefined') {
        delete (window as any).__QORE_DEVTOOLS__
      }
    },
    getState,
    subscribe: (callback) => {
      subscribers.add(callback)
      return () => subscribers.delete(callback)
    },
  }
}

/**
 * Connect to Chrome DevTools
 */
function connectToChromeDevTools(panelPosition: string): void {
  if (typeof window === 'undefined' || !(window as any).chrome?.devtools?.panels) {
    return
  }
  
  const chrome = (window as any).chrome
  
  // Create panel
  chrome.devtools.panels.create(
    'Qore',
    'icon.png',
    'panel.html',
    (panel: any) => {
      panel.onShown.addListener((panelWindow: any) => {
        // Initialize panel UI
        initializePanel(panelWindow)
      })
    }
  )
}

/**
 * Initialize devtools panel
 */
function initializePanel(panelWindow: any): void {
  // This would be implemented with actual panel UI
  // For now, just log that panel is ready
  console.log('[Qore Devtools] Panel initialized')
}

/**
 * Setup hot reload support
 */
function setupHotReload(): void {
  if (typeof window === 'undefined') return
  
  // Listen for HMR events
  if ((window as any).import.meta?.hot) {
    ;(window as any).import.meta.hot.on('qore:update', (data: any) => {
      console.log('[Qore Devtools] Hot reload:', data)
      addTimelineEvent('event', 'hot-reload', data)
    })
  }
}

/**
 * Disconnect devtools
 */
export function disableDevtools(): void {
  unregisterDevtoolsHook()
  subscribers.clear()
  componentRegistry.clear()
  signalRegistry.clear()
  computedRegistry.clear()
  effectRegistry.clear()
  timeline.length = 0
  
  if (typeof window !== 'undefined') {
    delete (window as any).__QORE_DEVTOOLS__
  }
}

export type { 
  DevtoolsOptions, 
  DevtoolsInstance, 
  DevtoolsState,
  ComponentNode,
  SignalNode,
  ComputedNode,
  EffectNode,
  PerformanceMetrics,
  TimelineEvent,
}
