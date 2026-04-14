/**
 * Qore Renderer - Virtual DOM to Real DOM
 * Supports incremental patching for better performance
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
  private rootVNode: VNode | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(vnode: VNode): void {
    this.container.innerHTML = '';
    const element = this.createDOM(vnode);
    if (element) {
      this.container.appendChild(element);
    }
    this.rootVNode = vnode;
  }

  /**
   * Incremental patch - only update changed parts
   */
  patch(newVNode: VNode): void {
    if (!this.rootVNode) {
      this.render(newVNode);
      return;
    }

    this.patchNode(this.container, this.rootVNode, newVNode);
    this.rootVNode = newVNode;
  }

  /**
   * Patch a specific node
   */
  private patchNode(
    container: Node,
    oldVNode: VNode,
    newVNode: VNode
  ): void {
    // Handle primitives
    if (isPrimitive(oldVNode) && isPrimitive(newVNode)) {
      if (oldVNode !== newVNode) {
        const textNode = container.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.textContent = String(newVNode);
        }
      }
      return;
    }

    // Handle text nodes
    if (isText(oldVNode) && isText(newVNode)) {
      if (oldVNode.value !== newVNode.value) {
        const textNode = container.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.textContent = newVNode.value;
        }
      }
      return;
    }

    // Handle element nodes
    if (isElement(oldVNode) && isElement(newVNode)) {
      const element = container.firstChild as HTMLElement;
      
      if (!element) {
        this.render(newVNode);
        return;
      }

      // Type changed - replace
      if (oldVNode.type !== newVNode.type) {
        this.render(newVNode);
        return;
      }

      // Update props
      this.patchProps(element, oldVNode.props || {}, newVNode.props || {});

      // Update children
      this.patchChildren(element, oldVNode.children, newVNode.children);
    } else {
      // Different types - replace
      this.render(newVNode);
    }
  }

  /**
   * Patch element props
   */
  private patchProps(
    element: HTMLElement,
    oldProps: Record<string, any>,
    newProps: Record<string, any>
  ): void {
    const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

    for (const key of allKeys) {
      const oldValue = oldProps[key];
      const newValue = newProps[key];

      if (oldValue !== newValue) {
        if (newValue === undefined) {
          // Remove prop
          if (key.startsWith('on') && typeof oldValue === 'function') {
            element.removeEventListener(key.slice(2).toLowerCase(), oldValue);
          } else {
            element.removeAttribute(key);
          }
        } else if (oldValue === undefined) {
          // Add prop
          this.setProp(element, key, newValue);
        } else {
          // Update prop
          this.setProp(element, key, newValue);
        }
      }
    }
  }

  /**
   * Set a single prop on an element
   */
  private setProp(element: HTMLElement, key: string, value: any): void {
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

  /**
   * Patch children with keyed reconciliation
   */
  private patchChildren(
    parent: HTMLElement,
    oldChildren: VNode[],
    newChildren: VNode[]
  ): void {
    // Build key maps
    const oldKeyMap = new Map<string | number, { index: number; node: VNode; dom: Node }>();
    const newKeyMap = new Map<string | number, { index: number; node: VNode }>();

    const oldDomChildren = Array.from(parent.childNodes);

    for (let i = 0; i < oldChildren.length; i++) {
      const child = oldChildren[i];
      if (isElement(child) && child.key !== undefined && oldDomChildren[i]) {
        oldKeyMap.set(child.key, { index: i, node: child, dom: oldDomChildren[i] });
      }
    }

    for (let i = 0; i < newChildren.length; i++) {
      const child = newChildren[i];
      if (isElement(child) && child.key !== undefined) {
        newKeyMap.set(child.key, { index: i, node: child });
      }
    }

    const matchedOld = new Set<string | number>();
    const newDomChildren: Node[] = [];

    // Process new children
    for (let i = 0; i < newChildren.length; i++) {
      const newChild = newChildren[i];
      let domNode: Node | null = null;

      if (isElement(newChild) && newChild.key !== undefined) {
        const oldMatch = oldKeyMap.get(newChild.key);

        if (oldMatch) {
          matchedOld.add(newChild.key);
          this.patchNode(oldMatch.dom, oldMatch.node, newChild);
          domNode = oldMatch.dom;
        } else {
          domNode = this.createDOM(newChild);
          if (domNode) {
            parent.insertBefore(domNode, oldDomChildren[i] || null);
          }
        }
      } else {
        const oldChild = oldChildren[i];

        if (oldChild === undefined) {
          domNode = this.createDOM(newChild);
          if (domNode) {
            parent.appendChild(domNode);
          }
        } else {
          const oldDom = oldDomChildren[i];
          if (oldDom) {
            this.patchNode(oldDom, oldChild, newChild);
            domNode = oldDom;
          } else {
            domNode = this.createDOM(newChild);
            if (domNode) {
              parent.appendChild(domNode);
            }
          }
        }
      }

      if (domNode) {
        newDomChildren.push(domNode);
      }
    }

    // Remove old children that are no longer present
    for (let i = newChildren.length; i < oldChildren.length; i++) {
      const oldChild = oldChildren[i];
      if (!isElement(oldChild) || oldChild.key === undefined) {
        const oldDom = oldDomChildren[i];
        if (oldDom) {
          parent.removeChild(oldDom);
        }
      }
    }

    // Remove keyed children that were removed
    for (const [key, { dom }] of oldKeyMap.entries()) {
      if (!matchedOld.has(key) && dom.parentNode === parent) {
        parent.removeChild(dom);
      }
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

/**
 * Legacy patch function - kept for backward compatibility
 * Use Renderer.patch() for better performance
 */
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

  const renderer = new Renderer(container);
  renderer.patch(newVNode);
}

/**
 * Type guards
 */
function isText(node: VNode): node is VText {
  return typeof node === 'object' && node !== null && (node as any).type === '#text';
}

function isElement(node: VNode): node is VElement {
  return typeof node === 'object' && node !== null && typeof (node as any).type === 'string' && (node as any).type !== '#text';
}

function isPrimitive(node: VNode): node is string | number {
  return typeof node === 'string' || typeof node === 'number';
}
