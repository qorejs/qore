import test from 'node:test';
import assert from 'node:assert/strict';

import { assertCanUseDOM, canUseDOM, createApp, createResponse, dynamic, fragment, h, list, mount, renderResponse, show, signal, text } from '../src/index.js';

class FakeNode {
  parentNode: FakeParent | null = null;

  get nextSibling(): FakeNode | null {
    if (!this.parentNode) {
      return null;
    }

    const index = this.parentNode.childNodes.indexOf(this);
    return index >= 0 ? this.parentNode.childNodes[index + 1] ?? null : null;
  }

  remove(): void {
    if (!this.parentNode) {
      return;
    }

    const index = this.parentNode.childNodes.indexOf(this);

    if (index >= 0) {
      this.parentNode.childNodes.splice(index, 1);
    }

    this.parentNode = null;
  }
}

type FakeParent = FakeElement | FakeDocumentFragment;

class FakeElement extends FakeNode {
  tagName: string;
  listeners = new Map<string, EventListener>();
  attributes = new Map<string, unknown>();
  style: Record<string, unknown> & { cssText?: string } = {};
  className = '';
  childNodes: FakeNode[] = [];
  override parentNode: FakeParent | null = null;

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
    if (node instanceof FakeDocumentFragment) {
      for (const child of [...node.childNodes]) {
        this.appendChild(child);
      }

      node.childNodes = [];
      return node;
    }

    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
    if (node instanceof FakeDocumentFragment) {
      for (const child of [...node.childNodes]) {
        this.insertBefore(child, reference);
      }

      node.childNodes = [];
      return node;
    }

    node.remove();
    node.parentNode = this;

    if (reference == null) {
      this.childNodes.push(node);
      return node;
    }

    const index = this.childNodes.indexOf(reference);

    if (index < 0) {
      this.childNodes.push(node);
      return node;
    }

    this.childNodes.splice(index, 0, node);
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

class FakeDocumentFragment extends FakeNode {
  childNodes: FakeNode[] = [];

  append(...nodes: FakeNode[]): void {
    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  appendChild(node: FakeNode): FakeNode {
    if (node instanceof FakeDocumentFragment) {
      for (const child of [...node.childNodes]) {
        this.appendChild(child);
      }

      node.childNodes = [];
      return node;
    }

    node.remove();
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
    if (node instanceof FakeDocumentFragment) {
      for (const child of [...node.childNodes]) {
        this.insertBefore(child, reference);
      }

      node.childNodes = [];
      return node;
    }

    node.remove();
    node.parentNode = this;

    if (reference == null) {
      this.childNodes.push(node);
      return node;
    }

    const index = this.childNodes.indexOf(reference);

    if (index < 0) {
      this.childNodes.push(node);
      return node;
    }

    this.childNodes.splice(index, 0, node);
    return node;
  }
}

class FakeTextNode extends FakeNode {
  textContent: string;

  constructor(textContent = '') {
    super();
    this.textContent = textContent;
  }
}

class FakeComment extends FakeNode {
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
    createComment(textContent?: string) {
      return new FakeComment(textContent);
    },
    createDocumentFragment() {
      return new FakeDocumentFragment();
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

function withoutDom(run: () => void): void {
  const globalDom = globalThis as unknown as MutableGlobalDom;
  const originalDocument = globalDom.document;
  const originalNode = globalDom.Node;

  globalDom.document = undefined;
  globalDom.Node = undefined;

  try {
    run();
  } finally {
    globalDom.document = originalDocument;
    globalDom.Node = originalNode;
  }
}

test('canUseDOM reflects whether a browser-like document is available', () => {
  withoutDom(() => {
    assert.equal(canUseDOM(), false);
    assert.throws(() => assertCanUseDOM('test runtime'), /test runtime requires a browser-like environment/);
  });

  withFakeDom(() => {
    assert.equal(canUseDOM(), true);
    assert.doesNotThrow(() => assertCanUseDOM('test runtime'));
  });
});

test('DOM APIs fail with a clear message when document is unavailable', () => {
  withoutDom(() => {
    assert.throws(() => h('div', {}, 'hello'), /h\(\) requires a browser-like environment/);
    assert.throws(() => text('hello'), /text\(\) requires a browser-like environment/);
    assert.throws(() => fragment('hello'), /fragment\(\) requires a browser-like environment/);
    assert.throws(() => dynamic(() => 'hello'), /dynamic\(\) requires a browser-like environment/);
    assert.throws(() => show(() => true, () => 'hello'), /dynamic\(\) requires a browser-like environment/);
    assert.throws(() => list(() => ['a'], (item) => item), /dynamic\(\) requires a browser-like environment/);
    assert.throws(
      () => renderResponse(createResponse<string, string>({
        seed: '',
        reduce(value, chunk) {
          return value + chunk;
        }
      })),
      /dynamic\(\) requires a browser-like environment/
    );
    assert.throws(() => mount({} as Element, 'hello'), /mount\(\) requires a browser-like environment/);
    assert.throws(
      () => createApp(() => h('div', {}, 'hello')).mount('#app'),
      /createApp\(\.\.\.\)\.mount\(\.\.\.\) requires a browser-like environment/
    );
  });
});

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

test('list with keys appends new items without rebuilding existing DOM nodes', () => {
  withFakeDom(() => {
    const items = signal([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' }
    ]);
    const root = new FakeElement('div');

    mount(root as unknown as Element, () => list(items, (item) => h('p', { 'data-id': item.id }, item.label), {
      key: (item) => item.id
    }));

    const firstParagraph = root.childNodes[2] as FakeElement;
    const secondParagraph = root.childNodes[5] as FakeElement;

    items.set([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' }
    ]);

    assert.equal(root.childNodes[2], firstParagraph);
    assert.equal(root.childNodes[5], secondParagraph);
    assert.equal((root.childNodes[8] as FakeElement).attributes.get('data-id'), 'c');
  });
});
