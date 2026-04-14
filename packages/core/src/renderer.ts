/**
 * Qore Renderer - Virtual DOM to Real DOM
 */

import { Signal } from './reactive';

export type VNode = string | number | VElement | VText;

export interface VElement {
  type: string;
  props: Record<string, any> | null;
  children: VNode[];
  key?: string | number;
}

export interface VText {
  type: '#text';
  value: string;
}

export function h(
  type: string | Function,
  props: Record<string, any> | null = null,
  ...children: any[]
): VElement {
  const normalizedChildren = children.flat().map(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      return { type: '#text' as const, value: String(child) };
    }
    return child;
  });

  return {
    type: typeof type === 'string' ? type : 'component',
    props,
    children: normalizedChildren,
  };
}

export function text(value: string | number): VText {
  return { type: '#text', value: String(value) };
}

export class Renderer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(vnode: VNode): void {
    this.container.innerHTML = '';
    const element = this.createDOM(vnode);
    if (element) {
      this.container.appendChild(element);
    }
  }

  private createDOM(vnode: VNode): Node | null {
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return document.createTextNode(String(vnode));
    }

    if (vnode.type === '#text') {
      return document.createTextNode(vnode.value);
    }

    const element = document.createElement(vnode.type);

    if (vnode.props) {
      for (const [key, value] of Object.entries(vnode.props)) {
        if (key.startsWith('on') && typeof value === 'function') {
          element.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'className') {
          element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else if (typeof value !== 'function') {
          element.setAttribute(key, value);
        }
      }
    }

    vnode.children.forEach(child => {
      const childNode = this.createDOM(child);
      if (childNode) {
        element.appendChild(childNode);
      }
    });

    return element;
  }
}

export function patch(
  container: HTMLElement,
  oldVNode: VNode | null,
  newVNode: VNode
): void {
  if (!oldVNode) {
    const renderer = new Renderer(container);
    renderer.render(newVNode);
    return;
  }

  if (JSON.stringify(oldVNode) !== JSON.stringify(newVNode)) {
    const renderer = new Renderer(container);
    renderer.render(newVNode);
  }
}
