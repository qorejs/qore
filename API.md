# Qore API Reference

Complete API documentation for Qore Framework v0.4.0

---

## Table of Contents

- [Core](#core)
  - [signal](#signal)
  - [computed](#computed)
  - [effect](#effect)
  - [batch](#batch)
- [Rendering](#rendering)
  - [h](#h)
  - [render](#render)
  - [text](#text)
  - [show](#show)
  - [For](#for)
  - [Fragment](#fragment)
  - [Portal](#portal)
- [Streaming](#streaming)
  - [stream](#stream)
  - [streamText](#streamtext)
  - [StreamRenderer](#streamrenderer)
  - [Suspense](#suspense)
  - [lazy](#lazy)
- [Error Handling](#error-handling)
  - [createErrorBoundary](#createerrorboundary)
  - [setupGlobalErrorHandler](#setupglobalerrorhandler)
  - [tryCatch](#trycatch)
  - [retry](#retry)
- [Utilities](#utilities)
  - [debounce](#debounce)
  - [throttle](#throttle)
  - [cx](#cx)
  - [style](#style)
  - [sleep](#sleep)

---

## Core

### signal

Create a reactive signal.

```typescript
function signal<T>(initialValue: T): Signal<T>
```

**Parameters:**
- `initialValue` - The initial value of the signal

**Returns:** A Signal function that can be called to get/set the value

**Example:**
```typescript
const count = signal(0);
console.log(count()); // 0

count(5);
console.log(count()); // 5

count(count() + 1);
console.log(count()); // 6
```

---

### computed

Create a computed signal that automatically tracks dependencies.

```typescript
function computed<T>(fn: () => T): Signal<T>
```

**Parameters:**
- `fn` - Function that returns the computed value

**Returns:** A read-only Signal

**Example:**
```typescript
const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName()} ${lastName()}`);
console.log(fullName()); // "John Doe"

firstName('Jane');
console.log(fullName()); // "Jane Doe" (auto-updates)
```

---

### effect

Create an effect that runs when dependencies change.

```typescript
function effect(fn: () => void | (() => void)): () => void
```

**Parameters:**
- `fn` - Function to run. Can return a cleanup function.

**Returns:** A function to stop the effect

**Example:**
```typescript
const count = signal(0);

const stop = effect(() => {
  console.log(`Count: ${count()}`);
});

count(1); // Logs: "Count: 1"

stop(); // Stop listening
count(2); // No log
```

**With Cleanup:**
```typescript
effect(() => {
  const timer = setInterval(() => console.log(count()), 1000);
  return () => clearInterval(timer);
});
```

---

### batch

Batch multiple signal updates into a single reactivity cycle.

```typescript
function batch(fn: () => void): void
```

**Parameters:**
- `fn` - Function containing signal updates

**Example:**
```typescript
const a = signal(0);
const b = signal(0);

effect(() => {
  console.log(`a=${a()}, b=${b()}`);
});

// Without batch: effect runs twice
a(1);
b(2);

// With batch: effect runs once
batch(() => {
  a(1);
  b(2);
});
```

---

## Rendering

### h

Create a virtual DOM node (hyperscript).

```typescript
function h(
  type: string | Component,
  props?: Record<string, any> | null,
  ...children: any[]
): VNode
```

**Parameters:**
- `type` - HTML tag name or component function
- `props` - Element properties (optional)
- `children` - Child nodes

**Example:**
```typescript
// HTML element
h('div', { class: 'container' }, [
  h('h1', {}, 'Hello'),
  h('p', {}, 'World')
]);

// Component
const Button = (props) => h('button', {}, props.label);
h(Button, { label: 'Click me' });
```

---

### render

Render a component to a DOM element.

```typescript
function render(root: HTMLElement, fn: () => VNode): () => void
```

**Parameters:**
- `root` - DOM element to render into
- `fn` - Function that returns a VNode

**Returns:** A cleanup function

**Example:**
```typescript
const App = () => h('div', {}, 'Hello World');

const app = document.getElementById('app');
render(app, App);

// Cleanup
const cleanup = render(app, App);
cleanup(); // Unmount
```

---

### text

Create a text node, optionally reactive.

```typescript
function text(signalOrValue: (() => string | number) | string | number): Text
```

**Parameters:**
- `signalOrValue` - Static value or signal function

**Example:**
```typescript
// Static text
text('Hello');

// Reactive text
const count = signal(0);
text(() => `Count: ${count()}`);
```

---

### show

Conditional rendering helper.

```typescript
function show<T>(condition: () => boolean, fn: () => T): T | null
```

**Parameters:**
- `condition` - Boolean or signal function
- `fn` - Function to render when condition is true

**Example:**
```typescript
const isVisible = signal(true);

h('div', {}, [
  show(isVisible, () => h('p', {}, 'Visible!')),
  show(() => !isVisible(), () => h('p', {}, 'Hidden!'))
]);
```

---

### For

List rendering helper.

```typescript
function For<T, U>(
  items: () => T[],
  fn: (item: T, index: () => number) => U
): U[]
```

**Parameters:**
- `items` - Signal or function returning array
- `fn` - Render function for each item

**Example:**
```typescript
const items = signal(['A', 'B', 'C']);

h('ul', {}, [
  ...For(items, (item, index) => 
    h('li', { key: index() }, `${index()}: ${item}`)
  )
]);
```

---

### Fragment

Group multiple children without extra DOM nodes.

```typescript
function Fragment({ children }: { children: any[] }): any[]
```

**Example:**
```typescript
h(Fragment, {}, [
  h('li', {}, 'Item 1'),
  h('li', {}, 'Item 2'),
  h('li', {}, 'Item 3')
]);
```

---

### Portal

Render children to a different DOM node.

```typescript
function Portal({
  children,
  target
}: {
  children: VNode;
  target: HTMLElement | string;
}): null
```

**Parameters:**
- `children` - Nodes to render
- `target` - Target DOM element or selector

**Example:**
```typescript
h(Portal, {
  target: '#modal-root',
  children: h('div', { class: 'modal' }, 'Modal content')
});
```

---

## Streaming

### stream

Stream text content progressively.

```typescript
function stream(
  target: Signal<string>,
  chunks: AsyncIterable<string>,
  options?: StreamOptions
): Promise<void>
```

**Example:**
```typescript
const response = signal('');

await stream(response, async function* () {
  yield 'Hello';
  yield ' ';
  yield 'World';
  yield '!';
});
```

---

### streamText

Simplified streaming for text.

```typescript
function streamText(
  target: Signal<string>,
  text: string,
  options?: { chunkSize?: number; delay?: number }
): Promise<void>
```

**Example:**
```typescript
const response = signal('');
await streamText(response, 'Hello World!', { chunkSize: 1, delay: 50 });
```

---

### StreamRenderer

Server-side streaming renderer.

```typescript
class StreamRenderer {
  constructor(options?: { fallback?: string });
  render(component: () => VNode): string;
  flush(): string;
}
```

**Example:**
```typescript
const renderer = new StreamRenderer({ fallback: 'Loading...' });
const html = renderer.render(App);
```

---

### Suspense

Suspense boundary for async components.

```typescript
function Suspense(props: {
  fallback: VNode;
  children: VNode;
}): VNode
```

**Example:**
```typescript
h(Suspense, {
  fallback: h('div', {}, 'Loading...')
}, [
  h(LazyComponent)
]);
```

---

### lazy

Lazy load a component.

```typescript
function lazy<T>(
  loadFn: () => Promise<{ default: () => VNode }>
): () => VNode
```

**Example:**
```typescript
const LazyComponent = lazy(async () => {
  const module = await import('./HeavyComponent');
  return module.default;
});
```

---

## Error Handling

### createErrorBoundary

Create an error boundary component.

```typescript
function createErrorBoundary(
  fallback: (error: Error) => VNode
): Component
```

**Example:**
```typescript
const ErrorBoundary = createErrorBoundary((error) => 
  h('div', { class: 'error' }, `Error: ${error.message}`)
);

h(ErrorBoundary, {}, [h(ComponentThatMightFail)]);
```

---

### setupGlobalErrorHandler

Set up global error handling.

```typescript
function setupGlobalErrorHandler(
  handler: (error: Error) => void
): void
```

---

### tryCatch

Execute function with error handling.

```typescript
function tryCatch<T>(
  fn: () => T,
  onError?: (error: Error) => void
): T | undefined
```

---

### retry

Retry a function with exponential backoff.

```typescript
function retry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
  }
): Promise<T>
```

---

## Utilities

### debounce

Debounce a function.

```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void
```

---

### throttle

Throttle a function.

```typescript
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void
```

---

### cx

Conditional class names.

```typescript
function cx(...classes: (string | false | null | undefined)[]): string
```

**Example:**
```typescript
h('button', {
  class: cx('btn', isActive && 'active', isDisabled && 'disabled')
});
```

---

### style

Create style object.

```typescript
function style(styles: Record<string, string>): Record<string, string>
```

---

### sleep

Promise-based sleep.

```typescript
function sleep(ms: number): Promise<void>
```

**Example:**
```typescript
await sleep(1000); // Wait 1 second
```

---

## Types

```typescript
type Signal<T> = {
  (): T;
  (value: T): void;
};

type VNode = string | number | Node | Component | VNode[];

type Component = () => VNode;

interface StreamOptions {
  chunkSize?: number;
  delay?: number;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}
```

---

## More Resources

- [Quick Start](./QUICKSTART.md)
- [Examples](./EXAMPLES.md)
- [Architecture](./ARCHITECTURE.md)
- [GitHub](https://github.com/qore-framework/qore)
