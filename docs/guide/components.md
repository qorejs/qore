# 组件系统

Qore 的组件是简单的函数，返回渲染函数。

## 基础组件

```ts
import { component, signal } from 'qore'

const Hello = component(({ name }) => {
  return () => `<h1>Hello, ${name}!</h1>`
})
```

## 状态组件

```ts
const Counter = component(() => {
  const count = signal(0)
  
  return () => `
    <div>
      <p>${count()}</p>
      <button onclick="${() => count.set(count() + 1)}">
        +1
      </button>
    </div>
  `
})
```

## 生命周期

```ts
const MyComponent = component(() => {
  const data = signal(null)
  
  onMount(async () => {
    data.set(await fetchData())
  })
  
  onUnmount(() => {
    cleanup()
  })
  
  return () => `<div>${data()}</div>`
})
```
