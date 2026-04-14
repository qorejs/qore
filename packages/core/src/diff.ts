/**
 * Qore Diff Algorithm - Find minimal changes between VNodes
 * Implements tree diffing with path-based patches
 */

import { VNode, VElement, VText } from './renderer';

export type PatchType = 'update' | 'insert' | 'remove' | 'replace';

export interface Patch {
  type: PatchType;
  path: (string | number)[];
  value?: VNode;
  oldValue?: VNode;
}

export interface DiffOptions {
  maxDepth?: number;
  includeOldValue?: boolean;
}

/**
 * Compare two VNodes and generate minimal patches
 * 
 * @param oldVNode - Previous VNode tree
 * @param newVNode - New VNode tree
 * @param options - Diff options
 * @returns Array of patches to apply
 */
export function diff(
  oldVNode: VNode | null,
  newVNode: VNode,
  options: DiffOptions = {}
): Patch[] {
  const patches: Patch[] = [];
  const { maxDepth = 100, includeOldValue = false } = options;
  
  // Handle null oldVNode - everything is new
  if (oldVNode === null) {
    patches.push({
      type: 'insert',
      path: [],
      value: newVNode,
    });
    return patches;
  }
  
  // Recursively diff the trees
  diffNodes(oldVNode, newVNode, [], patches, 0, maxDepth, includeOldValue);
  
  return patches;
}

/**
 * Recursively diff two nodes
 */
function diffNodes(
  oldNode: VNode,
  newNode: VNode,
  path: (string | number)[],
  patches: Patch[],
  depth: number,
  maxDepth: number,
  includeOldValue: boolean
): void {
  if (depth > maxDepth) {
    // Max depth reached, replace entire subtree
    patches.push({
      type: 'replace',
      path: [...path],
      value: newNode,
      ...(includeOldValue ? { oldValue: oldNode } : {}),
    });
    return;
  }
  
  // Handle text nodes
  if (isText(oldNode) && isText(newNode)) {
    if (oldNode.value !== newNode.value) {
      patches.push({
        type: 'update',
        path: [...path],
        value: newNode,
        ...(includeOldValue ? { oldValue: oldNode } : {}),
      });
    }
    return;
  }
  
  // Handle string/number primitives
  if (isPrimitive(oldNode) && isPrimitive(newNode)) {
    if (oldNode !== newNode) {
      patches.push({
        type: 'update',
        path: [...path],
        value: newNode,
        ...(includeOldValue ? { oldValue: oldNode } : {}),
      });
    }
    return;
  }
  
  // Type changed - replace
  if (isElement(oldNode) && isElement(newNode)) {
    if (oldNode.type !== newNode.type) {
      patches.push({
        type: 'replace',
        path: [...path],
        value: newNode,
        ...(includeOldValue ? { oldValue: oldNode } : {}),
      });
      return;
    }
    
    // Diff props
    diffProps(oldNode, newNode, path, patches, includeOldValue);
    
    // Diff children
    diffChildren(oldNode, newNode, path, patches, depth, maxDepth, includeOldValue);
  } else {
    // Different node types - replace
    patches.push({
      type: 'replace',
      path: [...path],
      value: newNode,
      ...(includeOldValue ? { oldValue: oldNode } : {}),
    });
  }
}

/**
 * Diff element props
 */
function diffProps(
  oldNode: VElement,
  newNode: VElement,
  path: (string | number)[],
  patches: Patch[],
  includeOldValue: boolean
): void {
  const oldProps = oldNode.props || {};
  const newProps = newNode.props || {};
  
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
  
  for (const key of allKeys) {
    if (oldProps[key] !== newProps[key]) {
      const propPath = [...path, 'props', key];
      
      if (newProps[key] === undefined) {
        // Prop removed
        patches.push({
          type: 'remove',
          path: propPath,
          ...(includeOldValue ? { oldValue: oldProps[key] } : {}),
        });
      } else if (oldProps[key] === undefined) {
        // Prop added
        patches.push({
          type: 'insert',
          path: propPath,
          value: newProps[key],
        });
      } else {
        // Prop updated
        patches.push({
          type: 'update',
          path: propPath,
          value: newProps[key],
          ...(includeOldValue ? { oldValue: oldProps[key] } : {}),
        });
      }
    }
  }
}

/**
 * Diff element children using keyed reconciliation
 */
function diffChildren(
  oldNode: VElement,
  newNode: VElement,
  path: (string | number)[],
  patches: Patch[],
  depth: number,
  maxDepth: number,
  includeOldValue: boolean
): void {
  const oldChildren = oldNode.children || [];
  const newChildren = newNode.children || [];
  
  // Build key maps for keyed reconciliation
  const oldKeyMap = new Map<string | number, { index: number; node: VNode }>();
  const newKeyMap = new Map<string | number, { index: number; node: VNode }>();
  
  for (let i = 0; i < oldChildren.length; i++) {
    const child = oldChildren[i];
    if (isElement(child) && child.key !== undefined) {
      oldKeyMap.set(child.key, { index: i, node: child });
    }
  }
  
  for (let i = 0; i < newChildren.length; i++) {
    const child = newChildren[i];
    if (isElement(child) && child.key !== undefined) {
      newKeyMap.set(child.key, { index: i, node: child });
    }
  }
  
  // Track which old children have been matched
  const matchedOld = new Set<string | number>();
  
  // Process new children
  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    const childPath = [...path, 'children', i];
    
    if (isElement(newChild) && newChild.key !== undefined) {
      // Keyed child
      const oldMatch = oldKeyMap.get(newChild.key);
      
      if (oldMatch) {
        matchedOld.add(newChild.key);
        diffNodes(oldMatch.node, newChild, childPath, patches, depth + 1, maxDepth, includeOldValue);
      } else {
        // New keyed child - insert
        patches.push({
          type: 'insert',
          path: childPath,
          value: newChild,
        });
      }
    } else {
      // Unkeyed child - compare by position
      const oldChild = oldChildren[i];
      
      if (oldChild === undefined) {
        // New child
        patches.push({
          type: 'insert',
          path: childPath,
          value: newChild,
        });
      } else {
        diffNodes(oldChild, newChild, childPath, patches, depth + 1, maxDepth, includeOldValue);
      }
    }
  }
  
  // Find removed old children
  for (const [key, { index, node }] of oldKeyMap.entries()) {
    if (!matchedOld.has(key)) {
      patches.push({
        type: 'remove',
        path: [...path, 'children', index],
        ...(includeOldValue ? { oldValue: node } : {}),
      });
    }
  }
  
  // Handle unkeyed children that were removed
  const maxLen = Math.max(oldChildren.length, newChildren.length);
  for (let i = newChildren.length; i < oldChildren.length; i++) {
    const oldChild = oldChildren[i];
    if (!isElement(oldChild) || oldChild.key === undefined) {
      patches.push({
        type: 'remove',
        path: [...path, 'children', i],
        ...(includeOldValue ? { oldValue: oldChild } : {}),
      });
    }
  }
}

/**
 * Apply patches to a VNode tree
 */
export function applyPatches(root: VNode | null, patches: Patch[]): VNode | null {
  if (patches.length === 0) {
    return root;
  }
  
  // Sort patches by path depth (deepest first to avoid index shifts)
  const sortedPatches = [...patches].sort((a, b) => {
    return b.path.length - a.path.length;
  });
  
  let result = root;
  
  for (const patch of sortedPatches) {
    result = applyPatch(result, patch);
  }
  
  return result;
}

/**
 * Apply a single patch to a VNode tree
 */
function applyPatch(root: VNode | null, patch: Patch): VNode | null {
  const { type, path, value } = patch;
  
  if (path.length === 0) {
    // Root level patch
    if (type === 'remove') {
      return null;
    }
    return value ?? root;
  }
  
  // Navigate to parent
  let parent: any = root;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (parent && typeof parent === 'object') {
      parent = (parent as any)[key];
    } else {
      return root; // Can't navigate further
    }
  }
  
  const lastKey = path[path.length - 1];
  
  if (!parent || typeof parent !== 'object') {
    return root;
  }
  
  switch (type) {
    case 'update':
    case 'insert':
    case 'replace':
      (parent as any)[lastKey] = value;
      break;
    case 'remove':
      if (Array.isArray(parent)) {
        parent.splice(lastKey as number, 1);
      } else {
        delete (parent as any)[lastKey];
      }
      break;
  }
  
  return root;
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

/**
 * Calculate the size of a VNode tree (for debugging/benchmarking)
 */
export function nodeSize(node: VNode): number {
  if (typeof node === 'string' || typeof node === 'number') {
    return 1;
  }
  if (node.type === '#text') {
    return 1;
  }
  return 1 + node.children.reduce((sum, child) => sum + nodeSize(child), 0);
}

/**
 * Calculate the number of patches (for debugging/benchmarking)
 */
export function patchCount(patches: Patch[]): number {
  return patches.length;
}
