# Qore Examples 示例集合

在线演示：**https://qorejs.dev/examples/**

## 📦 示例列表

### 基础示例

| 示例 | 描述 | 在线演示 |
|------|------|----------|
| [Basic Counter](./basic/) | 基础计数器 - 展示 signal/computed/effect | [查看代码](./basic/) |
| [Reactive Form](./basic/) | 响应式表单 - 双向绑定示例 | [查看代码](./basic/) |

### AI 集成示例

| 示例 | 描述 | 在线演示 |
|------|------|----------|
| [AI Chat](./ai-chat/) | AI 聊天应用 - 完整的对话界面 | [查看代码](./ai-chat/) |
| [AI Streaming](./ai-streaming-example.tsx) | AI 流式响应 - 实时文本输出 | [查看代码](./ai-streaming-example.tsx) |

### 流式渲染示例

| 示例 | 描述 | 在线演示 |
|------|------|----------|
| [Stream Demo](./stream-demo.tsx) | 流式 API 基础演示 | [查看代码](./stream-demo.tsx) |
| [Server Streaming](./streaming/server-streaming-example.tsx) | 服务端流式渲染 | [查看代码](./streaming/) |
| [Incremental Update](./incremental-update-demo.tsx) | 增量更新 - 局部刷新 | [查看代码](./incremental-update-demo.tsx) |

### 完整应用

| 示例 | 描述 | 在线演示 |
|------|------|----------|
| [Demo App](./demo-app/) | 综合演示应用 | [查看代码](./demo-app/) |

## 🚀 运行示例

### 前置条件

```bash
# 安装 pnpm
npm install -g pnpm

# 安装依赖
pnpm install
```

### 运行特定示例

```bash
# 基础示例
cd examples/basic
pnpm dev

# AI 聊天示例
cd examples/ai-chat
pnpm dev

# Demo 应用
cd examples/demo-app
pnpm dev
```

## 📖 文档

完整文档：**https://qorejs.dev/**

- [快速入门](https://qorejs.dev/guide/quick-start)
- [API 参考](https://qorejs.dev/api/signal)
- [使用指南](https://qorejs.dev/guide/introduction)

## 💡 示例说明

### Basic Counter (基础计数器)

最简单的 Qore 应用，展示核心概念：

```typescript
import { signal, computed, effect } from '@qorejs/qore';

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

count(count() + 1); // 触发更新
```

### AI Chat (AI 聊天)

完整的 AI 聊天应用，展示：
- ModelLoader 异步加载 AI 模型
- 流式响应处理
- 状态管理
- UI 组件使用

### Stream Demo (流式演示)

展示 Qore 的流式渲染能力：
- Suspense 组件
- 懒加载
- 增量更新
- 背压处理

## 🔗 相关链接

- GitHub: https://github.com/qorejs/qore
- npm: https://www.npmjs.com/package/@qorejs/qore
- 文档: https://qorejs.dev
- Discord: https://discord.gg/clawd
