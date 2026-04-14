# Qore Stream API

Streaming components for AI responses and incremental content rendering.

## Overview

Qore provides built-in streaming support optimized for AI-native applications. Streams allow you to render content incrementally as it arrives, perfect for chat interfaces, AI responses, and real-time updates.

## Core API

### `createStream`

Create a streaming component that supports incremental updates.

```typescript
function createStream(
  fn: (writer: StreamWriter) => Promise<void>,
  options?: StreamOptions
): StreamInstance
```

**Parameters:**
- `fn` - Async function that receives a writer to stream content
- `options` - Configuration options
  - `container?: HTMLElement` - Target DOM element
  - `onError?: (error: Error) => void` - Error callback
  - `onComplete?: () => void` - Completion callback

**Returns:** `StreamInstance` with writer, signals, and control methods

**Example:**
```typescript
const chatStream = createStream(async (writer) => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'Hello!' })
  });
  
  for await (const chunk of response.body) {
    writer.append(chunk);
  }
});
```

### `StreamWriter`

Interface for writing streaming content.

```typescript
interface StreamWriter {
  write(vnode: VNode): void;      // Initial write
  update(vnode: VNode): void;     // Full update
  patch(vnode: VNode): void;      // Incremental patch (diff-based)
  append(vnode: VNode): void;     // Append to existing content
  clear(): void;                  // Clear all content
}
```

**Methods:**
- `write` - Set initial content
- `update` - Replace entire content
- `patch` - Apply incremental changes using diff algorithm
- `append` - Add content to the end
- `clear` - Remove all content

### `StreamInstance`

Control object returned by `createStream`.

```typescript
interface StreamInstance {
  writer: StreamWriter;
  content: Signal<VNode | null>;
  isComplete: Signal<boolean>;
  error: Signal<Error | null>;
  abort(): void;
}
```

**Properties:**
- `writer` - StreamWriter for adding content
- `content` - Reactive signal with current VNode
- `isComplete` - Signal indicating completion
- `error` - Signal with any error that occurred
- `abort()` - Cancel the stream

## Helper Functions

### `streamText`

Create a typewriter-style text stream.

```typescript
function streamText(
  text: string,
  options?: {
    container?: HTMLElement;
    speed?: number;        // ms per character (default: 50)
    onComplete?: () => void;
  }
): StreamInstance
```

**Example:**
```typescript
streamText('Hello, World!', {
  container: output,
  speed: 30,
  onComplete: () => console.log('Done!')
});
```

### `streamMarkdown`

Stream markdown content with incremental parsing.

```typescript
function streamMarkdown(
  markdown: string,
  options?: {
    container?: HTMLElement;
    speed?: number;        // ms per line (default: 30)
    onComplete?: () => void;
  }
): StreamInstance
```

**Example:**
```typescript
streamMarkdown('# Hello\n\nThis is **markdown**.', {
  container: output,
  speed: 20
});
```

### `streamCode`

Stream code with syntax highlighting.

```typescript
function streamCode(
  code: string,
  language?: string,       // default: 'typescript'
  options?: {
    container?: HTMLElement;
    speed?: number;        // ms per character (default: 20)
    onComplete?: () => void;
  }
): StreamInstance
```

**Example:**
```typescript
streamCode('console.log("Hello!")', 'typescript', {
  container: output,
  speed: 15
});
```

### `createStreamWriter`

Create a standalone stream writer for manual control.

```typescript
function createStreamWriter(
  container: HTMLElement,
  options?: StreamOptions
): { 
  writer: StreamWriter; 
  stream: StreamInstance 
}
```

**Example:**
```typescript
const { writer, stream } = createStreamWriter(container);

// Manual control
writer.write(h('div', null, 'Initial'));
writer.append(h('span', null, 'Added'));
```

## AI Integration Patterns

### Chat Interface

```typescript
async function handleUserMessage(prompt: string) {
  const stream = createStream(async (writer) => {
    // Show loading
    writer.write(h('div', { className: 'loading' }, 'Thinking...'));
    
    // Fetch AI response
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    
    // Stream response
    writer.clear();
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      writer.append(h('span', null, chunk));
    }
  });
  
  return stream;
}
```

### Markdown Rendering

```typescript
const mdStream = streamMarkdown(aiResponse, {
  container: output,
  speed: 20,
  onComplete: () => {
    // Apply syntax highlighting
    Prism.highlightAll();
  }
});
```

### Error Handling

```typescript
const stream = createStream(async (writer) => {
  const response = await fetch('/api/ai');
  if (!response.ok) throw new Error('Failed to fetch');
  
  for await (const chunk of response.body) {
    writer.append(chunk);
  }
}, {
  onError: (error) => {
    console.error('Stream error:', error);
    // Show error UI
  },
  onComplete: () => {
    console.log('Stream completed');
  }
});

// Can abort if needed
// stream.abort();
```

## Performance Tips

1. **Use `patch` for incremental updates** - More efficient than `update`
2. **Batch writes when possible** - Reduce DOM operations
3. **Set appropriate speeds** - Balance UX and performance
4. **Handle errors gracefully** - Always provide `onError` callback
5. **Clean up on unmount** - Call `abort()` to prevent memory leaks

## Browser Support

- Chrome 76+
- Firefox 68+
- Safari 13+
- Edge 79+

Requires support for:
- Async generators
- ReadableStream
- Promise

## See Also

- [Diff API](./diff.md) - Incremental patching algorithm
- [Suspense API](./suspense.md) - Async loading components
- [AI Streaming Example](../examples/ai-streaming.md) - Complete examples
