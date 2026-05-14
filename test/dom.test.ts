import test from 'node:test';
import assert from 'node:assert/strict';

import { h, mount, signal } from '../src/index.js';

class FakeNode {
  parentNode: FakeElement | null = null;
}

class FakeElement extends FakeNode {
  tagName: string;
  listeners = new Map<string, EventListener>();
  attributes = new Map<string, unknown>();
  style: Record<string, unknown> & { cssText?: string } = {};
  className = '';
  childNodes: FakeNode[] = [];
  override parentNode: FakeElement | null = null;

  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
  }

  addEventListener(type: string, handler: EventListener): void {
    this.listeners.set(type, handler);
  }

  removeEventListener(type: string, handler: EventListener): void {
    if (this.listeners.get(type) === handler) {
      this.listeners.delete(type);
    }
  }

  setAttribute(name: string, value: unknown): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  appendChild(node: FakeNode): FakeNode {
    if (node instanceof FakeElement || node instanceof FakeTextNode) {
      node.parentNode = this;
    }

    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  replaceChildren(...nodes: FakeNode[]): void {
    for (const child of this.childNodes) {
      if (child instanceof FakeElement || child instanceof FakeTextNode) {
        child.parentNode = null;
      }
    }

    this.childNodes = [];

    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  dispatch(type: string, event: Event): void {
    const handler = this.listeners.get(type);

    if (handler) {
      handler(event);
    }
  }
}

class FakeTextNode extends FakeNode {
  textContent: string;

  constructor(textContent = '') {
    super();
    this.textContent = textContent;
  }
}

type MutableGlobalDom = {
  document?: unknown;
  Node?: unknown;
};

function withFakeDom(run: () => void): void {
  const globalDom = globalThis as unknown as MutableGlobalDom;
  const originalDocument = globalDom.document;
  const originalNode = globalDom.Node;

  globalDom.Node = FakeNode;
  globalDom.document = {
    createElement(tagName: string) {
      return new FakeElement(tagName);
    },
    createTextNode(textContent?: string) {
      return new FakeTextNode(textContent);
    }
  };

  try {
    run();
  } finally {
    globalDom.document = originalDocument;
    globalDom.Node = originalNode;
  }
}

test('plain event handlers are registered without being invoked during render', () => {
  let seen: string | null = null;

  withFakeDom(() => {
    const input = h('input', {
      oninput: (event: Event) => {
        seen = ((event.target as unknown) as { value: string }).value;
      }
    }) as unknown as FakeElement;

    assert.equal(seen, null);

    input.dispatch('input', { target: { value: 'Qore' } } as unknown as Event);
    assert.equal(seen, 'Qore');
  });
});

test('signal-based event handlers can still swap reactively', () => {
  const calls: string[] = [];

  withFakeDom(() => {
    const handler = signal<((event: { type: string }) => void) | null>(null);
    const button = h('button', { onclick: handler }) as unknown as FakeElement;

    button.dispatch('click', { type: 'click' } as unknown as Event);
    assert.deepEqual(calls, []);

    handler.set((event: { type: string }) => {
      (calls as string[]).push(`first:${event.type}`);
    });

    button.dispatch('click', { type: 'click' } as unknown as Event);

    handler.set((event: { type: string }) => {
      (calls as string[]).push(`second:${event.type}`);
    });

    button.dispatch('click', { type: 'click' } as unknown as Event);

    assert.deepEqual(calls, ['first:click', 'second:click']);
  });
});

// Mounted scopes should tear down reactive event bindings when the tree is disposed.
test('mount disposes reactive event handlers when the subtree is torn down', () => {
  const calls: string[] = [];

  withFakeDom(() => {
    const root = new FakeElement('div');
    const handler = signal((event: { type: string }) => {
      calls.push(`first:${event.type}`);
    });
    const dispose = mount(root as unknown as Element, () => h('button', { onclick: handler }));
    const button = root.childNodes[0] as FakeElement;

    button.dispatch('click', { type: 'click' } as unknown as Event);
    assert.deepEqual(calls, ['first:click']);

    dispose();
    assert.equal(root.childNodes.length, 0);

    button.dispatch('click', { type: 'click' } as unknown as Event);
    handler.set((event) => {
      calls.push(`second:${event.type}`);
    });
    button.dispatch('click', { type: 'click' } as unknown as Event);

    assert.deepEqual(calls, ['first:click']);
  });
});

// Ref callbacks should work with signals so callers can capture elements declaratively.
test('ref can hydrate a signal with the created element', () => {
  withFakeDom(() => {
    const ref = signal<FakeElement | null>(null);
    const input = h('input', { ref }) as unknown as FakeElement;

    assert.equal(ref(), input);
  });
});
