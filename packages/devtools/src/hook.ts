/**
 * Qore Devtools Hook
 * 
 * This module provides hooks for the Qore core to communicate with devtools.
 * It's designed to be called from @qorejs/qore at key lifecycle points.
 */

import type { Signal, Computed, Effect } from '@qorejs/qore'
import type { Component } from '@qorejs/qore'

export interface DevtoolsHook {
  /** Called when a signal is created */
  onSignalCreate: (signal: Signal<any>) => void
  
  /** Called when a signal is updated */
  onSignalUpdate: (signal: Signal<any>, oldValue: any, newValue: any) => void
  
  /** Called when a computed is created */
  onComputedCreate: (computed: Computed<any>) => void
  
  /** Called when a computed is recalculated */
  onComputedUpdate: (computed: Computed<any>, oldValue: any, newValue: any) => void
  
  /** Called when an effect is created */
  onEffectCreate: (effect: Effect) => void
  
  /** Called when an effect runs */
  onEffectRun: (effect: Effect, deps: any[]) => void
  
  /** Called when a component is created */
  onComponentCreate: (component: Component, props: any) => void
  
  /** Called when a component renders */
  onComponentRender: (component: Component, props: any, duration: number) => void
  
  /** Called when a component is unmounted */
  onComponentUnmount: (component: Component) => void
  
  /** Called when an event is triggered */
  onEvent: (event: string, payload: any) => void
}

/**
 * Global devtools hook instance
 * Set by @qore/devtools when devtools are enabled
 */
export let devtoolsHook: DevtoolsHook | null = null

/**
 * Check if devtools are enabled
 */
export function isDevtoolsEnabled(): boolean {
  return devtoolsHook !== null
}

/**
 * Register a devtools hook
 * @param hook - The devtools hook implementation
 */
export function registerDevtoolsHook(hook: DevtoolsHook): void {
  devtoolsHook = hook
  
  // Notify devtools that they're connected
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qore:devtools:connected'))
  }
}

/**
 * Unregister the devtools hook
 */
export function unregisterDevtoolsHook(): void {
  devtoolsHook = null
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qore:devtools:disconnected'))
  }
}

/**
 * Signal lifecycle hooks
 */
export function hookSignalCreate(signal: Signal<any>): void {
  devtoolsHook?.onSignalCreate(signal)
}

export function hookSignalUpdate(signal: Signal<any>, oldValue: any, newValue: any): void {
  devtoolsHook?.onSignalUpdate(signal, oldValue, newValue)
}

export function hookComputedCreate(computed: Computed<any>): void {
  devtoolsHook?.onComputedCreate(computed)
}

export function hookComputedUpdate(computed: Computed<any>, oldValue: any, newValue: any): void {
  devtoolsHook?.onComputedUpdate(computed, oldValue, newValue)
}

export function hookEffectCreate(effect: Effect): void {
  devtoolsHook?.onEffectCreate(effect)
}

export function hookEffectRun(effect: Effect, deps: any[]): void {
  devtoolsHook?.onEffectRun(effect, deps)
}

/**
 * Component lifecycle hooks
 */
export function hookComponentCreate(component: Component, props: any): void {
  devtoolsHook?.onComponentCreate(component, props)
}

export function hookComponentRender(component: Component, props: any, duration: number): void {
  devtoolsHook?.onComponentRender(component, props, duration)
}

export function hookComponentUnmount(component: Component): void {
  devtoolsHook?.onComponentUnmount(component)
}

/**
 * Event hook
 */
export function hookEvent(event: string, payload: any): void {
  devtoolsHook?.onEvent(event, payload)
}

// Export the hook interface for type checking
export type { DevtoolsHook }
