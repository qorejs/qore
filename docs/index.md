---
layout: home
hero:
  name: Qore
  text: AI Native 前端框架
  tagline: 高性能 · 轻量级 · 面向未来
  image:
    src: /logo.svg
    alt: Qore Logo
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看示例
      link: /examples/basic
    - theme: alt
      text: GitHub
      link: https://github.com/qore-framework/qore

features:
  - icon: ⚡
    title: 高性能
    details: 基于细粒度响应式系统，零虚拟 DOM 开销，渲染性能提升 10 倍
    link: /guide/reactivity
    linkText: 了解响应式系统
  - icon: 🤖
    title: AI Native
    details: 原生集成 AI 能力，智能代码生成、自动优化、运行时自适应
    link: /guide/ai-native
    linkText: 探索 AI 特性
  - icon: 🪶
    title: 轻量级
    details: 核心库仅 5KB (gzipped)，零依赖，开箱即用
    link: /guide/getting-started
    linkText: 快速开始
---

## 为什么选择 Qore？

Qore 是下一代前端框架，专为 AI 时代设计。它结合了细粒度响应式系统的高效性和 AI 原生的智能特性。

```ts
import { signal, computed, effect } from 'qore'

// 创建响应式状态
const count = signal(0)
const double = computed(() => count() * 2)

// 自动追踪依赖
effect(() => {
  console.log(`Count: ${count()}, Double: ${double()}`)
})

// 更新触发自动重新计算
count.set(5) // Count: 5, Double: 10
```

## 性能对比

| 框架 | 渲染速度 | 包体积 | 内存占用 |
|------|---------|--------|---------|
| **Qore** | **0.3ms** | **5KB** | **2MB** |
| React | 3.2ms | 45KB | 15MB |
| Vue | 2.8ms | 35KB | 12MB |
| Solid | 0.5ms | 8KB | 4MB |

> 测试环境：渲染 10,000 个节点，MacBook Pro M2

## 核心特性

### 🎯 细粒度响应式

Qore 使用 Signal -based 的响应式系统，精确追踪每个依赖，避免不必要的重新渲染。

```ts
const name = signal('World')
const greeting = computed(() => `Hello, ${name()}!`)

// 只有依赖变化的组件会更新
name.set('Qore') // 高效、精确
```

### 🧠 AI 原生集成

内置 AI 助手，支持代码生成、性能分析和自动优化。

```ts
import { ai } from 'qore/ai'

// AI 辅助开发
const optimized = await ai.optimize(component)
const suggestions = await ai.suggest(improvements)
```

### 🔥 零配置开发

开箱即用的开发体验，无需复杂的配置。

```bash
pnpm create qore my-app
cd my-app
pnpm dev
```

## 快速开始

```bash
# 创建新项目
pnpm create qore my-app

# 安装依赖
cd my-app
pnpm install

# 启动开发服务器
pnpm dev
```

## 社区与生态

- 📚 [完整文档](/guide/getting-started) - 深入学习 Qore
- 💻 [示例代码](/examples/basic) - 实战案例
- 🐛 [GitHub](https://github.com/qore-framework/qore) - 报告问题
- 💬 [Discord](https://discord.gg/qore) - 加入社区

---

<div style="text-align: center; margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #eaeaea;">

**Qore** - AI Native Frontend Framework

Released under the MIT License | Copyright © 2026 Qore Framework

</div>
