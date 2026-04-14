/**
 * Qore Renderer - Fine-grained DOM Updates
 * No VDOM, No Diff - Direct signal binding
 */

import { effect, signal } from './signal';

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
    return type();
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
