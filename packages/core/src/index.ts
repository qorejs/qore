/**
 * Qore - The Core of AI Era UI
 * AI-Native Frontend Framework
 */

// Reactive System
export { Signal, Computed, signal, computed, effect, batch } from './reactive';

// Renderer
export { h, text, Renderer, patch } from './renderer';
export type { VNode, VElement, VText } from './renderer';

// Components
export { createComponent, component, Fragment } from './component';
export { div, span, button, input, ul, li, h1, h2, p } from './component';
export type { Component, Props } from './component';

// Diff Algorithm
export { diff, applyPatches } from './diff';
export type { Patch, PatchType } from './diff';

// Streaming
export { createStream, createStreamWriter, streamText, streamMarkdown, streamCode } from './stream';
export type { StreamWriter, StreamInstance, StreamOptions } from './stream';

// Suspense
export { createSuspense, Suspense, lazy, useAsyncData } from './suspense';
export type { SuspenseState, SuspenseOptions } from './suspense';
