import type { Cleanup } from '../core/signal-types.js';

// Store mount cleanup directly on the root node so remounts can tear down old scopes.
export const ROOT_CLEANUP = Symbol('qore.dom.cleanup');

export interface Scope {
  cleanups: Cleanup[];
}

let activeScope: Scope | null = null;

// Guard DOM helpers so they only run in browser-like environments.
export function assertDocument(): void {
  if (typeof document === 'undefined') {
    throw new Error('Qore DOM APIs require a browser-like environment');
  }
}

// A scope collects effect disposers created while rendering a subtree.
export function createScope(): Scope {
  return { cleanups: [] };
}

// Temporarily switch the active scope while a subtree is being materialized.
export function withScope<T>(scope: Scope, fn: () => T): T {
  const previousScope = activeScope;
  activeScope = scope;

  try {
    return fn();
  } finally {
    activeScope = previousScope;
  }
}

// Register a cleanup callback on the currently active scope, if one exists.
export function registerCleanup<T extends Cleanup | null | undefined>(cleanup: T): T {
  if (typeof cleanup === 'function' && activeScope) {
    activeScope.cleanups.push(cleanup);
  }

  return cleanup;
}

// Dispose nested resources in reverse order so teardown mirrors setup.
export function disposeScope(scope: Scope | null | undefined): void {
  if (!scope) {
    return;
  }

  for (let index = scope.cleanups.length - 1; index >= 0; index -= 1) {
    try {
      scope.cleanups[index]();
    } catch {
      // Ignore cleanup errors during teardown so the rest of the scope can unwind.
    }
  }

  scope.cleanups.length = 0;
}
