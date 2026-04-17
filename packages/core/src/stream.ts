/**
 * Qore Stream - AI Streaming & Server-Side Streaming
 * Import via: import { ... } from '@qorejs/qore/stream'
 */

import { signal } from './signal';
import type { VNode } from './render';

export interface StreamWriter {
  (chunk: string): void;
  clear(): void;
  done(): void;
}

export interface StreamOptions {
  container: HTMLElement;
  parseMarkdown?: boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export type Component = () => VNode;
export type SuspenseState = 'pending' | 'resolved' | 'error';

export interface SuspenseProps {
  fallback: VNode;
  children: () => VNode;
  onError?: (error: Error) => void;
}

/**
 * AI streaming response (client-side)
 */
export function stream(
  fn: (write: StreamWriter) => Promise<void>,
  options: StreamOptions
): { abort: () => void } {
  const { container, parseMarkdown = false, onComplete, onError } = options;
  let aborted = false;
  let content = '';
  
  container.innerHTML = '';
  const output = document.createElement('div');
  output.className = 'stream-output';
  container.appendChild(output);
  
  const update = () => {
    output.innerHTML = parseMarkdown ? parseMarkdownText(content) : content;
  };
  
  const write: StreamWriter = (chunk: string) => {
    if (aborted) return;
    content += chunk;
    update();
  };
  
  write.clear = () => { content = ''; update(); };
  write.done = () => { if (!aborted) onComplete?.(); };
  
  Promise.resolve().then(() => fn(write)).catch((err: Error) => { if (!aborted) onError?.(err); });
  
  return { abort: () => { aborted = true; } };
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parse markdown text with XSS protection
 * 1. First escape HTML special characters
 * 2. Extract and protect code blocks (fenced and inline)
 * 3. Parse markdown syntax
 * 4. Restore code block content
 */
export function parseMarkdownText(text: string): string {
  // First, escape all HTML special characters to prevent XSS
  let escaped = escapeHTML(text);
  
  // Extract fenced code blocks (```) and replace with placeholders
  const fencedCodeBlocks: string[] = [];
  escaped = escaped.replace(/```([\s\S]*?)```/g, (match, code) => {
    const index = fencedCodeBlocks.length;
    fencedCodeBlocks.push(code);
    return `__FENCED_CODE_${index}__`;
  });
  
  // Extract inline code blocks (`) and replace with placeholders
  const inlineCodeBlocks: string[] = [];
  escaped = escaped.replace(/`([^`]+)`/g, (match, code) => {
    const index = inlineCodeBlocks.length;
    inlineCodeBlocks.push(code);
    return `__INLINE_CODE_${index}__`;
  });
  
  // Now parse markdown syntax on the escaped, code-protected text
  let result = escaped
    // Headers (must process h3 before h2 before h1)
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>');
  
  // Restore inline code blocks (with proper <code> tags)
  result = result.replace(/__INLINE_CODE_(\d+)__/g, (match, index) => {
    return `<code>${inlineCodeBlocks[parseInt(index)]}</code>`;
  });
  
  // Restore fenced code blocks (with proper <pre><code> tags)
  result = result.replace(/__FENCED_CODE_(\d+)__/g, (match, index) => {
    return `<pre><code>${fencedCodeBlocks[parseInt(index)]}</code></pre>`;
  });
  
  return result;
}

export function streamText(
  text: string,
  options: { container: HTMLElement; speed?: number; onComplete?: () => void }
): { abort: () => void } {
  const { container, speed = 30, onComplete } = options;
  return stream(async (write) => {
    for (let i = 0; i < text.length; i++) {
      await new Promise(r => setTimeout(r, speed));
      write(text[i]);
    }
    write.done();
  }, { container, onComplete });
}

/**
 * Server-side stream renderer
 */
export class StreamRenderer {
  private chunks: string[] = [];
  private callbacks: ((chunk: string) => void)[] = [];
  private resolved = false;
  private error: Error | null = null;

  write(chunk: string): void {
    this.chunks.push(chunk);
    this.callbacks.forEach(cb => cb(chunk));
  }

  end(): void {
    this.resolved = true;
  }

  fail(err: Error): void {
    this.error = err;
    this.resolved = true;
  }

  subscribe(callback: (chunk: string) => void): () => void {
    this.callbacks.push(callback);
    this.chunks.forEach(chunk => callback(chunk));
    return () => {
      const idx = this.callbacks.indexOf(callback);
      if (idx !== -1) this.callbacks.splice(idx, 1);
    };
  }

  getHTML(): string {
    return this.chunks.join('');
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<string, void, unknown> {
    let index = 0;
    while (index < this.chunks.length || !this.resolved) {
      if (index < this.chunks.length) yield this.chunks[index++];
      else {
        await new Promise(resolve => {
          const check = () => {
            if (index < this.chunks.length || this.resolved) resolve(undefined);
            else setTimeout(check, 10);
          };
          check();
        });
      }
    }
    if (this.error) throw this.error;
  }
}

export function createStreamHTML(): {
  renderer: StreamRenderer;
  html: () => string;
  stream: () => AsyncGenerator<string>;
} {
  const renderer = new StreamRenderer();
  return { renderer, html: () => renderer.getHTML(), stream: () => renderer[Symbol.asyncIterator]() };
}

/**
 * Suspense boundary component
 */
export function Suspense({ fallback, children, onError }: SuspenseProps): Component {
  const state = signal<SuspenseState>('pending');
  const errorSig = signal<Error | null>(null);
  return () => {
    const s = state();
    if (s === 'error') { onError?.(errorSig()); return fallback; }
    if (s === 'pending') return fallback;
    return children();
  };
}

export function createSuspense({ fallback, children, onError }: SuspenseProps): {
  component: Component;
  setState: (state: SuspenseState, error?: Error) => void;
  getState: () => SuspenseState;
} {
  const state = signal<SuspenseState>('pending');
  const errorSig = signal<Error | null>(null);
  const component: Component = () => {
    const s = state();
    if (s === 'error') { onError?.(errorSig()); return fallback; }
    if (s === 'pending') return fallback;
    return children();
  };
  return {
    component,
    setState: (newState: SuspenseState, error?: Error) => { state(newState); if (error) errorSig(error); },
    getState: () => state()
  };
}

export function lazy<T extends Component>(
  importFn: () => Promise<{ default: T }>
): () => { load: () => Promise<T>; component: T | null } {
  let loadedComponent: T | null = null;
  let loadPromise: Promise<T> | null = null;
  const load = async (): Promise<T> => {
    if (loadedComponent) return loadedComponent;
    if (loadPromise) return loadPromise;
    loadPromise = importFn().then(mod => { loadedComponent = mod.default; return loadedComponent; });
    return loadPromise;
  };
  return () => ({ load, component: loadedComponent });
}

export function asyncComponent<T extends Component>(
  importFn: () => Promise<{ default: T }>,
  fallback: VNode
): Component {
  const lazyFactory = lazy(importFn);
  const state = signal<SuspenseState>('pending');
  const component = signal<T | null>(null);
  lazyFactory().load()
    .then(comp => { component(comp); state('resolved'); })
    .catch(() => { state('error'); });
  return () => {
    if (state() !== 'resolved') return fallback;
    const comp = component();
    return comp ? comp() : fallback;
  };
}

export interface IncrementalUpdate {
  id: string;
  html: string;
  type: 'replace' | 'append' | 'prepend' | 'remove';
}

export function createUpdate(id: string, html: string, type: IncrementalUpdate['type'] = 'replace'): IncrementalUpdate {
  return { id, html, type };
}

export function applyUpdate(container: HTMLElement, update: IncrementalUpdate): void {
  const { id, html, type } = update;
  const element = container.querySelector(`[data-stream-id="${id}"]`);
  switch (type) {
    case 'replace':
      if (element) element.outerHTML = html;
      else {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newEl = temp.firstElementChild;
        if (newEl) { newEl.setAttribute('data-stream-id', id); container.appendChild(newEl); }
      }
      break;
    case 'append':
      if (element) element.insertAdjacentHTML('beforeend', html);
      break;
    case 'prepend':
      if (element) element.insertAdjacentHTML('afterbegin', html);
      break;
    case 'remove':
      if (element) element.remove();
      break;
  }
}

/**
 * 渲染增量流更新到 DOM 容器
 * 
 * 消费 HTML 块或 IncrementalUpdate 对象的异步流，并将其应用到容器。
 * 支持 JSON 编码的增量更新（replace/append/prepend/remove）或原始 HTML 块。
 * 
 * 用途：专门用于处理服务端流式响应，将流式 HTML 增量渲染到页面。
 * 与 render.ts 中的 renderToStream 区分：
 *   - renderStreamToDOM：消费流 → 渲染到 DOM（客户端接收流）
 *   - renderToStream：渲染组件 → 输出流（服务端生成流）
 * 
 * @param container - 目标 DOM 容器
 * @param stream - 异步生成器，产出 HTML 块或 IncrementalUpdate JSON
 * @returns 用于停止渲染的 Abort 控制器
 * 
 * @example
 * ```ts
 * const { abort } = renderStreamToDOM(container, async function* () {
 *   yield JSON.stringify({ id: 'msg1', html: '<div>Hello</div>', type: 'replace' });
 *   yield '<div>More content</div>'; // 原始 HTML
 * });
 * 
 * // 稍后：abort();
 * ```
 */
export function renderStreamToDOM(
  container: HTMLElement,
  stream: AsyncGenerator<string, void, unknown>
): { abort: () => void } {
  let aborted = false;
  (async () => {
    try {
      for await (const chunk of stream) {
        if (aborted) break;
        try {
          const update: IncrementalUpdate = JSON.parse(chunk);
          applyUpdate(container, update);
        } catch {
          container.insertAdjacentHTML('beforeend', chunk);
        }
      }
    } catch (err) {
      console.error('Stream rendering error:', err);
    }
  })();
  return { abort: () => { aborted = true; } };
}
