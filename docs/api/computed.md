# Computed API

Computed 创建派生状态，自动追踪依赖。

## 创建 Computed

```ts
import { signal, computed } from 'qore'

const price = signal(100)
const quantity = signal(2)
const total = computed(() => price() * quantity())
```

## 只读

```ts
const total = computed(() => price() * quantity())
total() // 可以读取
total.set(500) // ❌ 错误：computed 是只读的
```

## 类型定义

```ts
interface Computed<T> {
  (): T
}
```
