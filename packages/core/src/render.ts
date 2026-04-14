/**
 * Qore Renderer - Fine-grained DOM Updates
 * No VDOM, No Diff - Direct signal binding
 */

import { effect } from './signal';

export type VNode = string | number | Node | Component;
export type Component = () => VNode;

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
  
  const flatChildren = children.flat();
  for (const child of flatChildren) {
    if (child != null) {
      el.appendChild(
        typeof child === 'string' || typeof child === 'number'
          ? document.createTextNode(String(child))
          : child as Node
      );
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
  let cleanup: (() => void) | null = null;
  
  const run = () => {
    if (cleanup) cleanup();
    root.innerHTML = '';
    const vnode = fn();
    
    if (vnode instanceof Node) {
      root.appendChild(vnode);
    } else {
      root.appendChild(document.createTextNode(String(vnode)));
    }
  };
  
  return effect(run);
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
