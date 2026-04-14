# 基础示例

## Hello World

```ts
import { component } from 'qore'

const Hello = component(() => {
  return () => `<h1>Hello, Qore!</h1>`
})
```

## 响应式文本

```ts
import { component, signal } from 'qore'

const Greeting = component(() => {
  const name = signal('World')
  
  return () => `
    <div>
      <input value="${name()}" oninput="${e => name.set(e.target.value)}" />
      <p>Hello, ${name()}!</p>
    </div>
  `
})
```
