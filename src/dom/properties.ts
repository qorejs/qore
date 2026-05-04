// @ts-nocheck
import { effect, isSignal } from '../core/signal.js';
import { isReactiveValue, resolveAccessor } from './reactive.js';
import { registerCleanup } from './scope.js';

// Normalize class payloads so callers can pass strings, arrays, or object maps.
function normalizeClassName(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeClassName(entry))
      .filter(Boolean)
      .join(' ');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, active]) => Boolean(active))
      .map(([className]) => className)
      .join(' ');
  }

  if (value == null || value === false) {
    return '';
  }

  return String(value);
}

// Apply styles from either a raw string or a property map.
function setStyleValue(element, value) {
  element.style.cssText = '';

  if (typeof value === 'string') {
    element.style.cssText = value;
    return;
  }

  if (!value || typeof value !== 'object') {
    if (value == null || value === false) {
      element.removeAttribute('style');
    }

    return;
  }

  for (const [property, propertyValue] of Object.entries(value)) {
    element.style[property] = propertyValue == null || propertyValue === false
      ? ''
      : String(propertyValue);
  }
}

// Centralize DOM property and attribute writes behind one compatibility layer.
function setDomProperty(element, key, value) {
  const attributeName = key === 'className' ? 'class' : key;

  if (key === 'className' || key === 'class') {
    element.className = normalizeClassName(value);
    return;
  }

  if (key === 'style') {
    setStyleValue(element, value);
    return;
  }

  if (value == null || value === false) {
    if (key in element && key !== 'list' && key !== 'form') {
      try {
        if (typeof element[key] === 'boolean') {
          element[key] = false;
        } else if (key === 'value') {
          element[key] = '';
        } else {
          element[key] = '';
        }
      } catch {
        // Ignore readonly DOM properties and fall back to attribute cleanup.
      }
    }

    element.removeAttribute(attributeName);
    return;
  }

  if (value === true) {
    if (key in element && key !== 'list' && key !== 'form') {
      try {
        element[key] = true;
      } catch {
        // Fall through to attribute mode.
      }
    }

    element.setAttribute(attributeName, '');
    return;
  }

  if (key in element && key !== 'list' && key !== 'form') {
    try {
      element[key] = value;
      return;
    } catch {
      // Fall back to setAttribute for readonly DOM properties.
    }
  }

  element.setAttribute(attributeName, String(value));
}

// Bind events and only treat signal-like values as reactive handler containers.
function bindEvent(element, key, handler) {
  const eventName = key.slice(2).toLowerCase();

  if (isSignal(handler)) {
    let activeHandler = null;
    const stop = effect(() => {
      const nextHandler = handler();

      if (activeHandler) {
        element.removeEventListener(eventName, activeHandler);
      }

      activeHandler = typeof nextHandler === 'function' ? nextHandler : null;

      if (activeHandler) {
        element.addEventListener(eventName, activeHandler);
      }
    });

    registerCleanup(() => {
      stop();

      if (activeHandler) {
        element.removeEventListener(eventName, activeHandler);
      }
    });

    return;
  }

  if (typeof handler === 'function') {
    element.addEventListener(eventName, handler);
    registerCleanup(() => element.removeEventListener(eventName, handler));
  }
}

// Bind a prop key, upgrading reactive values into tracked effects when needed.
export function bindProp(element, key, value) {
  if (key === 'ref') {
    if (typeof value === 'function') {
      value(element);
    }

    return;
  }

  if (key.startsWith('on')) {
    bindEvent(element, key, value);
    return;
  }

  if (isReactiveValue(value)) {
    const stop = effect(() => {
      setDomProperty(element, key, resolveAccessor(value));
    });

    registerCleanup(stop);
    return;
  }

  setDomProperty(element, key, value);
}
