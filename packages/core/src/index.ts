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
