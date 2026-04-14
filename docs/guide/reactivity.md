# 响应式系统

Qore 的响应式系统基于 Signal，提供细粒度的依赖追踪。

## Signal

```ts
import { signal } from 'qore'

const count = signal(0)

// 读取值
console.log(count())

// 设置值
count.set(10)

// 更新值
count.update(n => n + 1)
```

## Computed

```ts
import { signal, computed } from 'qore'

const firstName = signal('John')
const lastName = signal('Doe')
const fullName = computed(() => `${firstName()} ${lastName()}`)
```

## Effect

```ts
import { signal, effect } from 'qore'

const todos = signal([])

effect(() => {
  saveToLocalStorage(todos())
})
```
