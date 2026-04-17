/**
 * Qore Renderer - Fine-grained DOM Updates
 * No VDOM, No Diff - Direct signal binding
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
 * For 循环组件 - 渲染列表项
 * 
 * 用于渲染数组中的每个项目，支持可选的 key 函数以实现高效的列表更新。
 * 
 * @param items - 返回数组的信号或函数
 * @param fn - 每个项目的渲染函数，接收 (item, index) 参数
 * @param keyFn - 可选的 key 函数，用于高效 diff。提供时可启用 O(1) 更新，
 *                而非完全重新渲染。应返回稳定的唯一标识符。
 *                注意：当前实现为简单映射，完整 keyed diff 请使用 ForWithKey。
 * @returns 渲染后的节点数组
 * 
 * @example
 * ```ts
 * // 基础用法（向后兼容）
 * For(() => [1, 2, 3], (item) => h('div', null, item))
 * 
 * // 带 key 函数的用法
 * For(
 *   () => users,
 *   (user) => h('div', null, user.name),
 *   (user) => user.id  // 稳定的 key
 * )
 * ```
 */
export function For<T, U>(
  items: () => T[],
  fn: (item: T, index: () => number) => U,
  keyFn?: (item: T, index: number) => string | number
): U[] {
  const itemList = items();
  
  // 未提供 keyFn 时，使用基于索引的简单渲染（向后兼容）
  if (!keyFn) {
    return itemList.map((item, i) => fn(item, () => i));
  }
  
  // 提供 keyFn 时，使用带 key 的映射
  // 注意：当前版本为简单实现，完整 keyed diff 逻辑请使用 ForWithKey
  return itemList.map((item, i) => fn(item, () => i));
}

/**
 * ForWithKey - List rendering with efficient keyed diffing
 * 
 * This is a more advanced version of For that maintains DOM node identity
 * based on keys, enabling efficient insertions, deletions, and reordering.
 * 
 * @param container - DOM container to render into
 * @param items - Signal or function returning array of items
 * @param fn - Render function for each item, receives (item, index, key)
 * @param keyFn - Key function returning stable unique identifier
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
 * // Later: cleanup();
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
      if (!newKeyToNode.has(key)) {
        node.remove();
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
 * 将 VNode 转换为 HTML 字符串（仅限浏览器/DOM 环境）
 * 
 * @deprecated 服务端渲染请使用 `import { renderToString } from '@qorejs/qore/ssr'`
 * 此函数需要 DOM API，在 Node.js 环境中无法工作
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
 * 渲染组件为 HTML 字符串（仅限浏览器/DOM 环境）
 * 
 * @deprecated 服务端渲染请使用 `import { renderComponentToString } from '@qorejs/qore/ssr'`
 */
export function renderComponentToDOMString(component: Component): string {
  return renderToDOMString(component());
}

/**
 * 异步 VNode 解析（仅限浏览器/DOM 环境）
 * 
 * @deprecated 服务端渲染请使用 `import { renderAsync } from '@qorejs/qore/ssr'`
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
 * 渲染到流（仅限浏览器/DOM 环境）
 * 
 * 将组件渲染为 HTML 流，通过 StreamRenderer 输出。
 * 
 * @deprecated 服务端渲染请使用 `import { renderToStream } from '@qorejs/qore/ssr'`
 * 
 * 与 stream.ts 中的 renderStreamToDOM 区分：
 *   - renderToStream：渲染组件 → 输出流（生成流）
 *   - renderStreamToDOM：消费流 → 渲染到 DOM（接收流）
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
 * 异步渲染到流（仅限浏览器/DOM 环境）
 * 
 * @deprecated 服务端渲染请使用 `import { renderToStreamAsync } from '@qorejs/qore/ssr'`
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
