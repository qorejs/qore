/**
 * Qore Real-World Scenario Benchmarks
 */

import { signal, computed, effect, batch } from '../../packages/core/src/signal';
import { h, render, For, show } from '../../packages/core/src/render';

interface BenchmarkResult {
  scenario: string;
  metric: string;
  value: number;
  unit: string;
}

const results: BenchmarkResult[] = [];

function record(scenario: string, metric: string, value: number, unit: string) {
  results.push({ scenario, metric, value, unit });
  console.log(`📊 ${scenario} - ${metric}: ${value.toFixed(2)}${unit}`);
}

/**
 * Scenario 1: TodoMVC-style Application
 */
async function benchmarkTodoApp() {
  console.log('\n📝 Scenario 1: TodoMVC Application');
  
  interface Todo {
    id: number;
    text: string;
    completed: boolean;
  }
  
  const todos = signal<Todo[]>([]);
  const filter = signal<'all' | 'active' | 'completed'>('all');
  const newTodoText = signal('');
  
  const filteredTodos = computed(() => {
    const all = todos();
    if (filter() === 'active') return all.filter(t => !t.completed);
    if (filter() === 'completed') return all.filter(t => t.completed);
    return all;
  });
  
  const TodoApp = () => {
    return h('div', { class: 'todo-app' }, [
      h('h1', {}, 'Todos'),
      h('input', {
        type: 'text',
        placeholder: 'Add todo...',
        value: newTodoText(),
        oninput: (e: any) => newTodoText(e.target.value),
        onkeydown: (e: any) => {
          if (e.key === 'Enter' && newTodoText().trim()) {
            todos([...todos(), {
              id: Date.now(),
              text: newTodoText().trim(),
              completed: false
            }]);
            newTodoText('');
          }
        }
      }),
      h('div', { class: 'filters' }, [
        h('button', { onclick: () => filter('all') }, 'All'),
        h('button', { onclick: () => filter('active') }, 'Active'),
        h('button', { onclick: () => filter('completed') }, 'Completed')
      ]),
      h('ul', { class: 'todo-list' }, [
        ...For(filteredTodos, (todo) =>
          h('li', { key: todo.id, class: todo.completed ? 'completed' : '' }, [
            h('input', {
              type: 'checkbox',
              checked: todo.completed,
              onchange: () => {
                todos(todos().map(t =>
                  t.id === todo.id ? { ...t, completed: !t.completed } : t
                ));
              }
            }),
            h('span', {}, todo.text),
            h('button', {
              class: 'delete',
              onclick: () => todos(todos().filter(t => t.id !== todo.id))
            }, '×')
          ])
        )
      ]),
      h('div', { class: 'stats' }, [
        `Total: ${todos().length}, `,
        `Active: ${todos().filter(t => !t.completed).length}, `,
        `Completed: ${todos().filter(t => t.completed).length}`
      ])
    ]);
  };
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const start = performance.now();
  render(container, TodoApp);
  
  // Add 100 todos
  for (let i = 0; i < 100; i++) {
    todos([...todos(), { id: i, text: `Todo ${i}`, completed: false }]);
  }
  
  await new Promise(resolve => setTimeout(resolve, 50));
  const end = performance.now();
  
  record('TodoMVC', 'Initial render + 100 todos', end - start, 'ms');
  record('TodoMVC', 'Final todo count', todos().length, ' items');
  
  document.body.removeChild(container);
}

/**
 * Scenario 2: Form with Validation
 */
async function benchmarkFormValidation() {
  console.log('\n📝 Scenario 2: Form with Validation');
  
  interface FormData {
    name: string;
    email: string;
    age: number;
  }
  
  const form = signal<FormData>({ name: '', email: '', age: 0 });
  const errors = signal<Partial<Record<keyof FormData, string>>>({});
  const isSubmitting = signal(false);
  const isSubmitted = signal(false);
  
  const validate = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!form().name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!form().email.includes('@')) {
      newErrors.email = 'Valid email required';
    }
    
    if (form().age < 18) {
      newErrors.age = 'Must be 18 or older';
    }
    
    errors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const FormApp = () => {
    return h('div', { class: 'form-app' }, [
      show(isSubmitted, () => 
        h('div', { class: 'success' }, 'Form submitted successfully!')
      ),
      show(() => !isSubmitted(), () =>
        h('form', { class: 'form' }, [
          h('div', { class: 'field' }, [
            h('label', {}, 'Name'),
            h('input', {
              type: 'text',
              value: form().name,
              oninput: (e: any) => form({ ...form(), name: e.target.value })
            }),
            show(() => !!errors().name, () => 
              h('span', { class: 'error' }, errors().name)
            )
          ]),
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
            h('label', {}, 'Age'),
            h('input', {
              type: 'number',
              value: form().age,
              oninput: (e: any) => form({ ...form(), age: parseInt(e.target.value) || 0 })
            }),
            show(() => !!errors().age, () => 
              h('span', { class: 'error' }, errors().age)
            )
          ]),
          h('button', {
            type: 'button',
            disabled: isSubmitting(),
            onclick: () => {
              if (validate()) {
                isSubmitting(true);
                setTimeout(() => {
                  isSubmitting(false);
                  isSubmitted(true);
                }, 100);
              }
            }
          }, isSubmitting() ? 'Submitting...' : 'Submit')
        ])
      )
    ]);
  };
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(container, FormApp);
  
  // Simulate form interaction
  const start = performance.now();
  
  form({ name: 'John', email: 'john@example.com', age: 25 });
  validate();
  
  await new Promise(resolve => setTimeout(resolve, 50));
  const end = performance.now();
  
  record('Form Validation', 'Validation cycle', end - start, 'ms');
  record('Form Validation', 'Error count', Object.keys(errors()).length, ' errors');
  
  document.body.removeChild(container);
}

/**
 * Scenario 3: Data Dashboard with Live Updates
 */
async function benchmarkDashboard() {
  console.log('\n📝 Scenario 3: Live Data Dashboard');
  
  interface Metric {
    name: string;
    value: number;
    change: number;
  }
  
  const metrics = signal<Metric[]>([
    { name: 'Users', value: 1000, change: 5 },
    { name: 'Revenue', value: 50000, change: 12 },
    { name: 'Orders', value: 500, change: -3 },
    { name: 'Conversion', value: 2.5, change: 0.5 }
  ]);
  
  const isRefreshing = signal(false);
  const lastUpdated = signal<Date>(new Date());
  
  const Dashboard = () => {
    return h('div', { class: 'dashboard' }, [
      h('div', { class: 'header' }, [
        h('h1', {}, 'Dashboard'),
        h('button', {
          disabled: isRefreshing(),
          onclick: async () => {
            isRefreshing(true);
            await new Promise(r => setTimeout(r, 100));
            metrics(metrics().map(m => ({
              ...m,
              value: m.value * (1 + (Math.random() - 0.5) * 0.1),
              change: (Math.random() - 0.5) * 20
            })));
            lastUpdated(new Date());
            isRefreshing(false);
          }
        }, isRefreshing() ? 'Refreshing...' : 'Refresh')
      ]),
      h('div', { class: 'metrics' }, [
        ...metrics().map(metric =>
          h('div', { key: metric.name, class: 'metric-card' }, [
            h('div', { class: 'name' }, metric.name),
            h('div', { class: 'value' }, metric.value.toFixed(2)),
            h('div', { 
              class: `change ${metric.change >= 0 ? 'positive' : 'negative'}` 
            }, `${metric.change >= 0 ? '+' : ''}${metric.change.toFixed(1)}%`)
          ])
        )
      ]),
      h('div', { class: 'footer' }, [
        `Last updated: ${lastUpdated().toLocaleTimeString()}`
      ])
    ]);
  };
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(container, Dashboard);
  
  const start = performance.now();
  
  // Simulate 10 refresh cycles
  for (let i = 0; i < 10; i++) {
    metrics(metrics().map(m => ({
      ...m,
      value: m.value * 1.01
    })));
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const end = performance.now();
  
  record('Dashboard', '10 update cycles', end - start, 'ms');
  record('Dashboard', 'Metrics count', metrics().length, ' metrics');
  
  document.body.removeChild(container);
}

/**
 * Scenario 4: Infinite Scroll List
 */
async function benchmarkInfiniteScroll() {
  console.log('\n📝 Scenario 4: Infinite Scroll List');
  
  interface Item {
    id: number;
    title: string;
    description: string;
  }
  
  const items = signal<Item[]>([]);
  const page = signal(0);
  const isLoading = signal(false);
  const hasMore = signal(true);
  
  const loadMore = async () => {
    if (isLoading() || !hasMore()) return;
    
    isLoading(true);
    await new Promise(r => setTimeout(r, 50));
    
    const newItems = Array.from({ length: 20 }, (_, i) => ({
      id: page() * 20 + i,
      title: `Item ${page() * 20 + i}`,
      description: `Description for item ${page() * 20 + i}`
    }));
    
    items([...items(), ...newItems]);
    page(page() + 1);
    
    if (page() >= 50) {
      hasMore(false);
    }
    
    isLoading(false);
  };
  
  const InfiniteList = () => {
    return h('div', { class: 'infinite-list' }, [
      h('div', { class: 'items' }, [
        ...items().map(item =>
          h('div', { key: item.id, class: 'item' }, [
            h('h3', {}, item.title),
            h('p', {}, item.description)
          ])
        )
      ]),
      show(isLoading, () => h('div', { class: 'loading' }, 'Loading...')),
      show(() => !hasMore() && items().length > 0, () => 
        h('div', { class: 'end' }, 'No more items')
      ),
      show(() => hasMore() && !isLoading(), () =>
        h('button', { onclick: loadMore }, 'Load More')
      )
    ]);
  };
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(container, InfiniteList);
  
  const start = performance.now();
  
  // Load 5 pages
  for (let i = 0; i < 5; i++) {
    await loadMore();
  }
  
  const end = performance.now();
  
  record('Infinite Scroll', 'Load 5 pages (100 items)', end - start, 'ms');
  record('Infinite Scroll', 'Total items', items().length, ' items');
  
  document.body.removeChild(container);
}

/**
 * Run all scenarios
 */
async function runAllScenarios() {
  console.log('🚀 Starting Real-World Scenario Benchmarks\n');
  console.log('═'.repeat(50));
  
  await benchmarkTodoApp();
  await benchmarkFormValidation();
  await benchmarkDashboard();
  await benchmarkInfiniteScroll();
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ All scenarios completed!\n');
  
  return results;
}

if (typeof window !== 'undefined') {
  runAllScenarios().then(r => {
    console.log('Scenario results:', r);
  });
}

export { runAllScenarios };
