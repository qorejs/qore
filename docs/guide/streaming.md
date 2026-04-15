# 流式渲染

Qore 提供强大的流式渲染支持，专为 AI 应用和实时数据设计。

## 为什么需要流式？

在传统的前端应用中，我们需要等待整个响应加载完成才能渲染。对于 AI 应用，这意味用户需要等待很长时间才能看到结果。

流式渲染允许我们：

- ✅ **即时显示** - 数据一到就渲染
- ✅ **渐进式加载** - 分块显示内容
- ✅ **更好的用户体验** - 减少等待时间
- ✅ **更低的内存占用** - 不需要缓存整个响应

## 基础流式

### 使用 stream 辅助函数

```typescript
import { signal } from '@qore/core';
import { h, render, stream } from '@qore/core';

const StreamingApp = () => {
  const content = signal('');
  const isComplete = signal(false);
  
  const loadStream = async () => {
    const response = await fetch('/api/stream');
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        isComplete(true);
        break;
      }
      
      const chunk = new TextDecoder().decode(value);
      content(content() + chunk);
    }
  };
  
  return h('div', {}, [
    h('button', { onclick: loadStream }, 'Load Stream'),
    h('div', { class: 'content' }, [
      content(),
      !isComplete() && h('span', { class: 'loading' }, '...')
    ])
  ]);
};
```

## AI 流式响应

### 聊天应用示例

```typescript
import { signal } from '@qore/core';
import { h, render } from '@qore/core';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const ChatApp = () => {
  const messages = signal<Message[]>([]);
  const input = signal('');
  
  const sendMessage = async () => {
    if (!input().trim()) return;
    
    // 添加用户消息
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: input()
    };
    messages([...messages(), userMsg]);
    input('');
    
    // 添加 AI 消息占位
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isStreaming: true
    };
    messages([...messages(), aiMsg]);
    
    // 流式获取响应
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...messages()]
      })
    });
    
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      
      // 更新 AI 消息内容
      const updated = messages().map(m =>
        m.id === aiMsg.id
          ? { ...m, content: m.content + chunk }
          : m
      );
      messages(updated);
    }
    
    // 标记流式完成
    const finalized = messages().map(m =>
      m.id === aiMsg.id
        ? { ...m, isStreaming: false }
        : m
    );
    messages(finalized);
  };
  
  return h('div', { class: 'chat' }, [
    h('div', { class: 'messages' }, [
      ...messages().map(msg =>
        h('div', {
          key: msg.id,
          class: `message ${msg.role}`
        }, [
          h('strong', {}, msg.role + ': '),
          h('span', {}, msg.content),
          msg.isStreaming && h('span', { class: 'cursor' }, '▋')
        ])
      )
    ]),
    h('input', {
      value: input(),
      placeholder: 'Type a message...',
      oninput: (e: any) => input(e.target.value),
      onkeydown: (e: any) => e.key === 'Enter' && sendMessage()
    })
  ]);
};
```

## 流式 SSR

Qore 支持服务端流式渲染：

```typescript
import { renderToStream } from '@qore/ssr';

const stream = await renderToStream(App, {
  // 启用 suspense 边界
  suspense: true,
  
  // 预取数据
  prefetch: async () => {
    const data = await fetchData();
    return { data };
  }
});

// 将流式传输到客户端
stream.pipe(res);
```

## 性能优化

### 批处理更新

```typescript
import { batch } from '@qore/core';

const handleStream = async () => {
  const response = await fetch('/api/stream');
  const reader = response.body.getReader();
  
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(new TextDecoder().decode(value));
    
    // 每 10 个 chunk 批量更新一次
    if (chunks.length % 10 === 0) {
      batch(() => {
        content(chunks.join(''));
        progress((chunks.length / totalChunks) * 100);
      });
    }
  }
  
  // 最终更新
  content(chunks.join(''));
};
```

### 虚拟列表

对于大量流式数据，使用虚拟列表：

```typescript
import { VirtualList } from '@qore/components';

const StreamList = () => {
  const items = signal([]);
  
  return h(VirtualList, {
    items: items(),
    itemHeight: 50,
    renderItem: (item) => h('div', { class: 'item' }, item.text)
  });
};
```

## 错误处理

```typescript
import { retry } from '@qore/core';

const robustStream = async () => {
  try {
    const response = await retry(
      () => fetch('/api/stream'),
      [],
      { maxRetries: 3, delay: 1000 }
    );
    
    if (!response.ok) throw new Error('Stream failed');
    
    // 处理流式响应...
  } catch (error) {
    errorState(`Stream error: ${error.message}`);
  }
};
```

## 最佳实践

1. **显示加载状态** - 让用户知道数据正在加载
2. **处理错误** - 提供重试机制
3. **限制更新频率** - 避免过于频繁的 DOM 更新
4. **使用批处理** - 合并多个更新
5. **清理资源** - 组件卸载时取消流式请求

## 相关资源

- [API 参考 - Streaming](/api/streaming)
- [示例 - AI 集成](/examples/ai-integration)
- [服务端渲染指南](/guide/ssr)
