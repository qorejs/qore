/**
 * Qore Renderer - Fine-grained DOM Updates
 * No VDOM, No Diff - Direct signal binding
 * 
 * Extended with Server-Side Streaming Support
 */

import { effect, signal } from './signal';
import { StreamRenderer } from './stream';

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
        if (node instanceof Node) {
          container.appendChild(node);
        } else if (typeof node === 'string' || typeof node === 'number') {
          container.appendChild(document.createTextNode(String(node)));
        }
      });
    } else if (vnode instanceof Node) {
      container.appendChild(vnode);
    } else if (vnode != null) {
      container.appendChild(document.createTextNode(String(vnode)));
    }
  };
  
  if (typeof children === 'function') {
    effect(renderToPortal);
  } else {
    renderToPortal();
  }
  
  return null;
}

export function h(
  type: string | Component,
  props: Record<string, any> | null = null,
  ...children: any[]
): VNode {
  if (typeof type === 'function') {
    // 组件函数 - 传入 props 和 children
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
  
  const flatChildren = children.flat(Infinity);
  for (const child of flatChildren) {
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
    effect(() => {
      node.textContent = String(signalOrValue());
    });
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
    
    if (vnode instanceof Node) {
      root.appendChild(vnode);
    } else {
      root.appendChild(document.createTextNode(String(vnode)));
    }
  };
  
  const stop = effect(run);
  cleanup = stop;
  return stop;
}

export function show<T>(condition: () => boolean, fn: () => T): T | null {
  return condition() ? fn() : null;
}

export function For<T, U>(
  items: () => T[],
  fn: (item: T, index: () => number) => U
): U[] {
  const list = items();
  return list.map((item, i) => fn(item, () => i));
}

export const Fragment = ({ children }: { children: any[] }) => children;

// Common tag helpers
const tag = (name: string) => (props: any = null, ...children: any[]) => h(name, props, ...children);

export const div = tag('div');
export const span = tag('span');
export const button = tag('button');
export const input = tag('input');
export const p = tag('p');
export const h1 = tag('h1');
export const h2 = tag('h2');
export const h3 = tag('h3');

// ============== Server-Side Rendering ==============

/**
 * 将 VNode 转换为 HTML 字符串 (SSR)
 * 纯字符串拼接，不依赖任何 DOM API，可在 Node.js 环境运行
 */
export function renderToString(vnode: VNode): string {
  if (vnode == null) return '';
  
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return String(vnode);
  }
  
  if (Array.isArray(vnode)) {
    return vnode.map(v => renderToString(v)).join('');
  }
  
  if (typeof vnode === 'function') {
    // 组件函数
    return renderToString(vnode());
  }
  
  // 处理 DOM 节点（在 jsdom/浏览器环境）
  // 使用 nodeType 检测而不是 instanceof，避免依赖特定环境
  if (typeof vnode === 'object' && 'nodeType' in vnode) {
    const node = vnode as unknown as { nodeType: number; outerHTML?: string; textContent?: string };
    // Element node
    if (node.nodeType === 1) {
      return node.outerHTML || '';
    }
    // Text/Comment node
    return node.textContent || '';
  }
  
  // 其他对象类型
  if (typeof vnode === 'object') {
    return '';
  }
  
  return String(vnode);
}

/**
 * 将组件渲染为 HTML 字符串 (SSR)
 */
export function renderComponentToString(component: Component): string {
  return renderToString(component());
}

/**
 * 流式渲染到 StreamRenderer
 * 支持分块输出大型组件
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
  
  // 分块处理大型内容
  const vnode = fn();
  const html = renderToString(vnode);
  
  if (html.length <= chunkSize) {
    processChunk(html);
  } else {
    // 分块输出
    for (let i = 0; i < html.length; i += chunkSize) {
      if (aborted) break;
      processChunk(html.slice(i, i + chunkSize));
    }
  }
  
  return {
    abort: () => { aborted = true; }
  };
}

/**
 * 异步 VNode 解析
 * 支持组件返回 Promise
 */
export async function renderAsync(vnode: VNode | Promise<VNode>): Promise<string> {
  const resolved = await vnode;
  
  if (resolved == null) return '';
  
  if (typeof resolved === 'string' || typeof resolved === 'number') {
    return String(resolved);
  }
  
  if (Array.isArray(resolved)) {
    const results = await Promise.all(resolved.map(v => renderAsync(v)));
    return results.join('');
  }
  
  if (resolved instanceof Node) {
    return resolved instanceof Element ? resolved.outerHTML : resolved.textContent || '';
  }
  
  if (typeof resolved === 'function') {
    return renderAsync(resolved());
  }
  
  return '';
}

/**
 * 异步流式渲染
 * 支持异步组件的流式输出
 */
export async function renderToStreamAsync(
  renderer: StreamRenderer,
  fn: () => VNode | Promise<VNode>
): Promise<void> {
  try {
    const vnode = await fn();
    const html = await renderAsync(vnode);
    renderer.write(html);
    renderer.end();
  } catch (err) {
    renderer.fail(err as Error);
  }
}
