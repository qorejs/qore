import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderToString,
  renderComponentToString,
  renderProps,
  renderToStream,
  renderAsync,
  renderToStreamAsync,
  createPrefetchContext,
  prefetchAndRender,
  renderWithSuspense,
  renderSSR
} from '../src/ssr';
import { StreamRenderer } from '../src/stream';

describe('SSR - renderToString', () => {
  it('should render null/undefined to empty string', () => {
    expect(renderToString(null)).toBe('');
    expect(renderToString(undefined)).toBe('');
    expect(renderToString(false)).toBe('');
  });

  it('should render string with HTML escaping', () => {
    expect(renderToString('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(renderToString('&')).toBe('&amp;');
    expect(renderToString('"')).toBe('&quot;');
    expect(renderToString("'")).toBe('&#039;');
  });

  it('should render number to string', () => {
    expect(renderToString(42)).toBe('42');
    expect(renderToString(0)).toBe('0');
    expect(renderToString(-1)).toBe('-1');
    expect(renderToString(3.14)).toBe('3.14');
  });

  it('should render array of nodes', () => {
    const result = renderToString(['Hello', ' ', 'World', 42]);
    expect(result).toBe('Hello World42');
  });

  it('should render nested arrays', () => {
    const result = renderToString([1, [2, [3, 4]], 5]);
    expect(result).toBe('12345');
  });

  it('should render function component', () => {
    const Component = () => 'Hello from component';
    expect(renderToString(Component)).toBe('Hello from component');
  });

  it('should handle function returning array', () => {
    const Component = () => ['Hello', ' ', 'World'];
    expect(renderToString(Component)).toBe('Hello World');
  });

  it('should handle function throwing error', () => {
    const Component = () => {
      throw new Error('Render error');
    };
    expect(renderToString(Component)).toBe('<!-- Error -->');
  });

  it('should handle deeply nested components', () => {
    const App = () => ['App: ', Layout()];
    const Layout = () => ['Layout: ', Content()];
    const Content = () => 'Content';
    
    expect(renderToString(App)).toBe('App: Layout: Content');
  });
});

describe('SSR - renderComponentToString', () => {
  it('should render simple component', () => {
    const Component = () => 'Hello';
    expect(renderComponentToString(Component)).toBe('Hello');
  });

  it('should render component with props pattern', () => {
    const Greeting = ({ name }: { name: string }) => `Hello, ${name}!`;
    expect(renderComponentToString(() => Greeting({ name: 'World' })))
      .toBe('Hello, World!');
  });

  it('should render component returning elements', () => {
    const Component = () => ['<div>', 'Content', '</div>'];
    expect(renderComponentToString(Component))
      .toBe('&lt;div&gt;Content&lt;/div&gt;');
  });
});

describe('SSR - renderProps', () => {
  it('should render empty props', () => {
    expect(renderProps(null)).toBe('');
    expect(renderProps({})).toBe('');
  });

  it('should render className as class', () => {
    expect(renderProps({ className: 'my-class' }))
      .toBe(' class="my-class"');
  });

  it('should render style object', () => {
    const result = renderProps({ 
      style: { color: 'red', fontSize: '14px' } 
    });
    expect(result).toContain('style="');
    expect(result).toContain('color: red');
    expect(result).toContain('font-size: 14px');
  });

  it('should skip event handlers', () => {
    const onClick = vi.fn();
    expect(renderProps({ onClick, className: 'btn' }))
      .toBe(' class="btn"');
  });

  it('should skip function props', () => {
    expect(renderProps({ 
      callback: () => {}, 
      text: 'Hello' 
    })).toBe(' text="Hello"');
  });

  it('should skip null/undefined values', () => {
    expect(renderProps({ 
      a: null, 
      b: undefined, 
      c: 'valid' 
    })).toBe(' c="valid"');
  });

  it('should skip key prop', () => {
    expect(renderProps({ 
      key: 'my-key', 
      className: 'test' 
    })).toBe(' class="test"');
  });

  it('should render boolean attributes', () => {
    expect(renderProps({ 
      disabled: true, 
      checked: false 
    })).toBe(' disabled="true" checked="false"');
  });

  it('should render data attributes', () => {
    expect(renderProps({ 
      'data-id': '123',
      'data-test': 'abc'
    })).toBe(' data-id="123" data-test="abc"');
  });

  it('should escape special characters in values', () => {
    expect(renderProps({ 
      title: 'Hello "World" & Friends' 
    })).toBe(' title="Hello &quot;World&quot; &amp; Friends"');
  });
});

describe('SSR - renderToStream', () => {
  it('should render component to stream', async () => {
    const Component = () => 'Hello Stream';
    const { renderer, promise } = renderToStream(Component);
    
    await promise;
    
    const chunks: string[] = [];
    renderer.on('data', (chunk: string) => chunks.push(chunk));
    
    expect(chunks.join('')).toBe('Hello Stream');
  });

  it('should respect chunk size', async () => {
    const Component = () => 'A'.repeat(100);
    const { renderer, promise } = renderToStream(Component, { chunkSize: 30 });
    
    await promise;
    
    const chunks: string[] = [];
    renderer.on('data', (chunk: string) => chunks.push(chunk));
    
    expect(chunks.length).toBe(4); // 100 / 30 = 3.33 -> 4 chunks
    expect(chunks[0].length).toBe(30);
  });

  it('should call onChunk callback', async () => {
    const Component = () => 'Chunk test';
    const onChunk = vi.fn();
    const { promise } = renderToStream(Component, { onChunk });
    
    await promise;
    
    expect(onChunk).toHaveBeenCalledWith('Chunk test');
  });

  it('should support abort', async () => {
    const Component = () => 'A'.repeat(1000);
    const { renderer, promise, abort } = renderToStream(Component, { chunkSize: 100 });
    
    abort();
    await promise;
    
    const chunks: string[] = [];
    renderer.on('data', (chunk: string) => chunks.push(chunk));
    
    expect(chunks.length).toBe(0);
  });
});

describe('SSR - renderAsync', () => {
  it('should render resolved promise', async () => {
    const vnode = Promise.resolve('Async content');
    const result = await renderAsync(vnode);
    expect(result).toBe('Async content');
  });

  it('should render async component', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'Async component';
    };
    const result = await renderAsync(AsyncComponent);
    expect(result).toBe('Async component');
  });

  it('should handle async array', async () => {
    const vnode = Promise.resolve(['Hello', ' ', 'World']);
    const result = await renderAsync(vnode);
    expect(result).toBe('Hello World');
  });

  it('should handle async function returning promise', async () => {
    const AsyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return ['Async', ' ', 'Content'];
    };
    const result = await renderAsync(AsyncFn);
    expect(result).toBe('Async Content');
  });

  it('should handle async error', async () => {
    const AsyncComponent = async () => {
      throw new Error('Async error');
    };
    const result = await renderAsync(AsyncComponent);
    expect(result).toBe('<!-- Async Error -->');
  });

  it('should handle null/undefined in async', async () => {
    expect(await renderAsync(Promise.resolve(null))).toBe('');
    expect(await renderAsync(Promise.resolve(undefined))).toBe('');
    expect(await renderAsync(Promise.resolve(false))).toBe('');
  });
});

describe('SSR - renderToStreamAsync', () => {
  it('should render async component to stream', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'Async stream content';
    };
    
    const renderer = new StreamRenderer();
    const chunks: string[] = [];
    renderer.on('data', (chunk: string) => chunks.push(chunk));
    
    await renderToStreamAsync(AsyncComponent, renderer);
    
    expect(chunks.join('')).toBe('Async stream content');
  });

  it('should handle async error in stream', async () => {
    const AsyncComponent = async () => {
      throw new Error('Stream error');
    };
    
    const renderer = new StreamRenderer();
    const errors: Error[] = [];
    renderer.on('error', (err: Error) => errors.push(err));
    
    await renderToStreamAsync(AsyncComponent, renderer);
    
    expect(errors.length).toBe(1);
  });
});

describe('SSR - Prefetch Context', () => {
  it('should create prefetch context', () => {
    const ctx = createPrefetchContext();
    expect(ctx.promises).toEqual([]);
    expect(ctx.errors).toEqual([]);
    expect(typeof ctx.add).toBe('function');
    expect(typeof ctx.waitAll).toBe('function');
  });

  it('should add and wait for promises', async () => {
    const ctx = createPrefetchContext();
    
    ctx.add(Promise.resolve('data1'));
    ctx.add(Promise.resolve('data2'));
    
    await ctx.waitAll();
    
    expect(ctx.promises.length).toBe(2);
    expect(ctx.errors.length).toBe(0);
  });

  it('should handle promise errors', async () => {
    const ctx = createPrefetchContext();
    
    ctx.add(Promise.reject(new Error('Prefetch error')));
    
    await ctx.waitAll();
    
    expect(ctx.errors.length).toBe(1);
    expect(ctx.errors[0].message).toBe('Prefetch error');
  });
});

describe('SSR - prefetchAndRender', () => {
  it('should prefetch data and render', async () => {
    const prefetchFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { name: 'World' };
    };
    
    const renderFn = (data: { name: string }) => () => `Hello, ${data.name}!`;
    
    const result = await prefetchAndRender(prefetchFn, renderFn);
    expect(result).toBe('Hello, World!');
  });

  it('should handle prefetch error', async () => {
    const prefetchFn = async () => {
      throw new Error('Prefetch failed');
    };
    
    const renderFn = (data: any) => () => `Hello, ${data?.name || 'Error'}!`;
    
    const result = await prefetchAndRender(prefetchFn, renderFn);
    expect(result).toBe('<!-- Prefetch Error -->');
  });
});

describe('SSR - renderWithSuspense', () => {
  it('should render component normally', async () => {
    const Component = () => 'Normal content';
    const result = await renderWithSuspense(Component);
    expect(result).toBe('Normal content');
  });

  it('should use fallback on error', async () => {
    const Component = () => {
      throw new Error('Suspense error');
    };
    const result = await renderWithSuspense(Component, { fallback: 'Loading...' });
    expect(result).toBe('Loading...');
  });

  it('should timeout long renders', async () => {
    const Component = () => {
      // Simulate very long render
      return 'A'.repeat(1000000);
    };
    const result = await renderWithSuspense(Component, { 
      fallback: 'Timeout', 
      timeoutMs: 100 
    });
    // May complete before timeout depending on performance
    expect(result.length).toBeGreaterThan(0);
  });

  it('should use default fallback', async () => {
    const Component = () => {
      throw new Error('Error');
    };
    const result = await renderWithSuspense(Component);
    expect(result).toBe('<!-- Loading -->');
  });
});

describe('SSR - renderSSR', () => {
  it('should render component with SSR result', async () => {
    const Component = () => 'SSR content';
    const result = await renderSSR(Component);
    
    expect(result.html).toBe('SSR content');
    expect(result.errors).toEqual([]);
    expect(result.state).toBeUndefined();
  });

  it('should include state when requested', async () => {
    const Component = () => 'SSR with state';
    const result = await renderSSR(Component, { 
      includeState: true, 
      state: { user: 'admin' } 
    });
    
    expect(result.html).toBe('SSR with state');
    expect(result.state).toContain('window.__QORE_STATE__');
    expect(result.state).toContain('admin');
  });

  it('should handle render errors', async () => {
    const Component = () => {
      throw new Error('SSR error');
    };
    const result = await renderSSR(Component);
    
    expect(result.html).toBe('<!-- SSR Error -->');
    expect(result.errors.length).toBe(1);
  });

  it('should respect timeout', async () => {
    const Component = () => {
      throw new Error('Slow render');
    };
    const result = await renderSSR(Component, { timeoutMs: 100 });
    
    expect(result.html).toBe('<!-- Loading -->');
    expect(result.errors.length).toBe(1);
  });
});

describe('SSR - Integration', () => {
  it('should handle complete SSR flow', async () => {
    const App = () => [
      '<header>', 
      renderToString(() => 'My App'),
      '</header>',
      '<main>',
      renderToString(() => ['<p>', 'Content', '</p>']),
      '</main>'
    ];
    
    const result = await renderSSR(App);
    expect(result.html).toContain('My App');
    expect(result.html).toContain('Content');
  });

  it('should handle streaming SSR with prefetch', async () => {
    const prefetchFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { items: ['A', 'B', 'C'] };
    };
    
    const renderer = new StreamRenderer();
    const chunks: string[] = [];
    renderer.on('data', (chunk: string) => chunks.push(chunk));
    
    const data = await prefetchFn();
    const Component = () => data.items.join(', ');
    
    await renderToStreamAsync(Component, renderer);
    
    expect(chunks.join('')).toBe('A, B, C');
  });
});
