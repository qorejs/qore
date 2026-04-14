# Component API

Component 是 Qore 的 UI 构建单元。

## 创建组件

```ts
import { component, signal } from 'qore'

const Hello = component(({ name }) => {
  return () => `<h1>Hello, ${name}!</h1>`
})
```

## 生命周期

```ts
import { component, onMount, onUnmount } from 'qore'

const MyComponent = component(() => {
  onMount(() => {
    console.log('mounted')
  })
  
  onUnmount(() => {
    console.log('unmounted')
  })
  
  return () => `<div>Content</div>`
})
```
