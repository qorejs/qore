/**
 * Qore - AI-Native Frontend Framework
 * < 3kb gzip core
 */

// Signal System
export { signal, computed, effect, batch } from './signal';
export type { Signal } from './signal';

// Renderer
export { 
  h, 
  text, 
  render, 
  show, 
  For, 
  Fragment, 
  Portal, 
  div, 
  span, 
  button, 
  input, 
  p, 
  h1, 
  h2, 
  h3,
  renderToString,
  renderToStream as renderToStreamDOM,
  renderAsync,
  renderToStreamAsync
} from './render';
export type { VNode, Component } from './render';

// SSR - Server-Side Rendering
export {
  renderComponentToString,
  renderSSR,
  prefetchAndRender,
  createPrefetchContext
} from './ssr';
export type { SSRResult, PrefetchContext } from './ssr';

// AI Streaming
export { stream, streamText } from './stream';
export type { StreamWriter, StreamOptions } from './stream';

// Server-Side Streaming
export { 
  StreamRenderer, 
  createStreamHTML, 
  Suspense, 
  createSuspense,
  lazy, 
  asyncComponent,
  createUpdate,
  applyUpdate,
  renderToStream as renderToStreamIncremental
} from './stream';
export type { SuspenseProps, SuspenseState, IncrementalUpdate, StreamWriter, StreamOptions } from './stream';

// Virtual List - High-performance list rendering
export {
  VirtualList,
  InfiniteList,
  FixedVirtualList,
  VirtualGrid
} from './virtual-list';
export type {
  VirtualListProps,
  VirtualListItem,
  InfiniteListProps,
  VirtualGridProps
} from './virtual-list';

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
