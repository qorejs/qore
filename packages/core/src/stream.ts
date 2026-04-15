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
 * Server-side stream renderer
 * Support chunked HTML fragment output
 */
export class StreamRenderer {
  private chunks: string[] = [];
  private callbacks: ((chunk: string) => void)[] = [];
  private resolved = false;
  private error: Error | null = null;

  /**
   * Write an HTML chunk
   */
  write(chunk: string): void {
    this.chunks.push(chunk);
    this.callbacks.forEach(cb => cb(chunk));
  }

  /**
   * Complete stream rendering
   */
  end(): void {
    this.resolved = true;
  }

  /**
   * Throw error
   */
  fail(err: Error): void {
    this.error = err;
    this.resolved = true;
  }

  /**
   * Subscribe to stream output
   */
  subscribe(callback: (chunk: string) => void): () => void {
    this.callbacks.push(callback);
    // Immediately send existing chunks
    this.chunks.forEach(chunk => callback(chunk));
    
    return () => {
      const idx = this.callbacks.indexOf(callback);
      if (idx !== -1) this.callbacks.splice(idx, 1);
    };
  }

  /**
   * Get complete HTML
   */
  getHTML(): string {
    return this.chunks.join('');
  }

  /**
   * Async iterator - for use with for await...of
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
 * Stream HTML fragment generator
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
 * Suspense state
 */
export type SuspenseState = 'pending' | 'resolved' | 'error';

/**
 * Suspense component props
 */
export interface SuspenseProps {
  fallback: VNode;
  children: () => VNode;
  onError?: (error: Error) => void;
}

/**
 * Suspense boundary component
 * Wraps asynchronously loaded components - each instance has independent state
 */
export function Suspense({ fallback, children, onError }: SuspenseProps): Component {
  // State sinks to component instance level, avoiding global singleton issues
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
 * Create Suspense component with state
 * Allow external control of loading state
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
 * lazy() - lazy load component
 * Returns a wrapped component that displays Suspense fallback on first render
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
 * Async component wrapper
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
 * Incremental update chunk
 */
export interface IncrementalUpdate {
  id: string;
  html: string;
  type: 'replace' | 'append' | 'prepend' | 'remove';
}

/**
 * Create incremental update message
 */
export function createUpdate(id: string, html: string, type: IncrementalUpdate['type'] = 'replace'): IncrementalUpdate {
  return { id, html, type };
}

/**
 * Apply incremental update to DOM
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
 * Stream render to target element
 * Support server-push incremental updates
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
        
        // Parse incremental update
        try {
          const update: IncrementalUpdate = JSON.parse(chunk);
          applyUpdate(container, update);
        } catch {
          // If not JSON, directly append HTML
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
