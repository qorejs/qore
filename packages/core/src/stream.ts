/**
 * Qore Stream - Streaming Component for AI Responses
 * Supports incremental updates for AI streaming responses
 */

import { h, VNode, Renderer, patch } from './renderer';
import { signal, Signal } from './reactive';

export interface StreamWriter {
  write(vnode: VNode): void;
  update(vnode: VNode): void;
  append(vnode: VNode): void;
  clear(): void;
}

export interface StreamInstance {
  writer: StreamWriter;
  content: Signal<VNode | null>;
  isComplete: Signal<boolean>;
  error: Signal<Error | null>;
  abort(): void;
}

export interface StreamOptions {
  container?: HTMLElement;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/**
 * Create a streaming component that supports incremental updates
 * 
 * @param fn - Async function that receives a writer to stream content
 * @param options - Stream configuration options
 * @returns StreamInstance for controlling the stream
 */
export function createStream(
  fn: (writer: StreamWriter) => Promise<void>,
  options: StreamOptions = {}
): StreamInstance {
  const content = signal<VNode | null>(null);
  const isComplete = signal<boolean>(false);
  const error = signal<Error | null>(null);
  
  let currentVNode: VNode | null = null;
  let children: VNode[] = [];
  let aborted = false;
  
  const container = options.container || (typeof document !== 'undefined' ? document.createElement('div') : null);
  let renderer: Renderer | null = null;
  
  if (container) {
    renderer = new Renderer(container);
  }
  
  const updateDOM = () => {
    if (!container || !renderer || !currentVNode) return;
    
    const oldVNode = content.get();
    patch(container, oldVNode, currentVNode);
  };
  
  const writer: StreamWriter = {
    write(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      updateDOM();
    },
    
    update(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      updateDOM();
    },
    
    append(vnode: VNode): void {
      if (aborted) return;
      if (!currentVNode || typeof currentVNode === 'string' || typeof currentVNode === 'number') {
        children = [vnode];
      } else {
        children.push(vnode);
      }
      currentVNode = {
        type: 'div',
        props: null,
        children: [...children],
      };
      content.set(currentVNode);
      updateDOM();
    },
    
    clear(): void {
      if (aborted) return;
      currentVNode = null;
      children = [];
      content.set(null);
      if (container) {
        container.innerHTML = '';
      }
    },
  };
  
  // Execute the streaming function asynchronously
  Promise.resolve().then(() => fn(writer))
    .then(() => {
      if (!aborted) {
        isComplete.set(true);
        options.onComplete?.();
      }
    })
    .catch((err: Error) => {
      if (!aborted) {
        error.set(err);
        options.onError?.(err);
      }
    });
  
  return {
    writer,
    content,
    isComplete,
    error,
    abort(): void {
      aborted = true;
    },
  };
}

/**
 * Create a stream writer for manual control
 * The writer can be used independently of the stream function
 */
export function createStreamWriter(
  container: HTMLElement,
  options: StreamOptions = {}
): { writer: StreamWriter; stream: StreamInstance } {
  const content = signal<VNode | null>(null);
  const isComplete = signal<boolean>(false);
  const error = signal<Error | null>(null);
  
  let currentVNode: VNode | null = null;
  let children: VNode[] = [];
  let aborted = false;
  let oldVNode: VNode | null = null;
  
  const updateDOM = () => {
    if (!currentVNode) return;
    patch(container, oldVNode, currentVNode);
    oldVNode = currentVNode;
  };
  
  const writer: StreamWriter = {
    write(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      updateDOM();
    },
    
    update(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      updateDOM();
    },
    
    append(vnode: VNode): void {
      if (aborted) return;
      if (!currentVNode || typeof currentVNode === 'string' || typeof currentVNode === 'number') {
        children = [vnode];
      } else {
        children.push(vnode);
      }
      currentVNode = {
        type: 'div',
        props: null,
        children: [...children],
      };
      content.set(currentVNode);
      updateDOM();
    },
    
    clear(): void {
      if (aborted) return;
      currentVNode = null;
      children = [];
      oldVNode = null;
      content.set(null);
      container.innerHTML = '';
    },
  };
  
  const stream: StreamInstance = {
    writer,
    content,
    isComplete,
    error,
    abort(): void {
      aborted = true;
    },
  };
  
  return { writer, stream };
}

/**
 * Stream text content with typewriter effect
 */
export function streamText(
  text: string,
  options: {
    container?: HTMLElement;
    speed?: number;
    onComplete?: () => void;
  } = {}
): StreamInstance {
  const { speed = 50, onComplete } = options;
  
  return createStream(async (writer) => {
    writer.write(h('span', null, ''));
    
    for (let i = 0; i < text.length; i++) {
      await new Promise(resolve => setTimeout(resolve, speed));
      writer.update(h('span', null, text.slice(0, i + 1)));
    }
    
    onComplete?.();
  }, options);
}
