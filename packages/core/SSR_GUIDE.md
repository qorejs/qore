# Qore SSR Guide - Server-Side Rendering

## Overview

Qore provides two separate rendering paths optimized for different environments:

1. **Browser/DOM Rendering** (`@qorejs/qore`) - For client-side rendering with DOM APIs
2. **SSR Rendering** (`@qorejs/qore/ssr`) - For server-side rendering in Node.js with HTML escaping

## Environment Detection

```ts
import { isNode, isBrowser } from '@qorejs/qore';

if (isNode()) {
  // Use SSR module
  const { renderToString } = await import('@qorejs/qore/ssr');
} else if (isBrowser()) {
  // Use DOM rendering
  const { renderToDOMString } = await import('@qorejs/qore');
}
```

## Browser/DOM Rendering

**Module:** `@qorejs/qore`

Use this for client-side rendering where DOM APIs are available.

```ts
import { h, renderToDOMString, renderComponentToDOMString } from '@qorejs/qore';

// Create elements
const element = h('div', { className: 'container' }, 'Hello World');

// Convert to HTML string (no escaping - for DOM use)
const html = renderToDOMString(element);

// Render component
const MyComponent = () => h('span', null, 'Component content');
const componentHtml = renderComponentToDOMString(MyComponent);
```

### ⚠️ Important

- `renderToDOMString` does **NOT** escape HTML - it's designed for DOM environments
- This function **requires** DOM APIs (`document`, `Node`, `Element`)
- **Will fail** in Node.js/server environments

## Server-Side Rendering (SSR)

**Module:** `@qorejs/qore/ssr`

Use this for server-side rendering in Node.js environments. Includes automatic HTML escaping for security.

```ts
import { 
  renderToString, 
  renderComponentToString, 
  renderProps,
  renderSSR 
} from '@qorejs/qore/ssr';

// Basic rendering with HTML escaping (XSS protection)
const html = renderToString('<script>alert("xss")</script>');
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

// Render component
const MyComponent = () => ['<div>', 'Safe content', '</div>'];
const html = renderComponentToString(MyComponent);
// Output: &lt;div&gt;Safe content&lt;/div&gt;

// Render props with proper escaping
const props = renderProps({ 
  className: 'my-class',
  title: 'Hello "World"'
});
// Output:  class="my-class" title="Hello &quot;World&quot;"
```

### Advanced SSR Features

#### Async Rendering

```ts
import { renderAsync, renderToStreamAsync } from '@qorejs/qore/ssr';

// Async component
const AsyncComponent = async () => {
  const data = await fetchData();
  return ['<div>', data.content, '</div>'];
};

const html = await renderAsync(AsyncComponent);
```

#### Streaming SSR

```ts
import { renderToStream } from '@qorejs/qore/ssr';
import { StreamRenderer } from '@qorejs/qore/stream';

const Component = () => 'Large content...';
const { renderer, promise, abort } = renderToStream(Component, {
  chunkSize: 1000,
  onChunk: (chunk) => {
    // Send chunk to client
    res.write(chunk);
  }
});

await promise;
renderer.end();
```

#### Prefetch and Render

```ts
import { prefetchAndRender } from '@qorejs/qore/ssr';

const html = await prefetchAndRender(
  async () => {
    // Fetch data
    return await db.query('SELECT * FROM posts');
  },
  (data) => () => {
    // Render with data
    return ['<div>', data.posts.length, ' posts</div>'];
  }
);
```

#### SSR with State Hydration

```ts
import { renderSSR } from '@qorejs/qore/ssr';

const result = await renderSSR(App, {
  includeState: true,
  state: { user: 'admin', theme: 'dark' },
  timeoutMs: 30000
});

// result.html - rendered HTML
// result.state - <script>window.__QORE_STATE__ = {...}</script>
// result.errors - any errors that occurred
```

#### Suspense for SSR

```ts
import { renderWithSuspense } from '@qorejs/qore/ssr';

const html = await renderWithSuspense(SlowComponent, {
  fallback: '<!-- Loading... -->',
  timeoutMs: 5000
});
```

## Migration Guide

### From Old API (v0.5.x)

**Before:**
```ts
import { renderToString } from '@qorejs/qore';
```

**After (Browser):**
```ts
import { renderToDOMString } from '@qorejs/qore';
// Or use the deprecated alias (will be removed in future)
import { renderToString } from '@qorejs/qore'; // Still works but deprecated
```

**After (SSR/Node.js):**
```ts
import { renderToString } from '@qorejs/qore/ssr';
```

### Backward Compatibility

For backward compatibility, the main export still includes deprecated aliases:

```ts
// These still work but are deprecated
import { 
  renderToString,      // → renderToDOMString
  renderComponentToString, // → renderComponentToDOMString
  renderAsync          // → renderDOMAsync
} from '@qorejs/qore';
```

⚠️ **These aliases will be removed in v1.0.0**. Update your imports to use the new names.

## API Reference

### Browser/DOM (`@qorejs/qore`)

| Function | Description |
|----------|-------------|
| `renderToDOMString(vnode)` | Convert VNode to HTML string (no escaping) |
| `renderComponentToDOMString(component)` | Render component to HTML string |
| `renderDOMAsync(vnode)` | Async VNode rendering |
| `renderToStreamDOM(root, fn)` | Stream rendering to DOM |

### SSR (`@qorejs/qore/ssr`)

| Function | Description |
|----------|-------------|
| `renderToString(vnode)` | Convert VNode to HTML string **with escaping** |
| `renderComponentToString(component)` | Render component **with escaping** |
| `renderProps(props)` | Render HTML attributes **with escaping** |
| `renderAsync(vnode)` | Async VNode rendering **with escaping** |
| `renderToStream(component, options)` | Streaming SSR |
| `renderToStreamAsync(component, renderer)` | Async streaming SSR |
| `prefetchAndRender(prefetchFn, renderFn)` | Prefetch data then render |
| `renderWithSuspense(component, options)` | SSR with suspense/fallback |
| `renderSSR(component, options)` | Full SSR with state hydration |
| `createPrefetchContext()` | Create prefetch context for data loading |

## Security

The SSR module automatically escapes HTML to prevent XSS attacks:

```ts
import { renderToString } from '@qorejs/qore/ssr';

// User input is automatically escaped
const userInput = '<script>alert("xss")</script>';
const safe = renderToString(userInput);
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

⚠️ **Never use `renderToDOMString` with user input** - it doesn't escape HTML and is vulnerable to XSS attacks.

## Performance Tips

1. **Use streaming for large content** - Don't wait for full render, stream chunks to client
2. **Prefetch data in parallel** - Use `prefetchAndRender` for optimal data loading
3. **Set appropriate timeouts** - Use `renderWithSuspense` to avoid hanging renders
4. **Cache rendered HTML** - For static content, cache the rendered HTML string

## Troubleshooting

### "document is not defined"

You're using the browser module in Node.js. Switch to SSR:

```ts
// ❌ Wrong (in Node.js)
import { renderToString } from '@qorejs/qore';

// ✅ Correct
import { renderToString } from '@qorejs/qore/ssr';
```

### HTML not escaped

Make sure you're using the SSR module:

```ts
// ❌ Wrong (no escaping)
import { renderToDOMString } from '@qorejs/qore';

// ✅ Correct (with escaping)
import { renderToString } from '@qorejs/qore/ssr';
```

### Component throws error in SSR

SSR wraps component rendering in try-catch and returns `<!-- Error -->`:

```ts
const BadComponent = () => {
  throw new Error('Oops');
};

const html = renderToString(BadComponent);
// Output: <!-- Error -->
```

Check your component code for server-incompatible APIs (e.g., `window`, `localStorage`).
