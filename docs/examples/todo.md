# Todo 列表示例

```ts
import { component, signal, computed } from 'qore'

const TodoList = component(() => {
  const todos = signal([
    { id: 1, text: 'Learn Qore', done: true },
    { id: 2, text: 'Build something', done: false },
  ])
  const input = signal('')
  
  const remaining = computed(() => 
    todos().filter(t => !t.done).length
  )
  
  const addTodo = () => {
    if (!input()) return
    todos.set([...todos(), {
      id: Date.now(),
      text: input(),
      done: false
    }])
    input.set('')
  }
  
  const toggle = (id) => {
    todos.set(todos().map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ))
  }
  
  return () => `
    <div style="max-width: 400px; margin: 2rem auto;">
      <h1>Todo List</h1>
      <div>
        <input 
          value="${input()}" 
          oninput="${e => input.set(e.target.value)}"
          onkeypress="${e => e.key === 'Enter' && addTodo()}"
          placeholder="Add a todo..."
        />
        <button onclick="${addTodo}">Add</button>
      </div>
      <ul>
        ${todos().map(todo => `
          <li style="text-decoration: ${todo.done ? 'line-through' : 'none'}">
            <input 
              type="checkbox" 
              checked="${todo.done}" 
              onchange="${() => toggle(todo.id)}"
            />
            ${todo.text}
          </li>
        `).join('')}
      </ul>
      <p>${remaining()} remaining</p>
    </div>
  `
})

export default TodoList
```
