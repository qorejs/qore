# 核心概念

Qore 的设计基于几个核心概念，理解它们将帮助你更好地使用框架。

## 响应式优先

Qore 采用细粒度响应式系统，每个值的变化都会精确地触发依赖更新。

```ts
const a = signal(1)
const b = signal(2)
const sum = computed(() => a() + b())

effect(() => {
  console.log(`Sum: ${sum()}`)
})

a.set(10) // 只重新计算 sum，不触发其他无关更新
```

## 零虚拟 DOM

Qore 不使用虚拟 DOM，直接操作真实 DOM，性能更优。

## AI Native

Qore 内置 AI 能力，支持：
- 智能代码生成
- 自动性能优化
- 运行时自适应调整

## 类型安全

完全使用 TypeScript 编写，提供完整的类型推断。
