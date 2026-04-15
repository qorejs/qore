# 服务端渲染 (SSR)

Qore 提供完整的 SSR 支持，包括流式渲染和 Suspense 边界。

## 为什么需要 SSR？

服务端渲染带来以下优势：

- ✅ **更快的首屏加载** - 内容在服务器生成
- ✅ **更好的 SEO** - 搜索引擎可以抓取完整内容
- ✅ **社交分享** - Meta 标签在服务器渲染
- ✅ **渐进式增强** - 无 JavaScript 也能显示内容

## 基础 SSR

### 服务端渲染

```typescript
// server.ts
import { renderToString } from '@qore/ssr';
import { App } from './App';

const html = renderToString(App());

res.send(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>My App</title>
    </head>
    <body>
      <div id="app">${html}</div>
      <script type="module" src="/app.js"></script>
    </body>
  </html>
`);
```

### 客户端激活 (Hydration)

```typescript
// client.ts
import { hydrate } from '@qore/core';
import { App } from './App';

const app = document.getElementById('app');
hydrate(app, App());
```

## 流式 SSR

流式 SSR 允许分块发送 HTML，进一步提升首屏性能。

```typescript
import { renderToStream } from '@qore/ssr';

const stream = await renderToStream(App(), {
  // 启用 suspense
  suspense: true,
  
  // 预取数据
  prefetch: async () => {
    const data = await fetch('https://api.example.com/data');
    return { data };
  }
});

// 将流式传输到客户端
stream.pipe(res);
```

## Suspense 边界

Suspense 允许延迟渲染某些组件，直到它们准备好。

### 基础用法

```typescript
import { Suspense, lazy } from '@qore/core';

// 懒加载组件
const HeavyComponent = lazy(() => import('./HeavyComponent'));

const App = () => {
  return h('div', {}, [
    h('h1', {}, 'My App'),
    
    h(Suspense, {
      fallback: h('div', { class: 'loading' }, 'Loading...')
    }, [
      h(HeavyComponent, {})
    ])
  ]);
};
```

### 嵌套 Suspense

```typescript
const App = () => {
  return h(Suspense, {
    fallback: h('div', {}, 'Loading app...')
  }, [
    h(Header, {}),
    
    h(Suspense, {
      fallback: h('div', {}, 'Loading content...')
    }, [
      h(Content, {})
    ]),
    
    h(Suspense, {
      fallback: h('div', {}, 'Loading sidebar...')
    }, [
      h(Sidebar, {})
    ])
  ]);
};
```

## 数据预取

### 服务端预取

```typescript
// server.ts
import { renderToStream } from '@qore/ssr';

const stream = await renderToStream(App(), {
  prefetch: async () => {
    const [users, posts] = await Promise.all([
      fetch('https://api.example.com/users').then(r => r.json()),
      fetch('https://api.example.com/posts').then(r => r.json())
    ]);
    
    return { users, posts };
  }
});
```

### 客户端访问预取数据

```typescript
// App.tsx
import { usePrefetchedData } from '@qore/ssr';

const App = () => {
  const { users, posts } = usePrefetchedData();
  
  return h('div', {}, [
    h('h1', {}, 'Users'),
    ...users.map(user => h('div', {}, user.name)),
    
    h('h2', {}, 'Posts'),
    ...posts.map(post => h('div', {}, post.title))
  ]);
};
```

## 错误边界

```typescript
import { createErrorBoundary } from '@qore/core';

const ErrorBoundary = createErrorBoundary({
  fallback: (error) => h('div', { class: 'error' }, [
    h('h2', {}, 'Something went wrong'),
    h('p', {}, error.message)
  ])
});

const App = () => {
  return h(ErrorBoundary, {}, [
    h(HeavyComponent, {}),
    h(DataFetcher, {})
  ]);
};
```

## 完整示例

### 服务端代码

```typescript
// server.ts
import express from 'express';
import { renderToStream } from '@qore/ssr';
import { App } from './App';

const app = express();

app.get('*', async (req, res) => {
  try {
    const stream = await renderToStream(App(), {
      suspense: true,
      prefetch: async () => {
        const data = await fetch('https://api.example.com/data');
        return { data: await data.json() };
      }
    });
    
    res.setHeader('Content-Type', 'text/html');
    
    res.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>My Qore App</title>
        </head>
        <body>
          <div id="app">
    `);
    
    stream.on('data', (chunk) => {
      res.write(chunk);
    });
    
    stream.on('end', () => {
      res.write(`
          </div>
          <script type="module" src="/client.js"></script>
        </body>
      </html>
      `);
      res.end();
    });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

app.listen(3000);
```

### 客户端代码

```typescript
// client.ts
import { hydrate } from '@qore/core';
import { App } from './App';

const app = document.getElementById('app');
if (app) {
  hydrate(app, App());
}
```

## 性能优化

### 代码分割

```typescript
// 按需加载组件
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

const App = () => {
  const route = signal(window.location.pathname);
  
  return h('div', {}, [
    route() === '/dashboard' && h(Suspense, {
      fallback: h('div', {}, 'Loading dashboard...')
    }, [
      h(Dashboard, {})
    ]),
    
    route() === '/settings' && h(Suspense, {
      fallback: h('div', {}, 'Loading settings...')
    }, [
      h(Settings, {})
    ])
  ]);
};
```

### 流式 HTML

```typescript
const stream = await renderToStream(App(), {
  // 立即发送初始 HTML
  sendInitial: true,
  
  // 每收到一个 suspense 边界就发送
  flushSuspense: true
});
```

## 最佳实践

1. **预取关键数据** - 在服务端预取首屏需要的数据
2. **使用 Suspense** - 延迟加载非关键组件
3. **流式传输** - 使用流式 SSR 提升首屏性能
4. **错误处理** - 添加错误边界处理服务端错误
5. **缓存策略** - 缓存静态内容的 SSR 结果

## 相关资源

- [API 参考 - Renderer](/api/renderer)
- [性能优化指南](/blog/fine-grained-reactivity)
- [示例代码](/examples/basic)
