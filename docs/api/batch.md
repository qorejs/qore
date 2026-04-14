# Batch API

Batch 用于批量更新，避免多次触发重新计算。

## 批量更新

```ts
import { signal, batch } from 'qore'

const a = signal(0)
const b = signal(0)

batch(() => {
  a.set(1)
  b.set(2)
  // 只触发一次重新计算
})
```

## 使用场景

- 同时更新多个 signal
- 避免中间状态触发 effect
- 优化性能
