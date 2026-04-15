/**
 * Qore Stream Tests
 * 测试流式渲染、Suspense、Lazy Loading 功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  StreamRenderer,
  createStreamHTML,
  createUpdate,
  applyUpdate,
  Suspense,
  lazy,
  asyncComponent,
  setSuspenseState,
  renderToStreamDOM as renderToStream,
  renderToStreamAsync,
  renderToString,
  h,
  div
} from '../src/index';

describe('StreamRenderer', () => {
  let renderer: StreamRenderer;

  beforeEach(() => {
    renderer = new StreamRenderer();
  });

  afterEach(() => {
    renderer = new StreamRenderer();
  });

  it('should write chunks', () => {
    renderer.write('<div>Chunk 1</div>');
    renderer.write('<div>Chunk 2</div>');
    
    expect(renderer.getHTML()).toBe('<div>Chunk 1</div><div>Chunk 2</div>');
  });

  it('should end stream', () => {
    renderer.write('<div>Content</div>');
    renderer.end();
    
    expect(renderer.getHTML()).toBe('<div>Content</div>');
  });

  it('should subscribe to chunks', async () => {
    const chunks: string[] = [];
    
    renderer.subscribe(chunk => {
      chunks.push(chunk);
    });
    
    renderer.write('<div>1</div>');
    renderer.write('<div>2</div>');
    renderer.end();
    
    expect(chunks).toEqual(['<div>1</div>', '<div>2</div>']);
  });

  it('should support async iterator', async () => {
    const { renderer, stream } = createStreamHTML();
    
    renderer.write('<div>A</div>');
    renderer.write('<div>B</div>');
    renderer.end();
    
    const results: string[] = [];
    for await (const chunk of stream()) {
      results.push(chunk);
    }
    
    expect(results).toEqual(['<div>A</div>', '<div>B</div>']);
  });

  it('should fail with error', () => {
    const error = new Error('Test error');
    renderer.fail(error);
    
    expect(() => renderer.getHTML()).not.toThrow();
  });
});

describe('createStreamHTML', () => {
  it('should create stream renderer', () => {
    const { renderer, html, stream } = createStreamHTML();
    
    expect(renderer).toBeInstanceOf(StreamRenderer);
    expect(typeof html).toBe('function');
    expect(typeof stream).toBe('function');
  });

  it('should return HTML', () => {
    const { renderer, html } = createStreamHTML();
    
    renderer.write('<div>Test</div>');
    renderer.end();
    
    expect(html()).toBe('<div>Test</div>');
  });
});

describe('Incremental Updates', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = '<div data-stream-id="item-1">Original</div>';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should create update', () => {
    const update = createUpdate('test-id', '<div>New</div>', 'replace');
    
    expect(update.id).toBe('test-id');
    expect(update.html).toBe('<div>New</div>');
    expect(update.type).toBe('replace');
  });

  it('should apply replace update', () => {
    const update = createUpdate(
      'item-1',
      '<div data-stream-id="item-1">Updated</div>',
      'replace'
    );
    
    applyUpdate(container, update);
    
    expect(container.innerHTML).toContain('Updated');
  });

  it('should apply append update', () => {
    const update = createUpdate(
      'item-1',
      '<span>Appended</span>',
      'append'
    );
    
    applyUpdate(container, update);
    
    expect(container.innerHTML).toContain('Original');
    expect(container.innerHTML).toContain('Appended');
  });

  it('should apply remove update', () => {
    const update = createUpdate('item-1', '', 'remove');
    
    applyUpdate(container, update);
    
    expect(container.innerHTML).toBe('');
  });
});

describe('Suspense', () => {
  it('should render fallback when pending', () => {
    setSuspenseState('pending');
    
    const component = Suspense({
      fallback: div({}, 'Loading...'),
      children: () => div({}, 'Content')
    });
    
    const result = component();
    expect(renderToString(result)).toContain('Loading...');
  });

  it('should render children when resolved', () => {
    setSuspenseState('resolved');
    
    const component = Suspense({
      fallback: div({}, 'Loading...'),
      children: () => div({}, 'Content')
    });
    
    const result = component();
    expect(renderToString(result)).toContain('Content');
  });

  it('should call onError when error', () => {
    const errors: Error[] = [];
    setSuspenseState('error', new Error('Test'));
    
    const component = Suspense({
      fallback: div({}, 'Error'),
      children: () => div({}, 'Content'),
      onError: (err) => errors.push(err)
    });
    
    component();
    expect(errors.length).toBe(1);
  });
});

describe('lazy', () => {
  it('should create lazy factory', () => {
    const lazyFactory = lazy(() => 
      Promise.resolve({ default: () => div({}, 'Lazy') })
    );
    
    expect(typeof lazyFactory).toBe('function');
  });

  it('should load component', async () => {
    const LazyComponent = lazy(() => 
      Promise.resolve({ default: () => div({}, 'Lazy Loaded') })
    );
    
    const { load, component } = LazyComponent();
    expect(component).toBe(null);
    
    const loaded = await load();
    expect(loaded).toBeDefined();
  });
});

describe('asyncComponent', () => {
  it('should render fallback initially', () => {
    const AsyncComp = asyncComponent(
      () => Promise.resolve({ default: () => div({}, 'Async') }),
      div({}, 'Loading')
    );
    
    // Initially should show fallback
    const result = AsyncComp();
    expect(renderToString(result)).toContain('Loading');
  });

  it('should render component after load', async () => {
    const AsyncComp = asyncComponent(
      () => Promise.resolve({ default: () => div({}, 'Async Loaded') }),
      div({}, 'Loading')
    );
    
    // Wait for async load
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const result = AsyncComp();
    expect(renderToString(result)).toContain('Async Loaded');
  });
});

describe('renderToStream (render.ts)', () => {
  it('should render to StreamRenderer', () => {
    const renderer = new StreamRenderer();
    
    const component = () => div({}, 
      h('h1', {}, 'Title'),
      h('p', {}, 'Content')
    );
    
    renderToStream(renderer, component);
    
    const html = renderer.getHTML();
    expect(html).toContain('Title');
    expect(html).toContain('Content');
  });

  it('should render with chunks', () => {
    const renderer = new StreamRenderer();
    const chunks: string[] = [];
    
    const component = () => div({}, 'A'.repeat(2000));
    
    renderToStream(renderer, component, {
      chunkSize: 500,
      onChunk: (chunk) => chunks.push(chunk)
    });
    
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should support abort', () => {
    const renderer = new StreamRenderer();
    
    const component = () => div({}, 'Content');
    
    const { abort } = renderToStream(renderer, component);
    abort();
    
    // Should not throw
    expect(() => abort()).not.toThrow();
  });
});

describe('renderToString', () => {
  it('should render string', () => {
    expect(renderToString('Hello')).toBe('Hello');
  });

  it('should render number', () => {
    expect(renderToString(42)).toBe('42');
  });

  it('should render array', () => {
    expect(renderToString(['A', 'B', 'C'])).toBe('ABC');
  });

  it('should render component', () => {
    const Component = () => div({}, 'Component Content');
    expect(renderToString(Component())).toContain('Component Content');
  });

  it('should render nested components', () => {
    const Child = () => h('span', {}, 'Child');
    const Parent = () => div({}, Child());
    
    expect(renderToString(Parent())).toContain('Child');
  });
});

describe('renderToStreamAsync', () => {
  it('should render async component', async () => {
    const renderer = new StreamRenderer();
    
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return div({}, 'Async Content');
    };
    
    await renderToStreamAsync(renderer, AsyncComponent);
    
    expect(renderer.getHTML()).toContain('Async Content');
  });

  it('should handle errors', async () => {
    const renderer = new StreamRenderer();
    
    const FailingComponent = async () => {
      throw new Error('Render failed');
    };
    
    await renderToStreamAsync(renderer, FailingComponent);
    
    // Should not throw, but mark as failed
    expect(renderer.getHTML()).toBe('');
  });
});

describe('Performance', () => {
  it('should stream 1000 items efficiently', async () => {
    const { renderer } = createStreamHTML();
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      renderer.write(`<div>Item ${i}</div>`);
    }
    
    renderer.end();
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100); // Should be fast
    expect(renderer.getHTML().split('<div>').length).toBe(1001);
  });

  it('should handle large chunks', () => {
    const { renderer } = createStreamHTML();
    
    const largeChunk = '<div>'.repeat(1000) + '</div>'.repeat(1000);
    renderer.write(largeChunk);
    renderer.end();
    
    expect(renderer.getHTML().length).toBeGreaterThan(10000);
  });
});
