// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import { h, mount, signal } from '../src/index.js';

class FakeNode {}

class FakeElement extends FakeNode {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.listeners = new Map();
    this.attributes = new Map();
    this.style = {};
    this.className = '';
    this.childNodes = [];
    this.parentNode = null;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  removeEventListener(type, handler) {
    if (this.listeners.get(type) === handler) {
      this.listeners.delete(type);
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(node) {
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  replaceChildren(...nodes) {
    for (const child of this.childNodes) {
      child.parentNode = null;
    }

    this.childNodes = [];

    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  dispatch(type, event) {
    const handler = this.listeners.get(type);

    if (handler) {
      handler(event);
    }
  }
}

class FakeTextNode extends FakeNode {
  constructor(textContent = '') {
    super();
    this.textContent = textContent;
    this.parentNode = null;
  }
}

function withFakeDom(run) {
  const originalDocument = globalThis.document;
  const originalNode = globalThis.Node;

  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    createTextNode(textContent) {
      return new FakeTextNode(textContent);
    }
  };

  try {
    return run();
  } finally {
    globalThis.document = originalDocument;
    globalThis.Node = originalNode;
  }
}

test('plain event handlers are registered without being invoked during render', () => {
  let seen = null;

  withFakeDom(() => {
    const input = h('input', {
      oninput: (event) => {
        seen = event.target.value;
      }
    });

    assert.equal(seen, null);

    input.dispatch('input', { target: { value: 'Qore' } });
    assert.equal(seen, 'Qore');
  });
});

test('signal-based event handlers can still swap reactively', () => {
  const calls = [];

  withFakeDom(() => {
    const handler = signal(null);
    const button = h('button', { onclick: handler });

    button.dispatch('click', { type: 'click' });
    assert.deepEqual(calls, []);

    handler.set((event) => {
      calls.push(`first:${event.type}`);
    });

    button.dispatch('click', { type: 'click' });

    handler.set((event) => {
      calls.push(`second:${event.type}`);
    });

    button.dispatch('click', { type: 'click' });

    assert.deepEqual(calls, ['first:click', 'second:click']);
  });
});

// Mounted scopes should tear down reactive event bindings when the tree is disposed.
test('mount disposes reactive event handlers when the subtree is torn down', () => {
  const calls = [];

  withFakeDom(() => {
    const root = new FakeElement('div');
    const handler = signal((event) => {
      calls.push(`first:${event.type}`);
    });
    const dispose = mount(root, () => h('button', { onclick: handler }));
    const button = root.childNodes[0];

    button.dispatch('click', { type: 'click' });
    assert.deepEqual(calls, ['first:click']);

    dispose();
    assert.equal(root.childNodes.length, 0);

    button.dispatch('click', { type: 'click' });
    handler.set((event) => {
      calls.push(`second:${event.type}`);
    });
    button.dispatch('click', { type: 'click' });

    assert.deepEqual(calls, ['first:click']);
  });
});

// Ref callbacks should work with signals so callers can capture elements declaratively.
test('ref can hydrate a signal with the created element', () => {
  withFakeDom(() => {
    const ref = signal(null);
    const input = h('input', { ref });

    assert.equal(ref(), input);
  });
});
