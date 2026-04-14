# 计数器示例

```ts
import { component, signal, computed } from 'qore'

const Counter = component(() => {
  const count = signal(0)
  const double = computed(() => count() * 2)
  
  return () => `
    <div style="text-align: center; padding: 2rem;">
      <h1>Counter</h1>
      <p style="font-size: 2rem;">${count()}</p>
      <p>Double: ${double()}</p>
      <button onclick="${() => count.set(count() - 1)}">-1</button>
      <button onclick="${() => count.set(count() + 1)}">+1</button>
      <button onclick="${() => count.set(0)}">Reset</button>
    </div>
  `
})

export default Counter
```
