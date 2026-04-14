/**
 * Qore Stream - Streaming Component for AI Responses
 * Supports incremental updates with diff-based patching
 */

import { h, VNode, Renderer, patch } from './renderer';
import { signal, Signal } from './reactive';
import { diff, Patch, applyPatches } from './diff';

export interface StreamWriter {
  write(vnode: VNode): void;
  update(vnode: VNode): void;
  patch(vnode: VNode): void; // Incremental patch using diff
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
    renderer.patch(currentVNode);
  };
  
  const writer: StreamWriter = {
    write(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      if (container && renderer) {
        renderer.render(vnode);
      }
    },
    
    update(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      updateDOM();
    },
    
    /**
     * Incremental patch - only update changed parts
     * Uses diff algorithm to find minimal changes
     */
    patch(vnode: VNode): void {
      if (aborted) return;
      
      if (!currentVNode) {
        // No previous content, just write
        writer.write(vnode);
        return;
      }
      
      // Calculate diff and apply patches
      const patches = diff(currentVNode, vnode);
      
      if (patches.length > 0) {
        currentVNode = applyPatches(currentVNode, patches);
        content.set(currentVNode);
        updateDOM();
      }
    },
    
    append(vnode: VNode): void {
      if (aborted) return;
      if (!currentVNode || typeof currentVNode === 'string' || typeof currentVNode === 'number') {
        children = [vnode];
      } else {
        children.push(vnode);
      }
      const newVNode = {
        type: 'div',
        props: null,
        children: [...children],
      };
      currentVNode = newVNode;
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
  
  const renderer = new Renderer(container);
  
  const updateDOM = () => {
    if (!currentVNode) return;
    renderer.patch(currentVNode);
  };
  
  const writer: StreamWriter = {
    write(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      renderer.render(vnode);
    },
    
    update(vnode: VNode): void {
      if (aborted) return;
      currentVNode = vnode;
      content.set(vnode);
      updateDOM();
    },
    
    patch(vnode: VNode): void {
      if (aborted) return;
      
      if (!currentVNode) {
        writer.write(vnode);
        return;
      }
      
      const patches = diff(currentVNode, vnode);
      
      if (patches.length > 0) {
        currentVNode = applyPatches(currentVNode, patches);
        content.set(currentVNode);
        updateDOM();
      }
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

/**
 * Stream markdown content with incremental rendering
 * Supports incremental updates for better performance
 */
export function streamMarkdown(
  markdown: string,
  options: {
    container?: HTMLElement;
    speed?: number;
    onComplete?: () => void;
  } = {}
): StreamInstance {
  const { speed = 30, onComplete } = options;
  
  return createStream(async (writer) => {
    writer.write(h('div', { className: 'markdown' }, ''));
    
    // Simple markdown parser (can be replaced with a real one)
    const lines = markdown.split('\n');
    let currentContent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentContent += (i > 0 ? '\n' : '') + line;
      
      await new Promise(resolve => setTimeout(resolve, speed));
      
      // Parse markdown to VNode (simplified)
      const vnode = parseMarkdown(currentContent);
      writer.patch(vnode);
    }
    
    onComplete?.();
  }, options);
}

/**
 * Simple markdown parser (for demo purposes)
 */
function parseMarkdown(text: string): VNode {
  const lines = text.split('\n');
  const children: VNode[] = [];
  
  for (const line of lines) {
    if (line.startsWith('# ')) {
      children.push(h('h1', null, line.slice(2)));
    } else if (line.startsWith('## ')) {
      children.push(h('h2', null, line.slice(3)));
    } else if (line.startsWith('### ')) {
      children.push(h('h3', null, line.slice(4)));
    } else if (line.startsWith('- ')) {
      children.push(h('li', null, line.slice(2)));
    } else if (line.startsWith('```')) {
      // Code block handling would go here
      children.push(h('code', null, line));
    } else if (line.trim() === '') {
      children.push(h('br', null));
    } else {
      children.push(h('p', null, line));
    }
  }
  
  return h('div', { className: 'markdown' }, ...children);
}

/**
 * Stream code with syntax highlighting (incremental)
 */
export function streamCode(
  code: string,
  language: string = 'typescript',
  options: {
    container?: HTMLElement;
    speed?: number;
    onComplete?: () => void;
  } = {}
): StreamInstance {
  const { speed = 20, onComplete } = options;
  
  return createStream(async (writer) => {
    writer.write(h('pre', null, h('code', { className: `language-${language}` }, '')));
    
    for (let i = 0; i < code.length; i++) {
      await new Promise(resolve => setTimeout(resolve, speed));
      writer.patch(h('pre', null, h('code', { className: `language-${language}` }, code.slice(0, i + 1))));
    }
    
    onComplete?.();
  }, options);
}
