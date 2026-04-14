# 快速开始

欢迎使用 Qore！本指南将帮助你快速上手。

## 安装

### 创建新项目

```bash
pnpm create qore my-app
cd my-app
pnpm install
```

### 手动安装

```bash
pnpm add qore
```

## 第一个组件

```ts
import { signal, component } from 'qore'

const Counter = component(() => {
  const count = signal(0)
  
  return () => `
    <div>
      <p>Count: ${count()}</p>
      <button onclick="${() => count.set(count() + 1)}">
        Increment
      </button>
    </div>
  `
})

export default Counter
```

## 核心概念

### Signal

Signal 是 Qore 响应式系统的基础。

```ts
import { signal } from 'qore'

const count = signal(0)
console.log(count()) // 0
count.set(5)
console.log(count()) // 5
```

### Computed

Computed 自动追踪依赖并缓存结果。

```ts
import { signal, computed } from 'qore'

const price = signal(100)
const quantity = signal(2)
const total = computed(() => price() * quantity())

console.log(total()) // 200
price.set(150)
console.log(total()) // 300 (自动更新)
```

### Effect

Effect 用于副作用，自动追踪依赖。

```ts
import { signal, effect } from 'qore'

const name = signal('Qore')

effect(() => {
  console.log(`Hello, ${name()}!`)
})

name.set('World') // 自动重新执行
```

## 下一步

- [核心概念](/guide/core-concepts) - 深入了解 Qore 的设计理念
- [响应式系统](/guide/reactivity) - 学习细粒度响应式
- [组件系统](/guide/components) - 构建可复用组件
- [AI Native 特性](/guide/ai-native) - 探索 AI 集成
