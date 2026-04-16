/**
 * Qore - AI-Native Frontend Framework
 * Lightweight core with essential features
 */

// Signal System
export { signal, computed, effect, batch } from './signal';
export type { Signal } from './signal';

// Renderer
export { 
  h, text, render, show, For, Fragment, Portal,
  renderToString, renderComponentToString,
  renderToStream as renderToStreamDOM, renderToStreamAsync,
  div, span, button, input
} from './render';
export type { VNode, Component } from './render';

// Stream (core features)
export { 
  stream, streamText, 
  StreamRenderer, createStreamHTML,
  Suspense, createSuspense,
  lazy, asyncComponent,
  createUpdate, applyUpdate
} from './stream';
export type { StreamWriter, StreamOptions, SuspenseProps, SuspenseState, IncrementalUpdate } from './stream';

// Utilities
export { debounce, throttle, cx, style, on, onEvent, preventDefault, stopPropagation, sleep } from './utils';

// Error Handling
export { createErrorBoundary, setupGlobalErrorHandler, tryCatch, retry, withErrorBoundary } from './error';
