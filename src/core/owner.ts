import type { Cleanup } from './signal-types.js';

interface OwnerNode {
  parent: OwnerNode | null;
  children: Set<OwnerNode>;
  cleanups: Cleanup[];
  active: boolean;
}

let activeOwner: OwnerNode | null = null;

function createOwner(parent: OwnerNode | null): OwnerNode {
  const owner: OwnerNode = {
    parent,
    children: new Set<OwnerNode>(),
    cleanups: [],
    active: true
  };

  parent?.children.add(owner);
  return owner;
}

function disposeOwnerContents(owner: OwnerNode): void {
  const children = Array.from(owner.children);
  owner.children.clear();

  for (let index = children.length - 1; index >= 0; index -= 1) {
    disposeOwner(children[index]);
  }

  for (let index = owner.cleanups.length - 1; index >= 0; index -= 1) {
    try {
      const cleanup = owner.cleanups[index];

      if (cleanup) {
        cleanup();
      }
    } catch {
      // Keep unwinding the owner tree even if one cleanup throws.
    }
  }

  owner.cleanups.length = 0;
}

export function withOwner<T>(owner: OwnerNode | null, fn: () => T): T {
  const previousOwner = activeOwner;
  activeOwner = owner;

  try {
    return fn();
  } finally {
    activeOwner = previousOwner;
  }
}

export function createOwnedScope(): OwnerNode {
  return createOwner(activeOwner);
}

export function resetOwner(owner: OwnerNode): void {
  if (!owner.active) {
    return;
  }

  disposeOwnerContents(owner);
}

export function disposeOwner(owner: OwnerNode | null | undefined): void {
  if (!owner || !owner.active) {
    return;
  }

  owner.active = false;
  disposeOwnerContents(owner);
  owner.parent?.children.delete(owner);
  owner.parent = null;
}

export function createRoot<T>(fn: (dispose: Cleanup) => T): T {
  const owner = createOwner(activeOwner);
  const dispose = () => disposeOwner(owner);
  return withOwner(owner, () => fn(dispose));
}

export function onCleanup(cleanup: Cleanup): void {
  activeOwner?.cleanups.push(cleanup);
}
