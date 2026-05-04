// @ts-nocheck
import { isSignal } from '../core/signal.js';

// Treat signals and getters as reactive values the DOM layer should subscribe to.
export function isReactiveValue(value) {
  return isSignal(value) || typeof value === 'function';
}

// Read the current value regardless of whether the input is static or reactive.
export function resolveAccessor(value) {
  return isReactiveValue(value) ? value() : value;
}

// Accept either a literal template value or a render callback.
export function resolveTemplate(template, value) {
  return typeof template === 'function' ? template(value) : template;
}
