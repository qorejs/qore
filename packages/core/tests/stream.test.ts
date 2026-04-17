/**
 * Qore Stream Tests
 * 测试流式渲染、Suspense、Lazy Loading 功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StreamRenderer,
  createStreamHTML,
  createUpdate,
  applyUpdate,
  Suspense,
  createSuspense,
  lazy,
  asyncComponent,
  renderToStreamDOM as renderToStream,
  renderToStreamAsyncDOM as renderToStreamAsync,
  renderToDOMString,
  h,
  div,
  renderStreamToDOM
} from '../src/index';
// SSR 版本的 renderToString（纯字符串实现，带 HTML 转义）
// 注意：renderToString 用于纯字符串/组件渲染，renderToDOMString 用于 DOM Node 渲染
import { renderToString } from '../src/ssr';

// Import parseMarkdownText for direct testing
import { parseMarkdownText } from '../src/stream';

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
    const { component, setState } = createSuspense({
      fallback: div({}, 'Loading...'),
      children: () => div({}, 'Content')
    });
    
    setState('pending');
    const result = component();
    expect(renderToString(result)).toContain('Loading...');
  });

  it('should render children when resolved', () => {
    const { component, setState } = createSuspense({
      fallback: div({}, 'Loading...'),
      children: () => div({}, 'Content')
    });
    
    setState('resolved');
    const result = component();
    expect(renderToString(result)).toContain('Content');
  });

  it('should call onError when error', () => {
    const errors: Error[] = [];
    
    const { component, setState } = createSuspense({
      fallback: div({}, 'Error'),
      children: () => div({}, 'Content'),
      onError: (err) => errors.push(err)
    });
    
    setState('error', new Error('Test'));
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

describe('parseMarkdownText - XSS Protection', () => {
  it('should escape script tags', () => {
    const input = '<script>alert(1)</script>';
    const result = parseMarkdownText(input);
    
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('alert(1)');
  });

  it('should escape event handlers', () => {
    const input = '<img src=x onerror=alert(1)>';
    const result = parseMarkdownText(input);
    
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
    expect(result).toContain('onerror=alert(1)');
  });

  it('should escape HTML entities', () => {
    const input = '5 < 10 && 10 > 5';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('5 &lt; 10 &amp;&amp; 10 &gt; 5');
  });

  it('should escape quotes', () => {
    const input = 'He said "Hello" and \'Goodbye\'';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('&quot;Hello&quot;');
    expect(result).toContain('&#39;Goodbye&#39;');
  });

  it('should parse bold markdown', () => {
    const input = '**bold text**';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('<strong>bold text</strong>');
  });

  it('should parse italic markdown', () => {
    const input = '*italic text*';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('<em>italic text</em>');
  });

  it('should parse headers', () => {
    const input = '# Heading 1\n## Heading 2\n### Heading 3';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('<h1>Heading 1</h1>');
    expect(result).toContain('<h2>Heading 2</h2>');
    expect(result).toContain('<h3>Heading 3</h3>');
  });

  it('should parse inline code', () => {
    const input = 'Use `console.log()` function';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('<code>console.log()</code>');
  });

  it('should NOT parse markdown inside fenced code blocks', () => {
    const input = '```\n**not bold** and *not italic*\n```';
    const result = parseMarkdownText(input);
    
    expect(result).not.toContain('<strong>not bold</strong>');
    expect(result).not.toContain('<em>not italic</em>');
    expect(result).toContain('**not bold**');
    expect(result).toContain('*not italic*');
    expect(result).toContain('<pre><code>');
  });

  it('should NOT parse HTML inside fenced code blocks', () => {
    const input = '```\n<script>alert(1)</script>\n```';
    const result = parseMarkdownText(input);
    
    // Should preserve the script tag as escaped text inside code block
    expect(result).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result).not.toMatch(/<script[^>]*>.*<\/script>/);
  });

  it('should NOT parse markdown inside inline code', () => {
    const input = 'This is `**not bold**` text';
    const result = parseMarkdownText(input);
    
    expect(result).not.toContain('<strong>not bold</strong>');
    expect(result).toContain('<code>**not bold**</code>');
  });

  it('should handle mixed content - XSS in bold', () => {
    const input = '**<script>alert(1)</script>**';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('<strong>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle mixed content - safe markdown with XSS attempt', () => {
    const input = '# Title\n\n**Bold** and <script>evil</script>\n\n```\ncode **not bold**\n```';
    const result = parseMarkdownText(input);
    
    // Headers should work
    expect(result).toContain('<h1>Title</h1>');
    // Bold should work
    expect(result).toContain('<strong>Bold</strong>');
    // XSS should be escaped
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    // Code block content should not be parsed
    expect(result).toContain('**not bold**');
  });

  it('should handle ampersand in markdown', () => {
    const input = '**Tom & Jerry**';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('<strong>Tom &amp; Jerry</strong>');
  });

  it('should handle multiple code blocks', () => {
    const input = 'First `inline` then\n\n```\nfenced\n```\n\nAnother `inline2`';
    const result = parseMarkdownText(input);
    
    expect(result).toContain('<code>inline</code>');
    expect(result).toContain('<pre><code>');
    expect(result).toContain('fenced');
    expect(result).toContain('</code></pre>');
    expect(result).toContain('<code>inline2</code>');
  });

  it('should handle complex XSS payload', () => {
    const input = '<img src="x" onerror="alert(1)"><svg onload=alert(1)><iframe src="javascript:alert(1)">';
    const result = parseMarkdownText(input);
    
    // All HTML tags should be escaped
    expect(result).not.toContain('<img');
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('<iframe');
    // Tags are escaped but text content remains (safe because tags are escaped)
    expect(result).toContain('&lt;img');
    expect(result).toContain('&lt;svg');
    expect(result).toContain('&lt;iframe');
    // Verify no executable HTML can be formed
    expect(result).not.toMatch(/<img[^>]*>/);
    expect(result).not.toMatch(/<svg[^>]*>/);
    expect(result).not.toMatch(/<iframe[^>]*>/);
  });
});

describe('renderStreamToDOM', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should render raw HTML chunks', async () => {
    async function* stream() {
      yield '<div>Chunk 1</div>';
      yield '<div>Chunk 2</div>';
    }

    const { abort } = renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML).toContain('Chunk 1');
    expect(container.innerHTML).toContain('Chunk 2');
  });

  it('should render incremental updates', async () => {
    async function* stream() {
      yield JSON.stringify({ 
        id: 'item-1', 
        html: '<div data-stream-id="item-1">First</div>', 
        type: 'replace' as const 
      });
      yield JSON.stringify({ 
        id: 'item-2', 
        html: '<div data-stream-id="item-2">Second</div>', 
        type: 'replace' as const 
      });
    }

    const { abort } = renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML).toContain('First');
    expect(container.innerHTML).toContain('Second');
  });

  it('should handle mixed chunks', async () => {
    async function* stream() {
      yield '<div>Raw HTML</div>';
      yield JSON.stringify({ 
        id: 'item-1', 
        html: '<span data-stream-id="item-1">Update</span>', 
        type: 'replace' as const 
      });
    }

    const { abort } = renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML).toContain('Raw HTML');
    expect(container.innerHTML).toContain('Update');
  });

  it('should support abort', async () => {
    const chunks: string[] = [];
    
    async function* stream() {
      for (let i = 0; i < 100; i++) {
        chunks.push(`Chunk ${i}`);
        yield `<div>Chunk ${i}</div>`;
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    const { abort } = renderStreamToDOM(container, stream());
    
    // Abort after 20ms
    setTimeout(() => abort(), 20);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should have rendered some chunks but not all
    expect(chunks.length).toBeLessThan(100);
  });

  it('should handle append updates', async () => {
    container.innerHTML = '<div data-stream-id="item-1">Original</div>';
    
    async function* stream() {
      yield JSON.stringify({ 
        id: 'item-1', 
        html: '<span> Appended</span>', 
        type: 'append' as const 
      });
    }

    renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML).toContain('Original');
    expect(container.innerHTML).toContain('Appended');
  });

  it('should handle remove updates', async () => {
    container.innerHTML = '<div data-stream-id="item-1">To Remove</div>';
    
    async function* stream() {
      yield JSON.stringify({ 
        id: 'item-1', 
        html: '', 
        type: 'remove' as const 
      });
    }

    renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML).toBe('');
  });

  it('should handle prepend updates', async () => {
    container.innerHTML = '<div data-stream-id="item-1">Original</div>';
    
    async function* stream() {
      yield JSON.stringify({ 
        id: 'item-1', 
        html: '<span>Prepended </span>', 
        type: 'prepend' as const 
      });
    }

    renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML).toContain('Prepended');
    expect(container.innerHTML).toContain('Original');
  });

  it('should handle malformed JSON gracefully', async () => {
    async function* stream() {
      yield 'not valid json';
      yield '<div>Valid HTML</div>';
    }

    renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Should render as raw HTML
    expect(container.innerHTML).toContain('not valid json');
    expect(container.innerHTML).toContain('Valid HTML');
  });

  it('should handle stream errors gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    async function* stream() {
      yield '<div>Good chunk</div>';
      throw new Error('Stream error');
    }

    renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML).toContain('Good chunk');
    expect(errorSpy).toHaveBeenCalled();
    
    errorSpy.mockRestore();
  });
});

describe('renderStreamToDOM - Performance', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should efficiently render 100 chunks', async () => {
    async function* stream() {
      for (let i = 0; i < 100; i++) {
        yield `<div>Item ${i}</div>`;
      }
    }

    const startTime = performance.now();
    renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 100));
    const endTime = performance.now();
    
    expect(container.children.length).toBe(100);
    expect(endTime - startTime).toBeLessThan(500);
  });

  it('should handle large HTML chunks', async () => {
    const largeHTML = '<div>'.repeat(100) + '</div>'.repeat(100);
    
    async function* stream() {
      yield largeHTML;
    }

    renderStreamToDOM(container, stream());
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(container.innerHTML.length).toBeGreaterThan(1000);
  });
});
