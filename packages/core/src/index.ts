/**
 * Qore - AI-Native Frontend Framework
 * < 3kb gzip core
 */

// Signal System
export { signal, computed, effect, batch } from './signal';
export type { Signal } from './signal';

// Renderer
export { h, text, render, show, For, Fragment, Portal, div, span, button, input, p, h1, h2, h3 } from './render';
export type { VNode, Component } from './render';

// AI Streaming
export { stream, streamText } from './stream';
export type { StreamWriter, StreamOptions } from './stream';

// Error Handling
export { 
  createErrorBoundary, 
  setupGlobalErrorHandler, 
  tryCatch, 
  retry, 
  withErrorBoundary 
} from './error';

// Utilities
export { 
  debounce, 
  throttle, 
  cx, 
  style, 
  on, 
  onEvent, 
  preventDefault, 
  stopPropagation, 
  sleep 
} from './utils';
