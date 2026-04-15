/**
 * Qore Demo Application - TodoMVC
 * 
 * This demo showcases all core Qore features:
 * - Signals & Reactive State
 * - Computed Values
 * - Component Rendering
 * - Conditional Rendering
 * - List Rendering
 * - Event Handling
 */

import { signal, computed, batch } from '../../../packages/core/src/signal';
import { h, render, For, show } from '../../../packages/core/src/render';

// ============ Types ============
interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

type FilterType = 'all' | 'active' | 'completed';

// ============ State ============
const todos = signal<Todo[]>([]);
const filter = signal<FilterType>('all');
const newTodoText = signal('');
const editingId = signal<number | null>(null);
const editText = signal('');

// ============ Computed ============
const filteredTodos = computed(() => {
  const all = todos();
  if (filter() === 'active') return all.filter(t => !t.completed);
  if (filter() === 'completed') return all.filter(t => t.completed);
  return all;
});

const stats = computed(() => {
  const all = todos();
  return {
    total: all.length,
    active: all.filter(t => !t.completed).length,
    completed: all.filter(t => t.completed).length
  };
});

const hasCompleted = computed(() => stats().completed > 0);
const hasTodos = computed(() => stats().total > 0);

// ============ Actions ============
function addTodo() {
  const text = newTodoText().trim();
  if (!text) return;
  
  batch(() => {
    todos([
      ...todos(),
      {
        id: Date.now(),
        text,
        completed: false,
        createdAt: Date.now()
      }
    ]);
    newTodoText('');
  });
}

function toggleTodo(id: number) {
  todos(todos().map(t =>
    t.id === id ? { ...t, completed: !t.completed } : t
  ));
}

function deleteTodo(id: number) {
  todos(todos().filter(t => t.id !== id));
}

function clearCompleted() {
  todos(todos().filter(t => !t.completed));
}

function startEditing(todo: Todo) {
  editingId(todo.id);
  editText(todo.text);
}

function saveEdit() {
  const id = editingId();
  if (id === null) return;
  
  const text = editText().trim();
  if (text) {
    todos(todos().map(t =>
      t.id === id ? { ...t, text } : t
    ));
  } else {
    deleteTodo(id);
  }
  
  editingId(null);
}

function cancelEdit() {
  editingId(null);
}

// ============ Components ============
const TodoItem = (todo: Todo) => {
  const isEditing = editingId() === todo.id;
  
  if (isEditing) {
    return h('li', { class: 'todo-item editing' }, [
      h('input', {
        type: 'text',
        class: 'edit-input',
        value: editText(),
        oninput: (e: any) => editText(e.target.value),
        onblur: saveEdit,
        onkeydown: (e: any) => {
          if (e.key === 'Enter') saveEdit();
          if (e.key === 'Escape') cancelEdit();
        },
        autofocus: true
      })
    ]);
  }
  
  return h('li', { 
    class: `todo-item ${todo.completed ? 'completed' : ''}` 
  }, [
    h('input', {
      type: 'checkbox',
      checked: todo.completed,
      onchange: () => toggleTodo(todo.id)
    }),
    h('span', { 
      class: 'todo-text',
      ondblclick: () => startEditing(todo)
    }, todo.text),
    h('button', {
      class: 'delete-btn',
      onclick: () => deleteTodo(todo.id)
    }, '×')
  ]);
};

const FilterButton = (type: FilterType, label: string) => {
  const isActive = filter() === type;
  return h('button', {
    class: isActive ? 'active' : '',
    onclick: () => filter(type)
  }, label);
};

const TodoApp = () => {
  return h('div', { class: 'container' }, [
    h('h1', {}, 'Qore Todos'),
    
    // Add Todo
    h('div', { class: 'add-todo' }, [
      h('input', {
        type: 'text',
        placeholder: 'What needs to be done?',
        value: newTodoText(),
        oninput: (e: any) => newTodoText(e.target.value),
        onkeydown: (e: any) => {
          if (e.key === 'Enter') addTodo();
        }
      }),
      h('button', { onclick: addTodo }, 'Add')
    ]),
    
    // Filter Buttons
    show(hasTodos, () =>
      h('div', { class: 'filters' }, [
        FilterButton('all', 'All'),
        FilterButton('active', 'Active'),
        FilterButton('completed', 'Completed')
      ])
    ),
    
    // Todo List
    show(hasTodos, () =>
      h('ul', { class: 'todo-list' }, [
        ...For(filteredTodos, (todo) => TodoItem(todo))
      ])
    ),
    
    // Empty State
    show(() => !hasTodos(), () =>
      h('div', { class: 'empty-state' }, [
        h('p', {}, 'No todos yet!'),
        h('p', {}, 'Add one above to get started.')
      ])
    ),
    
    // Stats & Clear Completed
    show(hasTodos, () =>
      h('div', { class: 'stats' }, [
        h('span', {}, 
          `${stats().active} item${stats().active !== 1 ? 's' : ''} left`
        ),
        show(hasCompleted, () =>
          h('button', {
            class: 'clear-completed',
            onclick: clearCompleted,
            style: { marginLeft: '10px' }
          }, 'Clear completed')
        )
      ])
    )
  ]);
};

// ============ Initialize ============
// Add some sample todos
batch(() => {
  todos([
    { id: 1, text: 'Learn Qore framework', completed: true, createdAt: Date.now() - 100000 },
    { id: 2, text: 'Build amazing apps', completed: false, createdAt: Date.now() - 50000 },
    { id: 3, text: 'Share with the world', completed: false, createdAt: Date.now() }
  ]);
});

// Mount the app
const app = document.getElementById('app');
if (app) {
  render(app, TodoApp);
}

console.log('🚀 Qore Demo App mounted!');
console.log('Features demonstrated:');
console.log('  ✓ Signals & Reactive State');
console.log('  ✓ Computed Values');
console.log('  ✓ Component Rendering');
console.log('  ✓ Conditional Rendering (show)');
console.log('  ✓ List Rendering (For)');
console.log('  ✓ Event Handling');
console.log('  ✓ Batch Updates');
