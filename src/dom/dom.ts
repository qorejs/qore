import { effect } from '../core/signal.js';
import { bindProp } from './properties.js';
import { isReactiveValue, resolveAccessor, resolveTemplate } from './reactive.js';
import { pickResponseTemplate, readResponseState } from './response-view.js';
import {
  ROOT_CLEANUP,
  assertDocument,
  createScope,
  disposeScope,
  registerCleanup,
  withScope
} from './scope.js';
import type { ResponseState } from '../core/response.js';
import type {
  MountTarget,
  MountView,
  QoreDocumentFragment,
  QoreElement,
  QoreChild,
  QoreComponent,
  QoreText,
  ReactiveValue,
  ResponseViews
} from './types.js';

type MountCleanup = () => QoreElement;
type MountedElement = Element & { [ROOT_CLEANUP]?: MountCleanup };

function isDomNode(value: unknown): value is Node {
  return typeof Node !== 'undefined' && value instanceof Node;
}

// Convert supported child types into concrete nodes that can be inserted into the DOM.
function materializeChild(buffer: Node[], child: QoreChild): void {
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

  if (isDomNode(child)) {
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

// Flatten any child payload into a linear list of nodes.
function materialize(value: QoreChild): Node[] {
  const nodes: Node[] = [];
  materializeChild(nodes, value);
  return nodes;
}

// Append normalized child content to a parent node or fragment.
function appendChild(parent: Node, child: QoreChild): void {
  for (const node of materialize(child)) {
    parent.appendChild(node);
  }
}

// Remove every node between the two markers of a dynamic region.
function clearRange(start: Comment, end: Comment): void {
  let current = start.nextSibling;

  while (current && current !== end) {
    const next = current.nextSibling;
    current.remove();
    current = next;
  }
}

// Replace a dynamic region without recreating its boundary markers.
function replaceRange(start: Comment, end: Comment, nextValue: QoreChild): void {
  const parent = end.parentNode;

  if (!parent) {
    return;
  }

  clearRange(start, end);

  for (const node of materialize(nextValue)) {
    parent.insertBefore(node, end);
  }
}

function insertBefore(parent: Node, reference: Node, value: QoreChild): void {
  for (const node of materialize(value)) {
    parent.insertBefore(node, reference);
  }
}

type KeyedListEntry<T> = {
  key: unknown;
  value: T;
  index: number;
  start: Comment;
  end: Comment;
  scope: ReturnType<typeof createScope>;
};

function destroyKeyedEntry<T>(entry: KeyedListEntry<T>): void {
  disposeScope(entry.scope);
  clearRange(entry.start, entry.end);
  entry.start.remove();
  entry.end.remove();
}

function renderKeyedEntry<T>(
  parent: Node,
  reference: Node,
  item: T,
  index: number,
  render: (item: T, index: number) => QoreChild
): KeyedListEntry<T> {
  const start = document.createComment('qore-list-item-start');
  const end = document.createComment('qore-list-item-end');
  const scope = createScope();

  parent.insertBefore(start, reference);

  const content = withScope(scope, () => render(item, index));
  insertBefore(parent, reference, content);
  parent.insertBefore(end, reference);

  return { key: null, value: item, index, start, end, scope };
}

// Allow mount targets to be passed as selectors or direct nodes.
function resolveRoot(root: MountTarget): Element {
  if (typeof root === 'string') {
    const element = document.querySelector(root);

    if (!element) {
      throw new Error(`Qore could not find a mount target for selector: ${root}`);
    }

    return element;
  }

  return root;
}

// Build a fragment from a variadic list of children.
export function fragment(...children: QoreChild[]): QoreDocumentFragment {
  assertDocument('fragment()');

  const node = document.createDocumentFragment();

  for (const child of children) {
    appendChild(node, child);
  }

  return node;
}

// Render a live region between comment markers and refresh it when the source changes.
export function dynamic<T>(
  source: ReactiveValue<T>,
  render: (value: T) => QoreChild = (value) => value as QoreChild
): QoreDocumentFragment {
  assertDocument('dynamic()');

  const start = document.createComment('qore-dynamic-start');
  const end = document.createComment('qore-dynamic-end');
  const node = document.createDocumentFragment();

  node.append(start, end);

  let childScope: ReturnType<typeof createScope> | null = null;
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

// Conditionally render one branch or a fallback from a truthy source.
export function show<T>(
  source: ReactiveValue<T>,
  render?: (value: T) => QoreChild,
  fallback: QoreChild | ((value: T) => QoreChild) = null
): QoreDocumentFragment {
  const truthyView: (value: T) => QoreChild = render === undefined
    ? (value: T) => value as QoreChild
    : render;
  return dynamic(source, (value) => value
    ? resolveTemplate(truthyView, value)
    : resolveTemplate(fallback, value));
}

// Render a list reactively, or a fallback when the collection is empty.
export function list<T>(
  source: ReactiveValue<Iterable<T> | ArrayLike<T> | null | undefined>,
  render: (item: T, index: number) => QoreChild,
  options: {
    fallback?: QoreChild | ((items: T[]) => QoreChild);
    key?: (item: T, index: number) => unknown;
  } = {}
): QoreDocumentFragment {
  const { fallback = null, key } = options;

  if (!key) {
    return dynamic(source, (value) => {
      const items: T[] = value == null
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

  assertDocument('list()');

  const start = document.createComment('qore-list-start');
  const end = document.createComment('qore-list-end');
  const node = document.createDocumentFragment();
  node.append(start, end);

  let entries: Array<KeyedListEntry<T>> = [];
  let fallbackScope: ReturnType<typeof createScope> | null = null;
  const stop = effect(() => {
    const value = resolveAccessor(source);
    const items: T[] = value == null
      ? []
      : Array.isArray(value)
        ? value
        : Array.from(value);
    const parent = end.parentNode;

    if (!parent) {
      return;
    }

    if (items.length === 0) {
      for (const entry of entries) {
        destroyKeyedEntry(entry);
      }

      entries = [];
      disposeScope(fallbackScope);
      fallbackScope = createScope();
      const renderedFallback = withScope(fallbackScope, () => resolveTemplate(fallback, items));
      replaceRange(start, end, renderedFallback);
      return;
    }

    disposeScope(fallbackScope);
    fallbackScope = null;

    const nextKeys = items.map((item, index) => key(item, index));
    const canAppend = entries.length <= items.length
      && entries.every((entry, index) => Object.is(entry.key, nextKeys[index]));

    if (!canAppend) {
      for (const entry of entries) {
        destroyKeyedEntry(entry);
      }

      clearRange(start, end);
      entries = [];
    }

    if (!canAppend) {
      for (let index = 0; index < items.length; index += 1) {
        const entry = renderKeyedEntry(parent, end, items[index]!, index, render);
        entry.key = nextKeys[index];
        entries.push(entry);
      }

      return;
    }

    for (let index = entries.length; index < items.length; index += 1) {
      const entry = renderKeyedEntry(parent, end, items[index]!, index, render);
      entry.key = nextKeys[index];
      entries.push(entry);
    }
  });

  registerCleanup(() => {
    stop();
    disposeScope(fallbackScope);

    for (const entry of entries) {
      destroyKeyedEntry(entry);
    }

    entries = [];
  });

  return node;
}

// Render response state through status-aware template overrides.
export function renderResponse<TChunk, TValue>(
  responseState: ResponseState<TChunk, TValue>,
  views: ResponseViews<TChunk, TValue> = {}
): QoreDocumentFragment {
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

// Create a DOM element or invoke a component function with normalized children.
export function h(tag: string, props?: Record<string, unknown> | null, ...children: QoreChild[]): QoreElement;
export function h<TProps extends Record<string, unknown>>(
  tag: QoreComponent<TProps>,
  props?: TProps | null,
  ...children: QoreChild[]
): QoreChild;
export function h<TProps extends Record<string, unknown>>(
  tag: string | QoreComponent<TProps>,
  props: TProps | Record<string, unknown> | null = null,
  ...children: QoreChild[]
): QoreElement | QoreChild {
  assertDocument('h()');

  if (typeof tag === 'function') {
    return tag({
      ...((props ?? {}) as TProps),
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

// Create a text node and keep it in sync with a reactive getter when necessary.
export function text(valueOrGetter: ReactiveValue<unknown>): QoreText {
  assertDocument('text()');

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

// Mount a view into a root element and return a disposer for its reactive scope.
export function mount(root: MountTarget, view: MountView): () => QoreElement {
  assertDocument('mount()');

  const target = resolveRoot(root) as MountedElement;
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
