/**
 * Qore SSR - Server-Side Rendering
 * Complete SSR support with streaming, suspense, and data prefetching
 */

import { StreamRenderer } from './stream';
import type { VNode, Component } from './render';

// HTML escaping
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert VNode to HTML string (SSR)
 */
export function renderToString(vnode: VNode): string {
  if (vnode == null || vnode === false) return '';
  
  if (typeof vnode === 'string') {
    return escapeHtml(vnode);
  }
  
  if (typeof vnode === 'number') {
    return String(vnode);
  }
  
  if (Array.isArray(vnode)) {
    return vnode.map(v => renderToString(v)).join('');
  }
  
  if (typeof vnode === 'function') {
    // Component function
    try {
      const result = vnode();
      return renderToString(result);
    } catch (err) {
      console.error('Component render error:', err);
      return '<!-- Error -->';
    }
  }
  
  // Already a rendered node (shouldn't happen in SSR)
  return '';
}

/**
 * Render component to HTML string (SSR)
 */
export function renderComponentToString(component: Component): string {
  return renderToString(component());
}

/**
 * Render props object to HTML attributes string
 */
export function renderProps(props: Record<string, any> | null): string {
  if (!props) return '';
  
  const attrs: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || value == null) continue;
    
    if (key.startsWith('on')) continue; // Skip event handlers
    
    if (key === 'className') {
      attrs.push(`class="${escapeHtml(String(value))}"`);
    } else if (key === 'style' && typeof value === 'object') {
      const styleStr = Object.entries(value)
        .map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}: ${v}`)
        .join('; ');
      attrs.push(`style="${escapeHtml(styleStr)}"`);
    } else if (typeof value !== 'function') {
      attrs.push(`${key}="${escapeHtml(String(value))}"`);
    }
  }
  
  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

/**
 * Create HTML element string
 */
export function renderElement(
  type: string,
  props: Record<string, any> | null,
  children: VNode[]
): string {
  const propsStr = renderProps(props);
  const childrenStr = children.map(c => renderToString(c)).join('');
  
  // Self-closing tags
  const selfClosing = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
  
  if (selfClosing.includes(type)) {
    return `<${type}${propsStr} />`;
  }
  
  return `<${type}${propsStr}>${childrenStr}</${type}>`;
}

/**
 * StreamRenderer for SSR - renders to a stream
 */
export function renderToStream(
  component: Component,
  options?: {
    chunkSize?: number;
    onChunk?: (chunk: string) => void;
  }
): {
  renderer: StreamRenderer;
  promise: Promise<void>;
  abort: () => void;
} {
  const { chunkSize = 1000, onChunk } = options || {};
  const renderer = new StreamRenderer();
  let aborted = false;
  
  const promise = Promise.resolve().then(() => {
    if (aborted) return;
    
    const vnode = component();
    const html = renderToString(vnode);
    
    if (html.length <= chunkSize) {
      renderer.write(html);
      onChunk?.(html);
    } else {
      // Chunk large content
      for (let i = 0; i < html.length; i += chunkSize) {
        if (aborted) break;
        const chunk = html.slice(i, i + chunkSize);
        renderer.write(chunk);
        onChunk?.(chunk);
      }
    }
    
    renderer.end();
  });
  
  return {
    renderer,
    promise,
    abort: () => { aborted = true; }
  };
}

/**
 * Async VNode rendering - supports Promise-based components
 */
export async function renderAsync(vnode: VNode | Promise<VNode>): Promise<string> {
  const resolved = await vnode;
  
  if (resolved == null || resolved === false) return '';
  
  if (typeof resolved === 'string') {
    return escapeHtml(resolved);
  }
  
  if (typeof resolved === 'number') {
    return String(resolved);
  }
  
  if (Array.isArray(resolved)) {
    const results = await Promise.all(resolved.map(v => renderAsync(v)));
    return results.join('');
  }
  
  if (typeof resolved === 'function') {
    try {
      const result = await resolved();
      return renderAsync(result);
    } catch (err) {
      console.error('Async component error:', err);
      return '<!-- Async Error -->';
    }
  }
  
  return '';
}

/**
 * Async stream rendering - supports async components with streaming output
 */
export async function renderToStreamAsync(
  component: Component,
  renderer: StreamRenderer,
  options?: {
    onChunk?: (chunk: string) => void;
  }
): Promise<void> {
  const { onChunk } = options || {};
  
  try {
    const vnode = await Promise.resolve(component());
    const html = await renderAsync(vnode);
    renderer.write(html);
    onChunk?.(html);
    renderer.end();
  } catch (err) {
    console.error('Async stream render error:', err);
    renderer.fail(err as Error);
  }
}

/**
 * Data prefetching context
 */
export interface PrefetchContext {
  promises: Promise<any>[];
  errors: Error[];
  add: (promise: Promise<any>) => void;
  waitAll: () => Promise<void>;
}

/**
 * Create prefetch context
 */
export function createPrefetchContext(): PrefetchContext {
  const promises: Promise<any>[] = [];
  const errors: Error[] = [];
  
  return {
    promises,
    errors,
    add: (promise: Promise<any>) => {
      promises.push(
        promise.catch((err: Error) => {
          errors.push(err);
          return null;
        })
      );
    },
    waitAll: async () => {
      await Promise.all(promises);
    }
  };
}

/**
 * Prefetch data before rendering
 * Returns a component that can be rendered after data is loaded
 */
export async function prefetchAndRender<T>(
  prefetchFn: () => Promise<T>,
  renderFn: (data: T) => Component
): Promise<string> {
  const ctx = createPrefetchContext();
  ctx.add(prefetchFn());
  await ctx.waitAll();
  
  if (ctx.errors.length > 0) {
    console.error('Prefetch errors:', ctx.errors);
    return '<!-- Prefetch Error -->';
  }
  
  // Get the data from the first promise
  const data = await ctx.promises[0];
  const component = renderFn(data);
  return renderToString(component());
}

/**
 * Suspense boundary for SSR
 * Waits for async components to resolve
 */
export async function renderWithSuspense(
  component: Component,
  options?: {
    fallback?: string;
    timeoutMs?: number;
  }
): Promise<string> {
  const { fallback = '<!-- Loading -->', timeoutMs = 30000 } = options || {};
  
  const timeout = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('SSR timeout')), timeoutMs);
  });
  
  const render = Promise.resolve().then(() => {
    try {
      return renderToString(component());
    } catch (err) {
      console.error('Suspense render error:', err);
      return fallback;
    }
  });
  
  try {
    return await Promise.race([render, timeout]);
  } catch (err) {
    console.error('Suspense timeout:', err);
    return fallback;
  }
}

/**
 * Complete SSR render with all features
 */
export interface SSRResult {
  html: string;
  state?: string; // Hydration state
  errors: Error[];
}

export async function renderSSR(
  component: Component,
  options?: {
    includeState?: boolean;
    state?: any;
    timeoutMs?: number;
  }
): Promise<SSRResult> {
  const { includeState = false, state, timeoutMs } = options || {};
  const errors: Error[] = [];
  
  let html: string;
  try {
    html = await renderWithSuspense(component, { timeoutMs });
  } catch (err) {
    errors.push(err as Error);
    html = '<!-- SSR Error -->';
  }
  
  const result: SSRResult = {
    html,
    errors
  };
  
  if (includeState && state) {
    result.state = `<script>window.__QORE_STATE__ = ${JSON.stringify(state)}</script>`;
  }
  
  return result;
}
