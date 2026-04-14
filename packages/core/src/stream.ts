/**
 * Qore Stream - AI Streaming First-class Support
 * Minimal API for AI responses
 */

import { signal, effect } from './signal';

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
 * AI 流式响应
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
    output.innerHTML = parseMarkdown ? parseMarkdown(content) : content;
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
function parseMarkdown(text: string): string {
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
