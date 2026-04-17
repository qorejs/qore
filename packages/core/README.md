# Qore - AI-Native Frontend Framework

A lightweight (<3kb gzip) reactive frontend framework designed for AI applications.

## Installation

```bash
npm install @qorejs/qore
```

## Quick Start

### Browser Rendering

```ts
import { h, render, signal } from '@qorejs/qore';

const count = signal(0);

const App = () => 
  h('div', null, 
    h('h1', null, `Count: ${count()}`),
    h('button', { 
      onClick: () => count(count() + 1) 
    }, 'Increment')
  );

render(document.getElementById('root'), App);
```

### Server-Side Rendering (SSR)

```ts
// Server-side (Node.js)
import { renderToString, renderComponentToString } from '@qorejs/qore/ssr';

const Component = () => ['<div>', 'Hello World', '</div>'];
const html = renderComponentToString(Component);
// Output: &lt;div&gt;Hello World&lt;/div&gt;

// HTML is automatically escaped for XSS protection
const safe = renderToString('<script>alert("xss")</script>');
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

## Key Features

- **Signal-based Reactivity** - Fine-grained updates without virtual DOM
- **Streaming Support** - AI response streaming with backpressure handling
- **Server-Side Rendering** - Secure SSR with automatic HTML escaping
- **Progressive Hydration** - Optimize initial load performance
- **AI Model Loading** - Built-in model loader for AI integrations
- **TypeScript** - Full type safety

## Documentation

- [SSR Guide](./SSR_GUIDE.md) - Complete guide to server-side rendering
- [API Reference](./docs/api.md) - Full API documentation

## Environment Detection

```ts
import { isNode, isBrowser } from '@qorejs/qore';

if (isNode()) {
  // Use SSR module
  const { renderToString } = await import('@qorejs/qore/ssr');
} else {
  // Use DOM rendering
  const { renderToDOMString } = await import('@qorejs/qore');
}
```

## Module Exports

### Main Module (`@qorejs/qore`)

Browser/DOM rendering functions:

- `h()` - Create DOM elements
- `render()` - Render to DOM
- `renderToDOMString()` - Convert VNode to HTML string (no escaping)
- `signal()`, `computed()`, `effect()` - Reactive primitives
- `stream()` - AI streaming responses
- `isNode()`, `isBrowser()` - Environment detection

**Deprecated aliases** (for backward compatibility, will be removed in v1.0.0):

- `renderToString` → Use `renderToDOMString` or `@qorejs/qore/ssr`
- `renderComponentToString` → Use `renderComponentToDOMString` or `@qorejs/qore/ssr`
- `renderAsync` → Use `renderDOMAsync` or `@qorejs/qore/ssr`

### SSR Module (`@qorejs/qore/ssr`)

Server-side rendering functions with HTML escaping:

- `renderToString()` - Convert VNode to HTML string **with escaping**
- `renderComponentToString()` - Render component **with escaping**
- `renderProps()` - Render HTML attributes **with escaping**
- `renderAsync()` - Async rendering **with escaping**
- `renderToStream()` - Streaming SSR
- `renderSSR()` - Full SSR with state hydration
- `renderWithSuspense()` - SSR with suspense/fallback

### Stream Module (`@qorejs/qore/stream`)

Streaming utilities:

- `StreamRenderer` - Server-side stream renderer
- `stream()` - Client-side AI streaming
- `Suspense` - Suspense boundary component

## Migration Guide

### From v0.5.x

**SSR imports changed:**

```ts
// Old (v0.5.x)
import { renderToString } from '@qorejs/qore';

// New (v0.6.x) - Browser
import { renderToDOMString } from '@qorejs/qore';

// New (v0.6.x) - SSR/Node.js
import { renderToString } from '@qorejs/qore/ssr';
```

**Backward compatibility:**

Old imports still work but are deprecated and will be removed in v1.0.0:

```ts
// Still works (deprecated)
import { renderToString } from '@qorejs/qore'; // Points to renderToDOMString
```

## Security

The SSR module (`@qorejs/qore/ssr`) automatically escapes HTML to prevent XSS attacks:

```ts
import { renderToString } from '@qorejs/qore/ssr';

const userInput = '<script>alert("xss")</script>';
const safe = renderToString(userInput);
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

⚠️ **Never use `renderToDOMString` with user input** - it doesn't escape HTML.

## License

MIT
