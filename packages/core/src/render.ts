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

export function For<T, U>(items: () => T[], fn: (item: T, index: () => number) => U): U[] {
  return items().map((item, i) => fn(item, () => i));
}

export const Fragment = ({ children }: { children: any[] }) => children;

// Tag helpers - minimal set
const tag = (name: string) => (props: any = null, ...children: any[]) => h(name, props, ...children);
export const div = tag('div');
export const span = tag('span');
export const button = tag('button');
export const input = tag('input');

// ============== Server-Side Rendering ==============

/**
 * Convert VNode to HTML string (SSR)
 */
export function renderToString(vnode: VNode): string {
  if (vnode == null) return '';
  if (typeof vnode === 'string' || typeof vnode === 'number') return String(vnode);
  if (Array.isArray(vnode)) return vnode.map(v => renderToString(v)).join('');
  if (typeof vnode === 'function') return renderToString(vnode());
  
  // Handle DOM nodes
  if (typeof vnode === 'object' && 'nodeType' in vnode) {
    const node = vnode as unknown as { nodeType: number; outerHTML?: string; textContent?: string };
    if (node.nodeType === 1) return node.outerHTML || '';
    return node.textContent || '';
  }
  
  return '';
}

/**
 * Render component to HTML string (SSR)
 */
export function renderComponentToString(component: Component): string {
  return renderToString(component());
}

/**
 * Async VNode parsing
 */
export async function renderAsync(vnode: VNode | Promise<VNode>): Promise<string> {
  const resolved = await vnode;
  if (resolved == null) return '';
  if (typeof resolved === 'string' || typeof resolved === 'number') return String(resolved);
  if (Array.isArray(resolved)) {
    const results = await Promise.all(resolved.map(v => renderAsync(v)));
    return results.join('');
  }
  if (resolved instanceof Node) {
    return resolved instanceof Element ? resolved.outerHTML : resolved.textContent || '';
  }
  if (typeof resolved === 'function') return renderAsync(resolved());
  return '';
}

import { StreamRenderer } from './stream';

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
  const html = renderToString(vnode);
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
