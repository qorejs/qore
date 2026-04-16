/**
 * Qore SSR - Server-Side Rendering (separate entry point)
 * Import via: import { ... } from '@qorejs/qore/ssr'
 */

import { StreamRenderer } from './stream';
import type { VNode, Component } from './render';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function renderToString(vnode: VNode): string {
  if (vnode == null || vnode === false) return '';
  if (typeof vnode === 'string') return escapeHtml(vnode);
  if (typeof vnode === 'number') return String(vnode);
  if (Array.isArray(vnode)) return vnode.map(v => renderToString(v)).join('');
  if (typeof vnode === 'function') {
    try { return renderToString(vnode()); }
    catch { return '<!-- Error -->'; }
  }
  return '';
}

export function renderComponentToString(component: Component): string {
  return renderToString(component());
}

export function renderProps(props: Record<string, any> | null): string {
  if (!props) return '';
  const attrs: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || value == null || key.startsWith('on') || typeof value === 'function') continue;
    if (key === 'className') attrs.push(`class="${escapeHtml(String(value))}"`);
    else if (key === 'style' && typeof value === 'object') {
      const styleStr = Object.entries(value).map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}: ${v}`).join('; ');
      attrs.push(`style="${escapeHtml(styleStr)}"`);
    } else {
      attrs.push(`${key}="${escapeHtml(String(value))}"`);
    }
  }
  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

export function renderToStream(
  component: Component,
  options?: { chunkSize?: number; onChunk?: (chunk: string) => void }
): { renderer: StreamRenderer; promise: Promise<void>; abort: () => void } {
  const { chunkSize = 1000, onChunk } = options || {};
  const renderer = new StreamRenderer();
  let aborted = false;
  
  const promise = Promise.resolve().then(() => {
    if (aborted) return;
    const html = renderToString(component());
    if (html.length <= chunkSize) {
      renderer.write(html);
      onChunk?.(html);
    } else {
      for (let i = 0; i < html.length; i += chunkSize) {
        if (aborted) break;
        const chunk = html.slice(i, i + chunkSize);
        renderer.write(chunk);
        onChunk?.(chunk);
      }
    }
    renderer.end();
  });
  
  return { renderer, promise, abort: () => { aborted = true; } };
}

export async function renderAsync(vnode: VNode | Promise<VNode>): Promise<string> {
  const resolved = await vnode;
  if (resolved == null || resolved === false) return '';
  if (typeof resolved === 'string') return escapeHtml(resolved);
  if (typeof resolved === 'number') return String(resolved);
  if (Array.isArray(resolved)) {
    const results = await Promise.all(resolved.map(v => renderAsync(v)));
    return results.join('');
  }
  if (typeof resolved === 'function') {
    try {
      const result = await resolved();
      return renderAsync(result);
    } catch { return '<!-- Async Error -->'; }
  }
  return '';
}

export async function renderToStreamAsync(
  component: Component,
  renderer: StreamRenderer,
  options?: { onChunk?: (chunk: string) => void }
): Promise<void> {
  try {
    const vnode = await Promise.resolve(component());
    const html = await renderAsync(vnode);
    renderer.write(html);
    options?.onChunk?.(html);
    renderer.end();
  } catch {
    renderer.fail(new Error('Render failed'));
  }
}

export interface PrefetchContext {
  promises: Promise<any>[];
  errors: Error[];
  add: (promise: Promise<any>) => void;
  waitAll: () => Promise<void>;
}

export function createPrefetchContext(): PrefetchContext {
  const promises: Promise<any>[] = [];
  const errors: Error[] = [];
  
  return {
    promises, errors,
    add: (promise: Promise<any>) => {
      promises.push(promise.catch((err: Error) => { errors.push(err); return null; }));
    },
    waitAll: async () => { await Promise.all(promises); }
  };
}

export async function prefetchAndRender<T>(
  prefetchFn: () => Promise<T>,
  renderFn: (data: T) => Component
): Promise<string> {
  const ctx = createPrefetchContext();
  ctx.add(prefetchFn());
  await ctx.waitAll();
  if (ctx.errors.length > 0) return '<!-- Prefetch Error -->';
  const data = await ctx.promises[0];
  return renderToString(renderFn(data)());
}

export async function renderWithSuspense(
  component: Component,
  options?: { fallback?: string; timeoutMs?: number }
): Promise<string> {
  const { fallback = '<!-- Loading -->', timeoutMs = 30000 } = options || {};
  const timeout = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('SSR timeout')), timeoutMs);
  });
  const render = Promise.resolve().then(() => {
    try { return renderToString(component()); }
    catch { return fallback; }
  });
  try { return await Promise.race([render, timeout]); }
  catch { return fallback; }
}

export interface SSRResult {
  html: string;
  state?: string;
  errors: Error[];
}

export async function renderSSR(
  component: Component,
  options?: { includeState?: boolean; state?: any; timeoutMs?: number }
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
  const result: SSRResult = { html, errors };
  if (includeState && state) {
    result.state = `<script>window.__QORE_STATE__ = ${JSON.stringify(state)}</script>`;
  }
  return result;
}
