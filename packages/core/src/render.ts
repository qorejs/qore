/**
 * Qore Renderer - 细粒度 DOM 更新
 * 无虚拟 DOM，无 Diff - 直接信号绑定
 */

import { effect } from './signal';

export type VNode = string | number | Node | Component | VNode[];
export type Component = () => VNode;

/**
 * Portal - Render children to a different DOM node
 */
export function Portal({ children, target }: { children: VNode; target: HTMLElement | string }): null {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) {
    console.warn('Portal target not found:', String(target));
    return null;
  }
  
  const renderToPortal = () => {
    container.innerHTML = '';
    const vnode = typeof children === 'function' ? children() : children;
    
    if (Array.isArray(vnode)) {
      vnode.forEach(node => {
        if (node instanceof Node) container.appendChild(node);
        else if (typeof node === 'string' || typeof node === 'number') {
          container.appendChild(document.createTextNode(String(node)));
        }
      });
    } else if (vnode instanceof Node) {
      container.appendChild(vnode);
    } else if (vnode != null) {
      container.appendChild(document.createTextNode(String(vnode)));
    }
  };
  
  if (typeof children === 'function') effect(renderToPortal);
  else renderToPortal();
  
  return null;
}

export function h(
  type: string | Component,
  props: Record<string, any> | null = null,
  ...children: any[]
): VNode {
  if (typeof type === 'function') {
    return type({ ...props, children: children.length > 0 ? children.flat() : undefined });
  }
  
  const el = document.createElement(type);
  
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key === 'ref' && typeof value === 'function') {
        value(el);
      } else if (typeof value !== 'function') {
        el.setAttribute(key, value);
      }
    }
  }
  
  for (const child of children.flat(Infinity)) {
    if (child != null) {
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }
  }
  
  return el;
}

export function text(signalOrValue: (() => string | number) | string | number): Text {
  const node = document.createTextNode('');
  if (typeof signalOrValue === 'function') {
    effect(() => { node.textContent = String(signalOrValue()); });
  } else {
    node.textContent = String(signalOrValue);
  }
  return node;
}

export function render(root: HTMLElement, fn: () => VNode): () => void {
  let cleanup: (() => void) | undefined;
  
  const run = (): void => {
    cleanup?.();
    root.innerHTML = '';
    const vnode = fn();
    root.appendChild(vnode instanceof Node ? vnode : document.createTextNode(String(vnode)));
  };
  
  const stop = effect(run);
  cleanup = stop;
  return stop;
}

export function show<T>(condition: () => boolean, fn: () => T): T | null {
  return condition() ? fn() : null;
}

/**
 * For Loop Component - Renders List Items
 * 
 * Renders each item in an array, with optional key function for efficient list updates.
 * 
 * @param items - Signal or function returning an array
 * @param fn - Render function for each item, receives (item, index)
 * @param keyFn - Optional key function for efficient diffing. When provided, enables O(1) updates
 *                instead of full re-render. Should return a stable unique identifier.
 *                Note: Current implementation is a simple map, use ForWithKey for full keyed diff.
 * @returns Array of rendered nodes
 * 
 * @example
 * ```ts
 * // Basic usage (backward compatible)
 * For(() => [1, 2, 3], (item) => h('div', null, item))
 * 
 * // With key function
 * For(
 *   () => users,
 *   (user) => h('div', null, user.name),
 *   (user) => user.id  // Stable key
 * )
 * ```
 */
export function For<T, U>(
  items: () => T[],
  fn: (item: T, index: () => number) => U,
  keyFn?: (item: T, index: number) => string | number
): U[] {
  const itemList = items();
  
  // Without keyFn, use simple index-based rendering (backward compatible)
  if (!keyFn) {
    return itemList.map((item, i) => fn(item, () => i));
  }
  
  // With keyFn, use keyed mapping
  // Note: Current version is a simple implementation, use ForWithKey for full keyed diff logic
  return itemList.map((item, i) => fn(item, () => i));
}

/**
 * ForWithKey - Efficient List Rendering with Keys
 * 
 * Advanced version of For that maintains DOM node identity based on keys,
 * enabling efficient insertions, deletions, and reordering.
 * 
 * @param container - Target DOM container
 * @param items - Signal or function returning an array
 * @param fn - Render function for each item, receives (item, index, key)
 * @param keyFn - Key function returning a stable unique identifier
 * @returns Cleanup function to stop reactive updates
 * 
 * @example
 * ```ts
 * const cleanup = ForWithKey(
 *   container,
 *   () => todos,
 *   (todo, index) => h('li', { key: todo.id }, todo.text),
 *   (todo) => todo.id
 * );
 * 
 * // 稍后：cleanup();
 * ```
 */
export function ForWithKey<T>(
  container: HTMLElement,
  items: () => T[],
  fn: (item: T, index: () => number, key: string | number) => Node | VNode,
  keyFn: (item: T, index: number) => string | number
): () => void {
  let cleanup: (() => void) | undefined;
  const keyToNode = new Map<string | number, Node>();
  const keyToIndex = new Map<string | number, number>();
  
  const render = (): void => {
    const itemList = items();
    const newKeyToNode = new Map<string | number, Node>();
    const fragment = document.createDocumentFragment();
    
    // Process each item with its key
    itemList.forEach((item, i) => {
      const key = keyFn(item, i);
      let node: Node;
      
      if (keyToNode.has(key)) {
        // Reuse existing node
        node = keyToNode.get(key)!;
      } else {
        // Create new node
        const result = fn(item, () => i, key);
        node = result instanceof Node ? result : document.createTextNode(String(result));
      }
      
      newKeyToNode.set(key, node);
      keyToIndex.set(key, i);
      fragment.appendChild(node);
    });
    
    // Clear container and append all nodes
    container.innerHTML = '';
    container.appendChild(fragment);
    
    // Cleanup old nodes
    keyToNode.forEach((node, key) => {
      if (!newKeyToNode.has(key) && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
    
    // Update map reference
    keyToNode.clear();
    newKeyToNode.forEach((node, key) => keyToNode.set(key, node));
  };
  
  const stop = effect(render);
  cleanup = stop;
  
  return stop;
}

export const Fragment = ({ children }: { children: any[] }) => children;

// Tag helpers - minimal set
const tag = (name: string) => (props: any = null, ...children: any[]) => h(name, props, ...children);
export const div = tag('div');
export const span = tag('span');
export const button = tag('button');
export const input = tag('input');

// ============== DOM String Rendering (Browser Only) ==============

/**
 * Convert VNode to HTML string (Browser/DOM environments only)
 * 
 * @deprecated For SSR use `import { renderToString } from '@qorejs/qore/ssr'` instead
 * This function requires DOM APIs and will not work in Node.js environments
 */
export function renderToDOMString(vnode: VNode): string {
  if (vnode == null) return '';
  if (typeof vnode === 'string' || typeof vnode === 'number') return String(vnode);
  if (Array.isArray(vnode)) return vnode.map(v => renderToDOMString(v)).join('');
  if (typeof vnode === 'function') return renderToDOMString(vnode());
  
  // Handle DOM nodes
  if (typeof vnode === 'object' && 'nodeType' in vnode) {
    const node = vnode as unknown as { nodeType: number; outerHTML?: string; textContent?: string };
    if (node.nodeType === 1) return node.outerHTML || '';
    return node.textContent || '';
  }
  
  return '';
}

/**
 * Render component to HTML string (Browser/DOM environments only)
 * 
 * @deprecated For SSR use `import { renderComponentToString } from '@qorejs/qore/ssr'` instead
 */
export function renderComponentToDOMString(component: Component): string {
  return renderToDOMString(component());
}

/**
 * Async VNode parsing (Browser/DOM environments only)
 * 
 * @deprecated For SSR use `import { renderAsync } from '@qorejs/qore/ssr'` instead
 */
export async function renderDOMAsync(vnode: VNode | Promise<VNode>): Promise<string> {
  const resolved = await vnode;
  if (resolved == null) return '';
  if (typeof resolved === 'string' || typeof resolved === 'number') return String(resolved);
  if (Array.isArray(resolved)) {
    const results = await Promise.all(resolved.map(v => renderDOMAsync(v)));
    return results.join('');
  }
  if (resolved instanceof Node) {
    return resolved instanceof Element ? resolved.outerHTML : resolved.textContent || '';
  }
  if (typeof resolved === 'function') return renderDOMAsync(resolved());
  return '';
}

import { StreamRenderer } from './stream';

/**
 * Render to stream (Browser/DOM environments only)
 * 
 * Renders a component to an HTML stream, outputting through StreamRenderer.
 * 
 * @deprecated For SSR use `import { renderToStream } from '@qorejs/qore/ssr'` instead
 * 
 * Distinction from renderStreamToDOM in stream.ts:
 *   - renderToStream: Render component → Output stream (generates stream)
 *   - renderStreamToDOM: Consume stream → Render to DOM (receives stream)
 */
export function renderToStream(
  root: StreamRenderer,
  fn: () => VNode,
  options?: { chunkSize?: number; onChunk?: (chunk: string) => void }
): { abort: () => void } {
  const { chunkSize = 1000, onChunk } = options || {};
  let aborted = false;
  const processChunk = (html: string) => {
    if (aborted) return;
    root.write(html);
    onChunk?.(html);
  };
  const vnode = fn();
  const html = renderToDOMString(vnode);
  if (html.length <= chunkSize) {
    processChunk(html);
  } else {
    for (let i = 0; i < html.length; i += chunkSize) {
      if (aborted) break;
      processChunk(html.slice(i, i + chunkSize));
    }
  }
  return { abort: () => { aborted = true; } };
}

/**
 * Async render to stream (Browser/DOM environments only)
 * 
 * @deprecated For SSR use `import { renderToStreamAsync } from '@qorejs/qore/ssr'` instead
 */
export async function renderToStreamAsync(
  renderer: StreamRenderer,
  fn: () => VNode | Promise<VNode>
): Promise<void> {
  try {
    const vnode = await fn();
    const html = await renderDOMAsync(vnode);
    renderer.write(html);
    renderer.end();
  } catch (err) {
    renderer.fail(err as Error);
  }
}

// ============== 向后兼容别名（已废弃）==============
// 这些别名仅用于向后兼容，将在未来版本中移除
// SSR 场景请使用 `import { renderToString } from '@qorejs/qore/ssr'`
/** @deprecated 已重命名为 renderToDOMString，SSR 请使用 '@qorejs/qore/ssr' 中的 renderToString */
export const renderToString = renderToDOMString;
/** @deprecated 已重命名为 renderComponentToDOMString，SSR 请使用 '@qorejs/qore/ssr' 中的 renderComponentToString */
export const renderComponentToString = renderComponentToDOMString;
/** @deprecated 已重命名为 renderDOMAsync，SSR 请使用 '@qorejs/qore/ssr' 中的 renderAsync */
export const renderAsync = renderDOMAsync;
