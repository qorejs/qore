# AI Native 特性

Qore 是首个 AI Native 的前端框架。

## 智能代码生成

```ts
import { ai } from 'qore/ai'

const component = await ai.generate(`
  Create a todo list component with add, delete, and toggle features
`)
```

## 自动优化

```ts
import { ai } from 'qore/ai'

const optimized = await ai.optimize(myComponent, {
  target: 'performance',
  constraints: { maxSize: '5kb' }
})
```

## 运行时自适应

```ts
import { ai } from 'qore/ai'

ai.adapt({
  device: 'mobile',
  connection: 'slow',
  priority: 'performance'
})
```
