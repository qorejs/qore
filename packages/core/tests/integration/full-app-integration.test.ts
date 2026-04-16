import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal, computed, effect, batch } from '../../src/signal';
import { h, render, show, For } from '../../src/render';

/**
 * 完整应用集成测试
 * 测试 Qore 框架所有核心功能的协同工作
 */

describe('Full App Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should integrate signals with rendering', () => {
    const count = signal(0);
    
    const Counter = () => {
      return h('div', { class: 'counter' }, [
        h('span', {}, `Count: ${count()}`),
        h('button', { onclick: () => count(count() + 1) }, 'Increment')
      ]);
    };

    render(container, Counter);
    
    expect(container.innerHTML).toContain('Count: 0');
    
    count(5);
    expect(container.innerHTML).toContain('Count: 5');
  });

  it('should handle nested reactive components', () => {
    const todos = signal<string[]>([]);

    const TodoItem = (text: string) => {
      return h('li', {}, text);
    };

    const TodoList = () => {
      return h('ul', { class: 'todo-list' }, [
        ...todos().map(text => TodoItem(text))
      ]);
    };

    render(container, TodoList);
    
    todos(['Learn Qore', 'Build app', 'Deploy']);
    expect(container.querySelectorAll('li').length).toBe(3);
  });

  it('should integrate streaming state with rendering', async () => {
    const messages = signal<string[]>([]);
    const isStreaming = signal(false);

    const ChatApp = () => {
      return h('div', { class: 'chat' }, [
        h('div', { class: 'messages' }, [
          ...messages().map(msg => h('div', { class: 'message' }, msg))
        ]),
        h('div', { class: 'status' }, isStreaming() ? 'Streaming...' : 'Idle')
      ]);
    };

    render(container, ChatApp);
    
    expect(container.innerHTML).toContain('Idle');
    
    isStreaming(true);
    expect(container.innerHTML).toContain('Streaming...');
    
    messages(['Hello', 'World']);
    expect(container.querySelectorAll('.message').length).toBe(2);
  });

  it('should handle complex state management', () => {
    interface AppState {
      user: { name: string; age: number } | null;
      posts: Array<{ id: number; title: string }>;
      loading: boolean;
    }

    const state = signal<AppState>({
      user: null,
      posts: [],
      loading: false
    });

    const userName = computed(() => state().user?.name ?? 'Guest');
    const postCount = computed(() => state().posts.length);

    const Dashboard = () => {
      return h('div', { class: 'dashboard' }, [
        h('h1', {}, `Welcome, ${userName()}`),
        h('p', {}, `Posts: ${postCount()}`),
        h('p', {}, state().loading ? 'Loading...' : 'Ready')
      ]);
    };

    render(container, Dashboard);
    
    expect(container.innerHTML).toContain('Welcome, Guest');
    expect(container.innerHTML).toContain('Posts: 0');
    
    batch(() => {
      state({
        user: { name: 'Alice', age: 30 },
        posts: [{ id: 1, title: 'Hello' }],
        loading: false
      });
    });
    
    expect(container.innerHTML).toContain('Welcome, Alice');
    expect(container.innerHTML).toContain('Posts: 1');
  });

  it('should support component lifecycle with effects', async () => {
    const count = signal(0);
    let effectCount = 0;
    let cleanupCount = 0;

    const LifecycleComponent = () => {
      effect(() => {
        count();
        effectCount++;
        return () => {
          cleanupCount++;
        };
      });

      return h('div', {}, `Count: ${count()}`);
    };

    render(container, LifecycleComponent);
    expect(effectCount).toBe(1);
    
    count(1);
    await new Promise(resolve => setTimeout(resolve, 5));
    // Effect runs: initial (1) + component re-render creates new effect (2) + old effect triggered by count change (3)
    expect(effectCount).toBeGreaterThanOrEqual(2);
    expect(cleanupCount).toBeGreaterThanOrEqual(1);
  });

  it('should support conditional rendering with reactivity', () => {
    const isVisible = signal(true);
    const items = signal<string[]>([]);

    const ConditionalApp = () => {
      return h('div', {}, [
        isVisible() ? h('div', { class: 'visible' }, 'Visible Content') : null,
        items().length > 0 ? h('ul', {}, items().map(item => h('li', {}, item))) : null
      ]);
    };

    render(container, ConditionalApp);
    
    expect(container.innerHTML).toContain('Visible Content');
    expect(container.querySelector('ul')).toBeNull();
    
    isVisible(false);
    expect(container.innerHTML).not.toContain('Visible Content');
    
    items(['A', 'B']);
    expect(container.querySelectorAll('li').length).toBe(2);
  });

  it('should handle list rendering with For', () => {
    const items = signal<Array<{ id: number; text: string }>>([
      { id: 1, text: 'First' },
      { id: 2, text: 'Second' },
      { id: 3, text: 'Third' }
    ]);

    const ListApp = () => {
      return h('ul', {}, [
        ...For(items, (item) => 
          h('li', { key: item.id, 'data-id': item.id }, item.text)
        )
      ]);
    };

    render(container, ListApp);
    
    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect((lis[0] as HTMLElement).dataset.id).toBe('1');
    expect((lis[1] as HTMLElement).dataset.id).toBe('2');
    expect((lis[2] as HTMLElement).dataset.id).toBe('3');
    
    // Update list
    items([
      { id: 2, text: 'Second Updated' },
      { id: 4, text: 'Fourth' }
    ]);
    
    expect(container.querySelectorAll('li').length).toBe(2);
  });

  it('should integrate all features in a realistic scenario', async () => {
    interface Task {
      id: number;
      title: string;
      completed: boolean;
    }

    const tasks = signal<Task[]>([
      { id: 1, title: 'Learn Qore', completed: false },
      { id: 2, title: 'Build app', completed: true }
    ]);
    const filter = signal<'all' | 'active' | 'completed'>('all');

    const filteredTasks = computed(() => {
      const all = tasks();
      if (filter() === 'active') return all.filter(t => !t.completed);
      if (filter() === 'completed') return all.filter(t => t.completed);
      return all;
    });

    const TaskApp = () => {
      return h('div', { class: 'task-app' }, [
        h('h1', {}, 'Task Manager'),
        h('div', { class: 'filters' }, [
          h('button', { onclick: () => filter('all') }, 'All'),
          h('button', { onclick: () => filter('active') }, 'Active'),
          h('button', { onclick: () => filter('completed') }, 'Completed')
        ]),
        h('ul', { class: 'tasks' }, [
          ...For(filteredTasks, (task) =>
            h('li', { 
              key: task.id, 
              class: task.completed ? 'completed' : '' 
            }, [
              h('input', { 
                type: 'checkbox',
                checked: task.completed
              }),
              h('span', {}, task.title)
            ])
          )
        ])
      ]);
    };

    render(container, TaskApp);
    
    // Initial state
    expect(container.querySelectorAll('.tasks li').length).toBe(2);
    
    // Filter to active
    filter('active');
    expect(container.querySelectorAll('.tasks li').length).toBe(1);
    
    // Filter to completed
    filter('completed');
    expect(container.querySelectorAll('.tasks li').length).toBe(1);
    
    // Back to all
    filter('all');
    expect(container.querySelectorAll('.tasks li').length).toBe(2);
  });
});
