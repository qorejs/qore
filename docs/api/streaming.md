# Streaming API

Qore 提供强大的流式处理 API，专为 AI 应用和实时数据设计。

## stream - 流式渲染组件

```typescript
function stream(
  component: Component,
  options?: {
    fallback?: Component,
    onError?: (error: Error) => void
  }
): VNode
```

**参数：**
- `component` - 要流式渲染的组件
- `options` - 可选配置
  - `fallback` - 加载时的占位组件
  - `onError` - 错误处理函数

**示例：**

```typescript
import { stream, h } from '@qore/core';

const AsyncComponent = async () => {
  const data = await fetchData();
  return h('div', {}, data);
};

const App = () => {
  return h('div', {}, [
    stream(AsyncComponent, {
      fallback: h('div', {}, 'Loading...'),
      onError: (error) => h('div', { class: 'error' }, error.message)
    })
  ]);
};
```

---

## streamText - 流式文本

```typescript
async function streamText(
  source: ReadableStream<string> | Response,
  onChunk: (chunk: string) => void,
  options?: {
    signal?: AbortSignal,
    onComplete?: () => void,
    onError?: (error: Error) => void
  }
): Promise<void>
```

**参数：**
- `source` - 流式源（ReadableStream 或 Response）
- `onChunk` - 每个 chunk 的回调
- `options` - 可选配置
  - `signal` - AbortSignal 用于取消
  - `onComplete` - 完成回调
  - `onError` - 错误处理

**示例：**

```typescript
import { streamText, signal } from '@qore/core';

const ChatApp = () => {
  const response = signal('');
  
  const handleAsk = async () => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'Hello' })
    });
    
    await streamText(res, (chunk) => {
      response(response() + chunk);
    }, {
      onComplete: () => console.log('Stream complete'),
      onError: (error) => console.error('Stream error:', error)
    });
  };
  
  return h('div', {}, [
    h('button', { onclick: handleAsk }, 'Ask AI'),
    h('p', {}, response())
  ]);
};
```

---

## StreamRenderer - 自定义流式渲染器

```typescript
class StreamRenderer {
  constructor(
    container: Element,
    options?: {
      chunkSize?: number,
      flushInterval?: number
    }
  )
  
  render(component: Component): void
  flush(): void
  destroy(): void
}
```

**示例：**

```typescript
import { StreamRenderer, h } from '@qore/core';

const container = document.getElementById('app');
const renderer = new StreamRenderer(container, {
  chunkSize: 100,
  flushInterval: 100
});

const App = () => h('div', {}, 'Streaming content...');

renderer.render(App);

// 手动刷新
renderer.flush();

// 清理
renderer.destroy();
```

---

## 流式数据处理

### 从 API 获取流式数据

```typescript
import { signal } from '@qore/core';

const fetchStream = async (url: string) => {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    console.log('Received chunk:', chunk);
  }
};
```

### 处理 Server-Sent Events (SSE)

```typescript
import { signal } from '@qore/core';

const connectSSE = (url: string) => {
  const data = signal('');
  const connected = signal(false);
  const error = signal(null);
  
  const eventSource = new EventSource(url);
  
  eventSource.onopen = () => {
    connected(true);
  };
  
  eventSource.onmessage = (event) => {
    data(event.data);
  };
  
  eventSource.onerror = () => {
    error('Connection failed');
    eventSource.close();
  };
  
  return { data, connected, error, close: () => eventSource.close() };
};
```

---

## AI 流式响应

### 完整的聊天应用

```typescript
import { signal, computed } from '@qore/core';
import { h, render, For } from '@qore/core';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const ChatApp = () => {
  const messages = signal<Message[]>([]);
  const input = signal('');
  const isLoading = signal(false);
  
  const sendMessage = async () => {
    if (!input().trim() || isLoading()) return;
    
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: input()
    };
    
    messages([...messages(), userMsg]);
    input('');
    isLoading(true);
    
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isStreaming: true
    };
    messages([...messages(), aiMsg]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages(), userMsg]
        })
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        
        const updated = messages().map(m =>
          m.id === aiMsg.id
            ? { ...m, content: m.content + chunk }
            : m
        );
        messages(updated);
      }
      
      const finalized = messages().map(m =>
        m.id === aiMsg.id
          ? { ...m, isStreaming: false }
          : m
      );
      messages(finalized);
    } catch (err) {
      const errored = messages().map(m =>
        m.id === aiMsg.id
          ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
          : m
      );
      messages(errored);
    } finally {
      isLoading(false);
    }
  };
  
  return h('div', { class: 'chat-app' }, [
    h('div', { class: 'messages' }, [
      ...For(messages, (msg) =>
        h('div', {
          key: msg.id,
          class: `message ${msg.role}`
        }, [
          h('div', { class: 'role' }, msg.role),
          h('div', { class: 'content' }, [
            msg.content,
            msg.isStreaming && h('span', { class: 'cursor' }, '▋')
          ])
        ])
      )
    ]),
    
    h('div', { class: 'input-area' }, [
      h('input', {
        type: 'text',
        value: input(),
        placeholder: 'Type a message...',
        oninput: (e: any) => input(e.target.value),
        onkeydown: (e: any) => e.key === 'Enter' && sendMessage(),
        disabled: isLoading()
      }),
      h('button', {
        onclick: sendMessage,
        disabled: isLoading() || !input().trim()
      }, isLoading() ? 'Sending...' : 'Send')
    ])
  ]);
};
```

---

## 错误处理

### 重试机制

```typescript
import { retry } from '@qore/core';

const fetchWithRetry = async (url: string) => {
  return await retry(
    async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    },
    [],
    {
      maxRetries: 3,
      delay: 1000,
      backoff: 2 // 指数退避
    }
  );
};
```

### 超时处理

```typescript
const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};
```

---

## 性能优化

### 批处理更新

```typescript
import { batch } from '@qore/core';

const handleStream = async () => {
  const response = await fetch('/api/stream');
  const reader = response.body.getReader();
  
  const chunks = [];
  let count = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(new TextDecoder().decode(value));
    count++;
    
    // 每 10 个 chunk 批量更新一次
    if (count % 10 === 0) {
      batch(() => {
        content(chunks.join(''));
        progress((count / totalChunks) * 100);
      });
    }
  }
  
  // 最终更新
  content(chunks.join(''));
};
```

### 防抖和节流

```typescript
import { debounce, throttle } from '@qore/core';

// 防抖 - 等待输入停止
const debouncedUpdate = debounce((value) => {
  search(value);
}, 300);

// 节流 - 限制更新频率
const throttledScroll = throttle(() => {
  updateScrollPosition();
}, 100);
```

---

## 相关资源

- [流式渲染指南](/guide/streaming)
- [AI 集成示例](/examples/ai-integration)
- [服务端渲染](/guide/ssr)
