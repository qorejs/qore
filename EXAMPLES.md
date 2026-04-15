# Qore Examples

Practical examples demonstrating Qore features and patterns.

---

## Table of Contents

- [Basic Examples](#basic-examples)
- [Intermediate Examples](#intermediate-examples)
- [Advanced Examples](#advanced-examples)
- [Real-World Patterns](#real-world-patterns)

---

## Basic Examples

### Counter

The classic counter example.

```typescript
import { signal, computed } from '@qore/core';
import { h, render } from '@qore/core';

const Counter = () => {
  const count = signal(0);
  const doubled = computed(() => count() * 2);
  
  return h('div', { class: 'counter' }, [
    h('h1', {}, `Count: ${count()}`),
    h('p', {}, `Doubled: ${doubled()}`),
    h('button', { onclick: () => count(count() + 1) }, '+'),
    h('button', { onclick: () => count(count() - 1) }, '-')
  ]);
};

render(document.getElementById('app')!, Counter);
```

---

### Todo List

Simple todo list with add, toggle, and delete.

```typescript
import { signal, computed } from '@qore/core';
import { h, render, For, show } from '@qore/core';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const TodoList = () => {
  const todos = signal<Todo[]>([]);
  const input = signal('');
  
  const addTodo = () => {
    if (!input().trim()) return;
    todos([...todos(), {
      id: Date.now(),
      text: input().trim(),
      completed: false
    }]);
    input('');
  };
  
  const toggleTodo = (id: number) => {
    todos(todos().map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };
  
  const deleteTodo = (id: number) => {
    todos(todos().filter(t => t.id !== id));
  };
  
  return h('div', { class: 'todo-list' }, [
    h('h1', {}, 'Todos'),
    
    h('div', { class: 'add' }, [
      h('input', {
        type: 'text',
        value: input(),
        placeholder: 'Add todo...',
        oninput: (e: any) => input(e.target.value),
        onkeydown: (e: any) => e.key === 'Enter' && addTodo()
      }),
      h('button', { onclick: addTodo }, 'Add')
    ]),
    
    h('ul', {}, [
      ...For(todos, (todo) =>
        h('li', { 
          key: todo.id,
          class: todo.completed ? 'completed' : ''
        }, [
          h('input', {
            type: 'checkbox',
            checked: todo.completed,
            onchange: () => toggleTodo(todo.id)
          }),
          h('span', {}, todo.text),
          h('button', { 
            class: 'delete',
            onclick: () => deleteTodo(todo.id) 
          }, '×')
        ])
      )
    ]),
    
    show(() => todos().length === 0, () =>
      h('p', { class: 'empty' }, 'No todos yet!')
    )
  ]);
};
```

---

### Conditional Rendering

Show/hide content based on state.

```typescript
import { signal } from '@qore/core';
import { h, render, show } from '@qore/core';

const Toggle = () => {
  const isVisible = signal(true);
  
  return h('div', {}, [
    h('button', { onclick: () => isVisible(!isVisible()) }, 'Toggle'),
    
    show(isVisible, () =>
      h('div', { class: 'content' }, [
        h('h2', {}, 'Visible Content'),
        h('p', {}, 'This content can be toggled.')
      ])
    ),
    
    show(() => !isVisible(), () =>
      h('p', { class: 'hidden' }, 'Content is hidden')
    )
  ]);
};
```

---

## Intermediate Examples

### Form with Validation

Complete form with real-time validation.

```typescript
import { signal, computed } from '@qore/core';
import { h, render, show } from '@qore/core';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

const LoginForm = () => {
  const form = signal<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const errors = computed(() => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    
    if (!form().email.includes('@')) {
      errs.email = 'Invalid email';
    }
    
    if (form().password.length < 8) {
      errs.password = 'Password must be 8+ characters';
    }
    
    if (form().password !== form().confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    
    return errs;
  });
  
  const isValid = computed(() => Object.keys(errors()).length === 0);
  const isSubmitting = signal(false);
  const isSubmitted = signal(false);
  
  const handleSubmit = async () => {
    if (!isValid()) return;
    
    isSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    isSubmitting(false);
    isSubmitted(true);
  };
  
  return h('form', { class: 'login-form' }, [
    h('h2', {}, 'Sign Up'),
    
    show(isSubmitted, () =>
      h('div', { class: 'success' }, 'Registration successful!')
    ),
    
    show(() => !isSubmitted(), () => [
      h('div', { class: 'field' }, [
        h('label', {}, 'Email'),
        h('input', {
          type: 'email',
          value: form().email,
          oninput: (e: any) => form({ ...form(), email: e.target.value })
        }),
        show(() => !!errors().email, () =>
          h('span', { class: 'error' }, errors().email)
        )
      ]),
      
      h('div', { class: 'field' }, [
        h('label', {}, 'Password'),
        h('input', {
          type: 'password',
          value: form().password,
          oninput: (e: any) => form({ ...form(), password: e.target.value })
        }),
        show(() => !!errors().password, () =>
          h('span', { class: 'error' }, errors().password)
        )
      ]),
      
      h('div', { class: 'field' }, [
        h('label', {}, 'Confirm Password'),
        h('input', {
          type: 'password',
          value: form().confirmPassword,
          oninput: (e: any) => form({ ...form(), confirmPassword: e.target.value })
        }),
        show(() => !!errors().confirmPassword, () =>
          h('span', { class: 'error' }, errors().confirmPassword)
        )
      ]),
      
      h('button', {
        type: 'button',
        disabled: !isValid() || isSubmitting(),
        onclick: handleSubmit
      }, isSubmitting() ? 'Submitting...' : 'Sign Up')
    ])
  ]);
};
```

---

### Fetch Data

Load and display async data.

```typescript
import { signal } from '@qore/core';
import { h, render, show } from '@qore/core';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserList = () => {
  const users = signal<User[]>([]);
  const isLoading = signal(true);
  const error = signal<Error | null>(null);
  
  const loadUsers = async () => {
    try {
      isLoading(true);
      const res = await fetch('https://jsonplaceholder.typicode.com/users');
      const data = await res.json();
      users(data);
      error(null);
    } catch (e) {
      error(e as Error);
    } finally {
      isLoading(false);
    }
  };
  
  // Load on mount
  loadUsers();
  
  return h('div', { class: 'user-list' }, [
    h('h2', {}, 'Users'),
    
    show(isLoading, () => h('div', { class: 'loading' }, 'Loading...')),
    
    show(error, () => h('div', { class: 'error' }, [
      h('p', {}, `Error: ${error()!.message}`),
      h('button', { onclick: loadUsers }, 'Retry')
    ])),
    
    show(() => !isLoading() && !error(), () =>
      h('ul', {}, [
        ...users().map(user =>
          h('li', { key: user.id }, [
            h('h3', {}, user.name),
            h('p', {}, user.email)
          ])
        )
      ])
    ),
    
    h('button', { onclick: loadUsers }, 'Refresh')
  ]);
};
```

---

## Advanced Examples

### AI Streaming Chat

Stream AI responses in real-time.

```typescript
import { signal } from '@qore/core';
import { h, render, show } from '@qore/core';
import { streamText } from '@qore/core';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const ChatApp = () => {
  const messages = signal<Message[]>([]);
  const input = signal('');
  const isStreaming = signal(false);
  
  const sendMessage = async () => {
    if (!input().trim() || isStreaming()) return;
    
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input().trim()
    };
    
    messages([...messages(), userMessage]);
    input('');
    isStreaming(true);
    
    // Add assistant message placeholder
    const assistantId = Date.now() + 1;
    const assistantContent = signal('');
    messages([...messages(), {
      id: assistantId,
      role: 'assistant',
      content: ''
    }]);
    
    // Simulate AI streaming response
    const response = "I'm an AI assistant. Here's my response streamed character by character!";
    
    for (let i = 0; i < response.length; i++) {
      await new Promise(r => setTimeout(r, 50));
      assistantContent(assistantContent() + response[i]);
      
      // Update message in list
      messages(messages().map(m =>
        m.id === assistantId ? { ...m, content: assistantContent() } : m
      ));
    }
    
    isStreaming(false);
  };
  
  return h('div', { class: 'chat-app' }, [
    h('h2', {}, 'AI Chat'),
    
    h('div', { class: 'messages' }, [
      ...messages().map(msg =>
        h('div', { 
          key: msg.id, 
          class: `message ${msg.role}` 
        }, [
          h('div', { class: 'role' }, msg.role),
          h('div', { class: 'content' }, [
            msg.content,
            show(() => msg.role === 'assistant' && !msg.content && isStreaming(), () =>
              h('span', { class: 'typing' }, '...')
            )
          ])
        ])
      )
    ]),
    
    h('div', { class: 'input' }, [
      h('input', {
        type: 'text',
        value: input(),
        placeholder: 'Type a message...',
        disabled: isStreaming(),
        oninput: (e: any) => input(e.target.value),
        onkeydown: (e: any) => e.key === 'Enter' && sendMessage()
      }),
      h('button', {
        onclick: sendMessage,
        disabled: !input().trim() || isStreaming()
      }, isStreaming() ? 'Thinking...' : 'Send')
    ])
  ]);
};
```

---

### Infinite Scroll

Load more content as user scrolls.

```typescript
import { signal } from '@qore/core';
import { h, render, show, For } from '@qore/core';

interface Post {
  id: number;
  title: string;
  body: string;
}

const InfiniteScroll = () => {
  const posts = signal<Post[]>([]);
  const page = signal(1);
  const isLoading = signal(false);
  const hasMore = signal(true);
  
  const loadMore = async () => {
    if (isLoading() || !hasMore()) return;
    
    isLoading(true);
    await new Promise(r => setTimeout(r, 500));
    
    // Simulate API
    const newPosts = Array.from({ length: 10 }, (_, i) => ({
      id: (page() - 1) * 10 + i + 1,
      title: `Post ${(page() - 1) * 10 + i + 1}`,
      body: `Content for post ${(page() - 1) * 10 + i + 1}`
    }));
    
    posts([...posts(), ...newPosts]);
    page(page() + 1);
    
    if (page() > 10) {
      hasMore(false);
    }
    
    isLoading(false);
  };
  
  return h('div', { class: 'infinite-scroll' }, [
    h('h2', {}, 'Posts'),
    
    h('div', { class: 'posts' }, [
      ...For(posts, (post) =>
        h('article', { key: post.id, class: 'post' }, [
          h('h3', {}, post.title),
          h('p', {}, post.body)
        ])
      )
    ]),
    
    show(isLoading, () => h('div', { class: 'loading' }, 'Loading more...')),
    
    show(() => !hasMore() && posts().length > 0, () =>
      h('div', { class: 'end' }, 'No more posts')
    ),
    
    show(() => hasMore() && !isLoading(), () =>
      h('button', { onclick: loadMore }, 'Load More')
    )
  ]);
};
```

---

## Real-World Patterns

### Debounced Search

```typescript
import { signal } from '@qore/core';
import { h, render } from '@qore/core';
import { debounce } from '@qore/core';

const SearchBox = () => {
  const query = signal('');
  const results = signal<string[]>([]);
  
  const search = debounce(async (q: string) => {
    if (!q.trim()) {
      results([]);
      return;
    }
    
    // Simulate search API
    await new Promise(r => setTimeout(r, 300));
    results([`Result 1 for "${q}"`, `Result 2 for "${q}"`]);
  }, 300);
  
  return h('div', { class: 'search' }, [
    h('input', {
      type: 'text',
      value: query(),
      placeholder: 'Search...',
      oninput: (e: any) => {
        query(e.target.value);
        search(e.target.value);
      }
    }),
    
    h('ul', { class: 'results' }, [
      ...results().map(r => h('li', {}, r))
    ])
  ]);
};
```

---

### Modal Dialog

```typescript
import { signal } from '@qore/core';
import { h, render, show, Portal } from '@qore/core';

const Modal = () => {
  const isOpen = signal(false);
  
  return h('div', {}, [
    h('button', { onclick: () => isOpen(true) }, 'Open Modal'),
    
    show(isOpen, () =>
      h('div', { 
        class: 'modal-overlay',
        onclick: () => isOpen(false)
      }, [
        h('div', { 
          class: 'modal-content',
          onclick: (e: any) => e.stopPropagation()
        }, [
          h('h2', {}, 'Modal Title'),
          h('p', {}, 'Modal content goes here.'),
          h('button', { onclick: () => isOpen(false) }, 'Close')
        ])
      ])
    )
  ]);
};
```

---

### Dark Mode Toggle

```typescript
import { signal, effect } from '@qore/core';
import { h, render } from '@qore/core';

const ThemeToggle = () => {
  const isDark = signal(false);
  
  effect(() => {
    document.body.classList.toggle('dark-mode', isDark());
    localStorage.setItem('theme', isDark() ? 'dark' : 'light');
  });
  
  return h('button', {
    class: isDark() ? 'dark' : 'light',
    onclick: () => isDark(!isDark())
  }, isDark() ? '🌙 Dark' : '☀️ Light');
};
```

---

## More Resources

- [API Reference](./API.md)
- [Quick Start](./QUICKSTART.md)
- [Demo App](./examples/demo-app/)
- [GitHub Examples](https://github.com/qore-framework/qore/tree/main/examples)
