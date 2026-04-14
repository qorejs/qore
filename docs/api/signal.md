# Signal API

Signal 是 Qore 响应式系统的基础构建块。

## 创建 Signal

```ts
import { signal } from 'qore'

const count = signal(0)
const name = signal('Qore')
const items = signal([])
```

## 读取值

```ts
const count = signal(0)
console.log(count()) // 0
```

## 设置值

```ts
const count = signal(0)
count.set(10)
```

## 更新值

```ts
const count = signal(0)
count.update(n => n + 1)
```

## 类型定义

```ts
interface Signal<T> {
  (): T
  set(value: T): void
  update(fn: (value: T) => T): void
}
```
