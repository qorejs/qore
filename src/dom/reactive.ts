import { isSignal } from '../core/signal.js';
import type { ReactiveValue, QoreTemplate } from './types.js';

// Treat signals and getters as reactive values the DOM layer should subscribe to.
export function isReactiveValue<T>(value: ReactiveValue<T> | unknown): value is ReactiveValue<T> {
  return isSignal(value) || typeof value === 'function';
}

// Read the current value regardless of whether the input is static or reactive.
export function resolveAccessor<T>(value: ReactiveValue<T>): T;
export function resolveAccessor<T>(value: T): T;
export function resolveAccessor<T>(value: ReactiveValue<T> | T): T {
  if (isSignal(value) || typeof value === 'function') {
    return (value as () => T)();
  }

  return value;
}

// Accept either a literal template value or a render callback.
export function resolveTemplate<T>(template: QoreTemplate<T>, value: T): QoreTemplate<T>;
export function resolveTemplate<T>(template: QoreTemplate<T> | undefined, value: T): QoreTemplate<T> | undefined;
export function resolveTemplate<T>(template: QoreTemplate<T> | undefined, value: T): QoreTemplate<T> | undefined {
  return typeof template === 'function' ? template(value) : template;
}
