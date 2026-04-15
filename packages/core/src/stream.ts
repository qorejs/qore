/**
 * Qore Stream - AI Streaming & Server-Side Streaming Support
 * Minimal API for AI responses and SSR streaming
 */

import { signal, effect, computed } from './signal';
import { VNode, Component } from './render';

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

/**
 * AI 流式响应 (客户端)
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
    output.innerHTML = parseMarkdown ? doParseMarkdown(content) : content;
  };
  
  const write: StreamWriter = (chunk: string) => {
    if (aborted) return;
    content += chunk;
    update();
  };
  
  write.clear = () => { content = ''; update(); };
  write.done = () => { if (!aborted) onComplete?.(); };
  
  Promise.resolve().then(() => fn(write))
    .catch((err: Error) => { if (!aborted) onError?.(err); });
  
  return {
    abort: () => { aborted = true; }
  };
}

/**
 * Simple Markdown parser
 */
function doParseMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>');
}

/**
 * Typewriter effect
 */
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

// ============== Server-Side Streaming ==============

/**
 * 服务端流式渲染器
 * 支持分块输出 HTML 片段
 */
export class StreamRenderer {
  private chunks: string[] = [];
  private callbacks: ((chunk: string) => void)[] = [];
  private resolved = false;
  private error: Error | null = null;

  /**
   * 写入一个 HTML 块
   */
  write(chunk: string): void {
    this.chunks.push(chunk);
    this.callbacks.forEach(cb => cb(chunk));
  }

  /**
   * 完成流式渲染
   */
  end(): void {
    this.resolved = true;
  }

  /**
   * 抛出错误
   */
  fail(err: Error): void {
    this.error = err;
    this.resolved = true;
  }

  /**
   * 订阅流式输出
   */
  subscribe(callback: (chunk: string) => void): () => void {
    this.callbacks.push(callback);
    // 立即发送已有 chunks
    this.chunks.forEach(chunk => callback(chunk));
    
    return () => {
      const idx = this.callbacks.indexOf(callback);
      if (idx !== -1) this.callbacks.splice(idx, 1);
    };
  }

  /**
   * 获取完整 HTML
   */
  getHTML(): string {
    return this.chunks.join('');
  }

  /**
   * 异步迭代器 - 用于 for await...of
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<string, void, unknown> {
    let index = 0;
    
    while (index < this.chunks.length || !this.resolved) {
      if (index < this.chunks.length) {
        yield this.chunks[index++];
      } else {
        await new Promise(resolve => {
          const check = () => {
            if (index < this.chunks.length || this.resolved) {
              resolve(undefined);
            } else {
              setTimeout(check, 10);
            }
          };
          check();
        });
      }
    }

    if (this.error) {
      throw this.error;
    }
  }
}

/**
 * 流式 HTML 片段生成器
 */
export function createStreamHTML(): {
  renderer: StreamRenderer;
  html: () => string;
  stream: () => AsyncGenerator<string>;
} {
  const renderer = new StreamRenderer();
  
  return {
    renderer,
    html: () => renderer.getHTML(),
    stream: () => renderer[Symbol.asyncIterator]()
  };
}

// ============== Suspense & Lazy Loading ==============

/**
 * Suspense 状态
 */
export type SuspenseState = 'pending' | 'resolved' | 'error';

/**
 * Suspense 组件属性
 */
export interface SuspenseProps {
  fallback: VNode;
  children: () => VNode;
  onError?: (error: Error) => void;
}

/**
 * Suspense 边界组件
 * 用于包裹异步加载的组件 - 每个实例有独立状态
 */
export function Suspense({ fallback, children, onError }: SuspenseProps): Component {
  // 状态下沉到组件实例内部，避免全局单例问题
  const state = signal<SuspenseState>('pending');
  const errorSig = signal<Error | null>(null);

  return () => {
    const s = state();
    const err = errorSig();

    if (s === 'error') {
      onError?.(err!);
      return fallback;
    }

    if (s === 'pending') {
      return fallback;
    }

    return children();
  };
}

/**
 * 创建带状态的 Suspense 组件
 * 允许外部控制加载状态
 */
export function createSuspense({ fallback, children, onError }: SuspenseProps): {
  component: Component;
  setState: (state: SuspenseState, error?: Error) => void;
  getState: () => SuspenseState;
} {
  const state = signal<SuspenseState>('pending');
  const errorSig = signal<Error | null>(null);

  const component: Component = () => {
    const s = state();
    const err = errorSig();

    if (s === 'error') {
      onError?.(err!);
      return fallback;
    }

    if (s === 'pending') {
      return fallback;
    }

    return children();
  };

  return {
    component,
    setState: (newState: SuspenseState, error?: Error) => {
      state(newState);
      if (error) errorSig(error);
    },
    getState: () => state()
  };
}

/**
 * lazy() - 懒加载组件
 * 返回一个包装的组件，首次渲染时显示 Suspense fallback
 */
export function lazy<T extends Component>(
  importFn: () => Promise<{ default: T }>
): () => { load: () => Promise<T>; component: T | null } {
  let loadedComponent: T | null = null;
  let loadPromise: Promise<T> | null = null;

  const load = async (): Promise<T> => {
    if (loadedComponent) return loadedComponent;
    if (loadPromise) return loadPromise;

    loadPromise = importFn().then(mod => {
      loadedComponent = mod.default;
      return loadedComponent;
    });

    return loadPromise;
  };

  return () => {
    return {
      load,
      component: loadedComponent
    };
  };
}

/**
 * 异步组件包装器
 */
export function asyncComponent<T extends Component>(
  importFn: () => Promise<{ default: T }>,
  fallback: VNode
): Component {
  const lazyFactory = lazy(importFn);
  const state = signal<SuspenseState>('pending');
  const component = signal<T | null>(null);

  // 触发加载
  lazyFactory().load()
    .then(comp => {
      component(comp);
      state('resolved');
    })
    .catch(err => {
      console.error('Async component load failed:', err);
      state('error');
    });

  return () => {
    if (state() === 'pending') {
      return fallback;
    }
    
    if (state() === 'error') {
      return fallback;
    }

    const comp = component();
    return comp ? comp() : fallback;
  };
}

// ============== Incremental DOM Updates ==============

/**
 * 增量更新块
 */
export interface IncrementalUpdate {
  id: string;
  html: string;
  type: 'replace' | 'append' | 'prepend' | 'remove';
}

/**
 * 创建增量更新消息
 */
export function createUpdate(id: string, html: string, type: IncrementalUpdate['type'] = 'replace'): IncrementalUpdate {
  return { id, html, type };
}

/**
 * 应用增量更新到 DOM
 */
export function applyUpdate(container: HTMLElement, update: IncrementalUpdate): void {
  const { id, html, type } = update;
  const element = container.querySelector(`[data-stream-id="${id}"]`);

  switch (type) {
    case 'replace':
      if (element) {
        element.outerHTML = html;
      } else {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newEl = temp.firstElementChild;
        if (newEl) {
          newEl.setAttribute('data-stream-id', id);
          container.appendChild(newEl);
        }
      }
      break;

    case 'append':
      if (element) {
        element.insertAdjacentHTML('beforeend', html);
      }
      break;

    case 'prepend':
      if (element) {
        element.insertAdjacentHTML('afterbegin', html);
      }
      break;

    case 'remove':
      if (element) {
        element.remove();
      }
      break;
  }
}

/**
 * 流式渲染到目标元素
 * 支持服务端推送的增量更新
 */
export function renderToStream(
  container: HTMLElement,
  stream: AsyncGenerator<string, void, unknown>
): { abort: () => void } {
  let aborted = false;

  (async () => {
    try {
      for await (const chunk of stream) {
        if (aborted) break;
        
        // 解析增量更新
        try {
          const update: IncrementalUpdate = JSON.parse(chunk);
          applyUpdate(container, update);
        } catch {
          // 如果不是 JSON，直接追加 HTML
          container.insertAdjacentHTML('beforeend', chunk);
        }
      }
    } catch (err) {
      console.error('Stream rendering error:', err);
    }
  })();

  return {
    abort: () => { aborted = true; }
  };
}
