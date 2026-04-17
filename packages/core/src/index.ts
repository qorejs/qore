/**
 * Qore - AI-Native Frontend Framework
 * Lightweight core with essential features
 * 
 * @packageDocumentation
 */

// Signal System
export { signal, computed, effect, batch } from './signal';
export type { Signal } from './signal';

// Renderer (Browser/DOM only)
// 注意：SSR/Node.js 环境请使用 '@qorejs/qore/ssr'
export { 
  h, text, render, show, For, Fragment, Portal,
  renderToDOMString, renderComponentToDOMString,
  renderDOMAsync,
  renderToStream as renderToStreamDOM, renderToStreamAsync as renderToStreamAsyncDOM,
  div, span, button, input
} from './render';
// Backward Compatibility Aliases (Deprecated - will be removed in v1.0.0)
// These aliases point to DOM versions for backward compatibility
// For SSR, use: import { renderToString, renderAsync } from '@qorejs/qore/ssr'
export { 
  renderToString as renderToStringDOM, 
  renderComponentToString as renderComponentToStringDOM,
  renderAsync as renderAsyncDOM,
  // Direct aliases for backward compatibility (deprecated)
  renderToString as renderToString,
  renderComponentToString as renderComponentToString,
  renderAsync as renderAsync
} from './render';
export type { VNode, Component } from './render';

// Environment Detection
/**
 * Check if running in Node.js environment
 * @returns true if in Node.js, false otherwise
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null;
}

/**
 * Check if running in browser environment
 * @returns true if in browser, false otherwise
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// Stream (core features)
export { 
  stream, streamText, 
  StreamRenderer, createStreamHTML,
  Suspense, createSuspense,
  lazy, asyncComponent,
  createUpdate, applyUpdate,
  renderStreamToDOM
} from './stream';
export type { StreamWriter, StreamOptions, SuspenseProps, SuspenseState, IncrementalUpdate } from './stream';

// Backpressure Handling
export {
  BackpressureController,
  BackpressureStream,
  createBackpressureController,
  createBackpressureStream,
  withBackpressure
} from './backpressure';
export type {
  BackpressureOptions,
  BackpressureState,
  BackpressureMetrics,
  BackpressureConsumer,
  BackpressureStreamOptions
} from './backpressure';

// Progressive Hydration
export {
  HydrationTracker,
  ChunkedHydrator,
  PriorityHydrator,
  createProgressiveComponent,
  createHydrationTracker,
  createChunkedHydrator,
  createPriorityHydrator,
  hydrationDirective,
  batchHydrate
} from './hydration';
export type {
  HydrationOptions,
  HydrationProgress,
  HydrationState,
  HydrationMetrics,
  HydrationChunk,
  HydrationPriority,
  ProgressiveHydrationProps
} from './hydration';

// Model Loader (AI model optimization)
export { 
  ModelLoader, loadModel, useModel, batchLoadModels
} from './model';
export type { ModelLoaderOptions, ModelInstance, ModelStatus } from './model';

// Utilities
export { debounce, throttle, cx, style, on, onEvent, preventDefault, stopPropagation, sleep } from './utils';

// Error Handling
export { createErrorBoundary, setupGlobalErrorHandler, tryCatch, retry, withErrorBoundary } from './error';

// Mock Testing Service (for AI module testing)
export {
  createMockModel,
  mockAIResponse,
  setupAIMocks,
  cleanupAIMocks,
  getMockModel,
  clearMockModel,
  createMockModelLoader,
  mockStreamResponse,
  mockBatchInference,
  mockUtils
} from './mock/ai-mock';
export type { MockModelData, MockAIResponse, MockInferenceOptions } from './mock/ai-mock';
