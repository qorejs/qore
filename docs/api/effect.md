# Effect API

Effect 用于副作用，自动追踪依赖并在依赖变化时重新执行。

## 创建 Effect

```ts
import { signal, effect } from 'qore'

const count = signal(0)

effect(() => {
  console.log(`Count: ${count()}`)
})
```

## 清理函数

```ts
effect(() => {
  const timer = setInterval(() => {
    console.log('tick')
  }, 1000)
  
  return () => clearInterval(timer)
})
```

## 停止 Effect

```ts
const dispose = effect(() => {
  console.log(count())
})

dispose() // 停止 effect
```
