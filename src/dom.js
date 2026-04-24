import { effect, isSignal } from './signal.js';

const ROOT_CLEANUP = Symbol('qore.dom.cleanup');

let activeScope = null;

function assertDocument() {
  if (typeof document === 'undefined') {
    throw new Error('Qore DOM APIs require a browser-like environment');
  }
}

function createScope() {
  return { cleanups: [] };
}

function withScope(scope, fn) {
  const previousScope = activeScope;
  activeScope = scope;

  try {
    return fn();
  } finally {
    activeScope = previousScope;
  }
}

function registerCleanup(cleanup) {
  if (typeof cleanup === 'function' && activeScope) {
    activeScope.cleanups.push(cleanup);
  }

  return cleanup;
}

function disposeScope(scope) {
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

function isReactiveValue(value) {
  return isSignal(value) || typeof value === 'function';
}

function resolveAccessor(value) {
  return isReactiveValue(value) ? value() : value;
}

function resolveTemplate(template, value) {
  return typeof template === 'function' ? template(value) : template;
}

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

function bindEvent(element, key, handler) {
  const eventName = key.slice(2).toLowerCase();

  if (isReactiveValue(handler)) {
    let activeHandler = null;
    const stop = effect(() => {
      const nextHandler = resolveAccessor(handler);

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

function bindProp(element, key, value) {
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

function materializeChild(buffer, child) {
  if (Array.isArray(child)) {
    for (const entry of child) {
      materializeChild(buffer, entry);
    }

    return;
  }

  if (child == null || child === false || child === true) {
    return;
  }

  if (isReactiveValue(child)) {
    buffer.push(dynamic(child));
    return;
  }

  if (child instanceof Node) {
    buffer.push(child);
    return;
  }

  if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
    buffer.push(document.createTextNode(String(child)));
    return;
  }

  throw new TypeError(
    `Unsupported Qore child: ${typeof child}. Use strings, numbers, DOM nodes, arrays, or reactive getters.`
  );
}

function materialize(value) {
  const nodes = [];
  materializeChild(nodes, value);
  return nodes;
}

function appendChild(parent, child) {
  for (const node of materialize(child)) {
    parent.appendChild(node);
  }
}

function clearRange(start, end) {
  let current = start.nextSibling;

  while (current && current !== end) {
    const next = current.nextSibling;
    current.remove();
    current = next;
  }
}

function replaceRange(start, end, nextValue) {
  const parent = end.parentNode;

  if (!parent) {
    return;
  }

  clearRange(start, end);

  for (const node of materialize(nextValue)) {
    parent.insertBefore(node, end);
  }
}

function readResponseState(responseState) {
  return {
    response: responseState,
    status: responseState.status(),
    value: responseState.value(),
    error: responseState.error(),
    chunks: responseState.chunks(),
    startedAt: responseState.startedAt(),
    finishedAt: responseState.finishedAt(),
    pending: responseState.pending(),
    streaming: responseState.streaming(),
    completed: responseState.completed(),
    failed: responseState.failed(),
    aborted: responseState.aborted(),
    chunkCount: responseState.chunkCount()
  };
}

function pickResponseTemplate(status, views) {
  switch (status) {
    case 'idle':
      return views.idle ?? views.pending ?? views.default;
    case 'pending':
      return views.pending ?? views.default;
    case 'streaming':
      return views.streaming ?? views.pending ?? views.default;
    case 'completed':
      return views.completed ?? views.default;
    case 'error':
      return views.error ?? views.default;
    case 'aborted':
      return views.aborted ?? views.default;
    default:
      return views.default;
  }
}

function resolveRoot(root) {
  if (typeof root === 'string') {
    const element = document.querySelector(root);

    if (!element) {
      throw new Error(`Qore could not find a mount target for selector: ${root}`);
    }

    return element;
  }

  return root;
}

export function fragment(...children) {
  assertDocument();

  const node = document.createDocumentFragment();

  for (const child of children) {
    appendChild(node, child);
  }

  return node;
}

export function dynamic(source, render = (value) => value) {
  assertDocument();

  const start = document.createComment('qore-dynamic-start');
  const end = document.createComment('qore-dynamic-end');
  const node = document.createDocumentFragment();

  node.append(start, end);

  let childScope = null;
  const stop = effect(() => {
    const nextValue = resolveAccessor(source);

    disposeScope(childScope);
    childScope = createScope();

    const renderedValue = withScope(childScope, () => resolveTemplate(render, nextValue));
    replaceRange(start, end, renderedValue);
  });

  registerCleanup(() => {
    stop();
    disposeScope(childScope);
  });

  return node;
}

export function show(source, render, fallback = null) {
  const truthyView = render === undefined ? (value) => value : render;
  return dynamic(source, (value) => value
    ? resolveTemplate(truthyView, value)
    : resolveTemplate(fallback, value));
}

export function list(source, render, options = {}) {
  const { fallback = null } = options;

  return dynamic(source, (value) => {
    const items = value == null
      ? []
      : Array.isArray(value)
        ? value
        : Array.from(value);

    if (items.length === 0) {
      return resolveTemplate(fallback, items);
    }

    return items.map((item, index) => render(item, index));
  });
}

export function renderResponse(responseState, views = {}) {
  return dynamic(() => readResponseState(responseState), (state) => {
    const template = pickResponseTemplate(state.status, views);

    if (template !== undefined) {
      return resolveTemplate(template, state);
    }

    if (state.status === 'error') {
      return state.error?.message ?? 'Qore response failed.';
    }

    return state.value;
  });
}

export function h(tag, props = null, ...children) {
  assertDocument();

  if (typeof tag === 'function') {
    return tag({
      ...(props ?? {}),
      children
    });
  }

  const element = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      bindProp(element, key, value);
    }
  }

  for (const child of children) {
    appendChild(element, child);
  }

  return element;
}

export function text(valueOrGetter) {
  assertDocument();

  const node = document.createTextNode('');

  if (isReactiveValue(valueOrGetter)) {
    const stop = effect(() => {
      const nextValue = resolveAccessor(valueOrGetter);
      node.textContent = nextValue == null ? '' : String(nextValue);
    });

    registerCleanup(stop);
    return node;
  }

  node.textContent = valueOrGetter == null ? '' : String(valueOrGetter);
  return node;
}

export function mount(root, view) {
  assertDocument();

  const target = resolveRoot(root);
  target[ROOT_CLEANUP]?.();

  const scope = createScope();
  const content = withScope(scope, () => typeof view === 'function' ? view() : view);

  target.replaceChildren();
  appendChild(target, content);

  const dispose = () => {
    if (target[ROOT_CLEANUP] === dispose) {
      delete target[ROOT_CLEANUP];
    }

    disposeScope(scope);
    target.replaceChildren();
    return target;
  };

  target[ROOT_CLEANUP] = dispose;
  return dispose;
}
