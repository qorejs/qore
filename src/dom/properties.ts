import { effect, isSignal } from '../core/signal.js';
import { isReactiveValue, resolveAccessor } from './reactive.js';
import { registerCleanup } from './scope.js';

type ClassValue = string | number | bigint | boolean | null | undefined | ClassValue[] | Record<string, unknown>;
type StyleValue = string | null | undefined | false | Record<string, unknown>;
type DomPropertyTarget = HTMLElement;
type EventHandler = ((event: Event) => void) | null;

// Normalize class payloads so callers can pass strings, arrays, or object maps.
function normalizeClassName(value: ClassValue | unknown): string {
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
function setStyleValue(element: DomPropertyTarget, value: StyleValue | unknown): void {
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

  const styleRecord = element.style as CSSStyleDeclaration & Record<string, string>;

  for (const [property, propertyValue] of Object.entries(value)) {
    styleRecord[property] = propertyValue == null || propertyValue === false
      ? ''
      : String(propertyValue);
  }
}

// Centralize DOM property and attribute writes behind one compatibility layer.
function setDomProperty(element: DomPropertyTarget, key: string, value: unknown): void {
  const attributeName = key === 'className' ? 'class' : key;
  const domRecord = element as unknown as Record<string, unknown>;

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
        if (typeof domRecord[key] === 'boolean') {
          domRecord[key] = false;
        } else if (key === 'value') {
          domRecord[key] = '';
        } else {
          domRecord[key] = '';
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
        domRecord[key] = true;
      } catch {
        // Fall through to attribute mode.
      }
    }

    element.setAttribute(attributeName, '');
    return;
  }

  if (key in element && key !== 'list' && key !== 'form') {
    try {
      domRecord[key] = value;
      return;
    } catch {
      // Fall back to setAttribute for readonly DOM properties.
    }
  }

  element.setAttribute(attributeName, String(value));
}

// Bind events and only treat signal-like values as reactive handler containers.
function bindEvent(element: DomPropertyTarget, key: string, handler: unknown): void {
  const eventName = key.slice(2).toLowerCase();

  if (isSignal(handler)) {
    let activeHandler: EventHandler = null;
    const stop = effect(() => {
      const nextHandler = handler();

      if (activeHandler) {
        element.removeEventListener(eventName, activeHandler as EventListener);
      }

      activeHandler = typeof nextHandler === 'function' ? nextHandler as (event: Event) => void : null;

      if (activeHandler) {
        element.addEventListener(eventName, activeHandler as EventListener);
      }
    });

    registerCleanup(() => {
      stop();

      if (activeHandler) {
        element.removeEventListener(eventName, activeHandler as EventListener);
      }
    });

    return;
  }

  if (typeof handler === 'function') {
    const listener = handler as EventListener;
    element.addEventListener(eventName, listener);
    registerCleanup(() => element.removeEventListener(eventName, listener));
  }
}

// Bind a prop key, upgrading reactive values into tracked effects when needed.
export function bindProp(element: DomPropertyTarget, key: string, value: unknown): void {
  if (key === 'ref') {
    if (typeof value === 'function') {
      (value as (node: DomPropertyTarget) => void)(element);
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
