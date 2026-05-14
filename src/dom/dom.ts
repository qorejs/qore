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
  GlobalDocumentFragment,
  GlobalElement,
  GlobalText,
  MountTarget,
  MountView,
  QoreChild,
  QoreComponent,
  ReactiveValue,
  ResponseViews
} from './types.js';

type MountCleanup = () => GlobalElement;
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
export function fragment(...children: QoreChild[]): GlobalDocumentFragment {
  assertDocument();

  const node = document.createDocumentFragment();

  for (const child of children) {
    appendChild(node, child);
  }

  return node as GlobalDocumentFragment;
}

// Render a live region between comment markers and refresh it when the source changes.
export function dynamic<T>(
  source: ReactiveValue<T>,
  render: (value: T) => QoreChild = (value) => value as QoreChild
): GlobalDocumentFragment {
  assertDocument();

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

  return node as GlobalDocumentFragment;
}

// Conditionally render one branch or a fallback from a truthy source.
export function show<T>(
  source: ReactiveValue<T>,
  render?: (value: T) => QoreChild,
  fallback: QoreChild | ((value: T) => QoreChild) = null
): GlobalDocumentFragment {
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
  options: { fallback?: QoreChild | ((items: T[]) => QoreChild) } = {}
): GlobalDocumentFragment {
  const { fallback = null } = options;

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

// Render response state through status-aware template overrides.
export function renderResponse<TChunk, TValue>(
  responseState: ResponseState<TChunk, TValue>,
  views: ResponseViews<TChunk, TValue> = {}
): GlobalDocumentFragment {
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
export function h(tag: string, props?: Record<string, unknown> | null, ...children: QoreChild[]): GlobalElement;
export function h<TProps extends Record<string, unknown>>(
  tag: QoreComponent<TProps>,
  props?: TProps | null,
  ...children: QoreChild[]
): QoreChild;
export function h<TProps extends Record<string, unknown>>(
  tag: string | QoreComponent<TProps>,
  props: TProps | Record<string, unknown> | null = null,
  ...children: QoreChild[]
): GlobalElement | QoreChild {
  assertDocument();

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

  return element as GlobalElement;
}

// Create a text node and keep it in sync with a reactive getter when necessary.
export function text(valueOrGetter: ReactiveValue<unknown>): GlobalText {
  assertDocument();

  const node = document.createTextNode('');

  if (isReactiveValue(valueOrGetter)) {
    const stop = effect(() => {
      const nextValue = resolveAccessor(valueOrGetter);
      node.textContent = nextValue == null ? '' : String(nextValue);
    });

    registerCleanup(stop);
    return node as GlobalText;
  }

  node.textContent = valueOrGetter == null ? '' : String(valueOrGetter);
  return node as GlobalText;
}

// Mount a view into a root element and return a disposer for its reactive scope.
export function mount(root: MountTarget, view: MountView): () => GlobalElement {
  assertDocument();

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
    return target as GlobalElement;
  };

  target[ROOT_CLEANUP] = dispose;
  return dispose;
}
