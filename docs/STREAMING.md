# 🚀 Qore Stream - 流式渲染指南

Qore 提供完整的流式渲染支持，包括服务端流式输出、Suspense 异步加载和增量 DOM 更新。

## 目录

- [服务端流式渲染](#服务端流式渲染)
- [Suspense 异步加载](#suspense-异步加载)
- [Lazy Loading](#lazy-loading)
- [增量 DOM 更新](#增量-dom-更新)
- [性能优化](#性能优化)

---

## 服务端流式渲染

### StreamRenderer

`StreamRenderer` 是服务端流式渲染的核心类，支持分块输出 HTML 片段。

```typescript
import { StreamRenderer, createStreamHTML } from 'qore';

// 创建流式渲染器
const { renderer, html, stream } = createStreamHTML();

// 写入 HTML 块
renderer.write('<div class="header">Header Content</div>');

// 继续写入更多内容
renderer.write('<div class="body">Body Content</div>');

// 完成流式渲染
renderer.end();

// 获取完整 HTML
const fullHTML = renderer.getHTML();

// 或者使用异步迭代器
for await (const chunk of stream()) {
  console.log('Received chunk:', chunk);
}
```

### 流式渲染大型列表

```typescript
async function streamLargeList(count: number) {
  const { renderer } = createStreamHTML();
  
  renderer.write('<ul class="list">');
  
  const chunkSize = 100;
  for (let i = 0; i < count; i += chunkSize) {
    // 模拟数据获取延迟
    await fetchData();
    
    let chunk = '';
    for (let j = i; j < Math.min(i + chunkSize, count); j++) {
      chunk += `<li>Item ${j + 1}</li>`;
    }
    
    renderer.write(chunk);
  }
  
  renderer.write('</ul>');
  renderer.end();
}
```

### renderToStream

将组件渲染到流式输出：

```typescript
import { renderToStream, StreamRenderer } from 'qore';

function MyComponent() {
  return div({}, 
    h1({}, 'Hello World'),
    p({}, 'This is a component')
  );
}

const renderer = new StreamRenderer();
renderToStream(renderer, MyComponent, {
  chunkSize: 1000,
  onChunk: (chunk) => {
    console.log('Chunk rendered:', chunk);
  }
});
```

---

## Suspense 异步加载

`Suspense` 组件用于包裹异步加载的组件，在加载完成前显示 fallback 内容。

### 基本用法

```typescript
import { Suspense, asyncComponent } from 'qore';

// 异步组件
async function DataComponent() {
  const data = await fetch('/api/data');
  return div({}, 
    h1({}, 'Data Loaded'),
    p({}, JSON.stringify(data))
  );
}

// 使用 Suspense 包裹
function App() {
  const fallback = div({ className: 'loading' }, '⏳ Loading...');
  
  return div({},
    h1({}, 'My App'),
    
    // asyncComponent 自动处理异步加载
    asyncComponent(
      () => Promise.resolve({ default: DataComponent }),
      fallback
    )()
  );
}
```

### 手动控制 Suspense 状态

```typescript
import { Suspense, setSuspenseState } from 'qore';

function ManualSuspense() {
  return Suspense({
    fallback: div({}, 'Loading...'),
    children: () => div({}, 'Content Loaded!'),
    onError: (error) => {
      console.error('Loading failed:', error);
    }
  });
}

// 在异步操作完成后更新状态
async function loadData() {
  setSuspenseState('pending');
  
  try {
    await fetchData();
    setSuspenseState('resolved');
  } catch (error) {
    setSuspenseState('error', error);
  }
}
```

---

## Lazy Loading

`lazy()` 函数用于创建懒加载组件，按需加载重型组件。

### 基本用法

```typescript
import { lazy } from 'qore';

// 创建懒加载组件工厂
const HeavyComponent = lazy(() => 
  import('./HeavyComponent').then(mod => ({ default: mod.HeavyComponent }))
);

// 使用
function App() {
  const lazyFactory = HeavyComponent();
  const { load, component } = lazyFactory();
  
  return div({},
    button({
      onClick: async () => {
        await load(); // 触发加载
      }
    }, 'Load Component'),
    
    component ? component() : div({}, 'Not loaded yet')
  );
}
```

### 代码分割

```typescript
// 按路由分割
const HomePage = lazy(() => import('./pages/Home'));
const AboutPage = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function Router() {
  const route = getCurrentRoute();
  
  switch (route) {
    case 'home':
      return HomePage().component?.() || <Loading />;
    case 'about':
      return AboutPage().component?.() || <Loading />;
    case 'dashboard':
      return Dashboard().component?.() || <Loading />;
  }
}
```

---

## 增量 DOM 更新

Qore 支持服务端推送的增量 DOM 更新，无需重新渲染整个页面。

### 创建增量更新

```typescript
import { createUpdate, applyUpdate } from 'qore';

// 创建更新
const update = createUpdate(
  'item-1',           // 元素 ID
  '<div>New Content</div>',  // 新 HTML
  'replace'           // 更新类型
);

// 应用更新
applyUpdate(container, update);
```

### 更新类型

- `replace` - 替换元素
- `append` - 追加到元素内部末尾
- `prepend` - 插入到元素内部开头
- `remove` - 删除元素

### 服务端推送示例

```typescript
// 服务端
const { renderer } = createStreamHTML();

// 发送增量更新
const update = {
  id: 'notification-1',
  html: '<div class="notification">New message!</div>',
  type: 'append'
};

renderer.write(JSON.stringify(update));
```

### 客户端接收

```typescript
import { renderToStream } from 'qore';

// 创建异步流
async function* serverStream() {
  const response = await fetch('/stream');
  const reader = response.body.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = new TextDecoder().decode(value);
    yield chunk;
  }
}

// 渲染到 DOM
const container = document.getElementById('app');
renderToStream(container, serverStream());
```

---

## 性能优化

### 1. 分块大小优化

```typescript
// 根据内容类型选择合适的 chunkSize
const config = {
  text: 2000,      // 文本内容 - 较大块
  html: 1000,      // HTML 结构 - 中等块
  interactive: 500 // 交互式组件 - 较小块
};
```

### 2. 预加载关键组件

```typescript
// 在空闲时预加载
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    HeavyComponent().load();
  });
}
```

### 3. 流式渲染优先级

```typescript
// 优先渲染关键内容
async function renderPage() {
  const { renderer } = createStreamHTML();
  
  // 1. 立即渲染头部
  renderer.write(renderToString(Header()));
  
  // 2. 流式渲染主体
  await streamContent(renderer);
  
  // 3. 最后渲染非关键内容
  renderer.write(renderToString(Footer()));
  
  renderer.end();
}
```

### 4. 内存管理

```typescript
// 清理已完成的流
const { abort } = renderToStream(container, stream);

// 组件卸载时清理
onUnmount(() => {
  abort();
});
```

---

## API 参考

### StreamRenderer

| 方法 | 描述 |
|------|------|
| `write(chunk: string)` | 写入 HTML 块 |
| `end()` | 完成流式渲染 |
| `fail(error: Error)` | 抛出错误 |
| `subscribe(callback)` | 订阅流式输出 |
| `getHTML()` | 获取完整 HTML |

### Suspense

| 属性 | 类型 | 描述 |
|------|------|------|
| `fallback` | VNode | 加载时显示的内容 |
| `children` | () => VNode | 异步组件 |
| `onError` | (error) => void | 错误处理回调 |

### lazy()

```typescript
function lazy<T>(
  importFn: () => Promise<{ default: T }>
): () => { 
  load: () => Promise<T>; 
  component: T | null 
}
```

### IncrementalUpdate

```typescript
interface IncrementalUpdate {
  id: string;
  html: string;
  type: 'replace' | 'append' | 'prepend' | 'remove';
}
```

---

## 最佳实践

1. **优先渲染关键内容** - 先输出 Above-the-fold 内容
2. **合理分块** - 避免过大或过小的 chunk
3. **错误处理** - 始终处理流式渲染错误
4. **清理资源** - 组件卸载时中止流
5. **渐进增强** - 确保无 JS 时仍有基本内容

---

## 示例项目

查看完整示例：
- [Server Streaming Example](../examples/streaming/server-streaming-example.tsx)
- [Performance Benchmarks](../benchmarks/streaming/streaming-benchmark.ts)
