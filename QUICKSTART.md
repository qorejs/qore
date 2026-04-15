# Qore Quick Start Guide

Get up and running with Qore in 5 minutes! 🚀

---

## Prerequisites

- Node.js 18+ 
- npm, pnpm, or yarn
- Basic TypeScript knowledge

---

## Step 1: Create a Project

```bash
# Create a new directory
mkdir qore-app
cd qore-app

# Initialize npm project
npm init -y

# Install Qore
npm install @qore/core

# Install TypeScript (optional but recommended)
npm install -D typescript
```

---

## Step 2: Create Your First App

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Qore App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./app.ts"></script>
</body>
</html>
```

Create `app.ts`:

```typescript
import { signal, computed } from '@qore/core';
import { h, render } from '@qore/core';

// Create reactive state
const count = signal(0);
const doubled = computed(() => count() * 2);

// Define a component
const Counter = () => {
  return h('div', { style: { textAlign: 'center', padding: '40px' } }, [
    h('h1', {}, 'Qore Counter'),
    h('p', { style: { fontSize: '24px', margin: '20px 0' } }, [
      `Count: ${count()}`
    ]),
    h('p', { style: { color: '#666' } }, [
      `Doubled: ${doubled()}`
    ]),
    h('button', {
      style: {
        padding: '10px 20px',
        fontSize: '16px',
        cursor: 'pointer',
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
      },
      onclick: () => count(count() + 1)
    }, 'Increment')
  ]);
};

// Mount the app
const app = document.getElementById('app');
if (app) {
  render(app, Counter);
}
```

---

## Step 3: Run It

Use any static file server:

```bash
# Using Vite (recommended)
npm install -D vite
npx vite

# Or using simple HTTP server
npx http-server

# Or open index.html directly in browser
open index.html
```

---

## Step 4: Learn the Basics

### Signals

```typescript
import { signal } from '@qore/core';

// Create a signal
const name = signal('World');

// Read value
console.log(name()); // "World"

// Update value
name('Qore');
console.log(name()); // "Qore"
```

### Computed

```typescript
import { signal, computed } from '@qore/core';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => 
  `${firstName()} ${lastName()}`
);

console.log(fullName()); // "John Doe"

firstName('Jane');
console.log(fullName()); // "Jane Doe" (auto-updates)
```

### Effects

```typescript
import { signal, effect } from '@qore/core';

const count = signal(0);

// Effect runs when dependencies change
effect(() => {
  console.log(`Count is: ${count()}`);
});

count(1); // Logs: "Count is: 1"
count(2); // Logs: "Count is: 2"
```

### Components

```typescript
import { h } from '@qore/core';

// Simple component
const Greeting = (props: { name: string }) => {
  return h('h1', {}, `Hello, ${props.name}!`);
};

// Usage
h(Greeting, { name: 'Qore' });
```

### Conditional Rendering

```typescript
import { show } from '@qore/core';

const Toggle = () => {
  const isVisible = signal(true);
  
  return h('div', {}, [
    show(isVisible, () => h('p', {}, 'Visible!')),
    show(() => !isVisible(), () => h('p', {}, 'Hidden!')),
    h('button', { 
      onclick: () => isVisible(!isVisible()) 
    }, 'Toggle')
  ]);
};
```

### List Rendering

```typescript
import { For } from '@qore/core';

const TodoList = () => {
  const items = signal(['Learn Qore', 'Build app', 'Deploy']);
  
  return h('ul', {}, [
    ...For(items, (item) => h('li', {}, item))
  ]);
};
```

---

## Step 5: Build Something Real

### Todo App Example

```typescript
import { signal, computed } from '@qore/core';
import { h, render, For, show } from '@qore/core';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const todos = signal<Todo[]>([]);
const filter = signal<'all' | 'active' | 'completed'>('all');

const filteredTodos = computed(() => {
  const all = todos();
  if (filter() === 'active') return all.filter(t => !t.completed);
  if (filter() === 'completed') return all.filter(t => t.completed);
  return all;
});

const TodoApp = () => {
  return h('div', { class: 'todo-app' }, [
    h('h1', {}, 'My Todos'),
    
    // Add todo
    h('input', {
      type: 'text',
      placeholder: 'Add todo...',
      onkeydown: (e: any) => {
        if (e.key === 'Enter' && e.target.value) {
          todos([...todos(), {
            id: Date.now(),
            text: e.target.value,
            completed: false
          }]);
          e.target.value = '';
        }
      }
    }),
    
    // Filters
    h('div', { class: 'filters' }, [
      h('button', { onclick: () => filter('all') }, 'All'),
      h('button', { onclick: () => filter('active') }, 'Active'),
      h('button', { onclick: () => filter('completed') }, 'Completed')
    ]),
    
    // List
    h('ul', {}, [
      ...For(filteredTodos, (todo) =>
        h('li', { 
          key: todo.id,
          style: { 
            textDecoration: todo.completed ? 'line-through' : 'none' 
          }
        }, [
          h('input', {
            type: 'checkbox',
            checked: todo.completed,
            onchange: () => {
              todos(todos().map(t =>
                t.id === todo.id ? { ...t, completed: !t.completed } : t
              ));
            }
          }),
          h('span', {}, todo.text)
        ])
      )
    ])
  ]);
};

render(document.getElementById('app')!, TodoApp);
```

---

## Next Steps

- 📖 Read the [API Reference](./API.md) for complete documentation
- 💻 Check out [Examples](./EXAMPLES.md) for more patterns
- 🏗️ Study the [Architecture](./ARCHITECTURE.md) to understand how Qore works
- 🎯 Build your first real project with Qore

---

## Need Help?

- 📚 [Documentation](./README.md)
- 💬 [Discord Community](https://discord.gg/qore)
- 🐛 [GitHub Issues](https://github.com/qore-framework/qore/issues)

---

**Happy Coding! 🎉**
