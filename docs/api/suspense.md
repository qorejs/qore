# Qore Suspense API

Async loading and data fetching for components.

## Overview

Qore Suspense provides patterns for handling async operations in UI components, including lazy loading, data fetching, and error handling.

## Core API

### `createSuspense`

Create a suspense boundary for async content.

```typescript
function createSuspense<T>(
  asyncFn: () => Promise<T>,
  options?: SuspenseOptions
): {
  data: Signal<T | null>;
  state: Signal<SuspenseState>;
  refresh: () => void;
}
```

**Parameters:**
- `asyncFn` - Async function that returns the content
- `options` - Configuration
  - `fallback?: VNode` - Loading fallback UI
  - `onError?: (error: Error) => void` - Error callback
  - `timeout?: number` - Timeout in ms

**Returns:** Object with reactive signals and refresh function

**Example:**
```typescript
const { data, state, refresh } = createSuspense(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  {
    onError: (err) => console.error(err),
  }
);

// Reactive usage
effect(() => {
  const s = state.get();
  if (s.loading) console.log('Loading...');
  if (s.error) console.error(s.error);
  if (s.hasData) console.log('Data:', data.get());
});
```

### `SuspenseState`

State of a suspense boundary.

```typescript
interface SuspenseState {
  loading: boolean;
  error: Error | null;
  hasData: boolean;
}
```

### `Suspense` Component

Wrapper component for async components.

```typescript
function Suspense<P extends Props>(
  asyncComponent: Component<P>,
  props: P,
  options?: SuspenseOptions
): Component<P>
```

**Example:**
```typescript
const AsyncProfile = Suspense(
  async (props) => {
    const user = await fetchUser(props.userId);
    return h('div', null, h('h1', null, user.name));
  },
  { userId: 123 },
  {
    fallback: h('div', { className: 'loading' }, 'Loading profile...')
  }
);
```

### `lazy`

Lazy load a component.

```typescript
function lazy<P extends Props>(
  importFn: () => Promise<{ default: Component<P> }>
): Component<P>
```

**Example:**
```typescript
const HeavyComponent = lazy(() => 
  import('./HeavyComponent')
);

// Use with Suspense
render(
  h(Suspense, 
    { fallback: h('div', null, 'Loading...') },
    h(HeavyComponent, { data: props })
  ),
  container
);
```

### `useAsyncData`

Load and cache async data (similar to React Query).

```typescript
function useAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    initialData?: T;
    staleTime?: number;  // ms (default: 5000)
  }
): {
  data: Signal<T | null>;
  isLoading: Signal<boolean>;
  error: Signal<Error | null>;
  refetch: () => void;
}
```

**Example:**
```typescript
const { data, isLoading, error, refetch } = useAsyncData(
  'user-123',
  async () => {
    const response = await fetch('/api/user/123');
    return response.json();
  },
  {
    staleTime: 60000,  // 1 minute
  }
);

// Auto-refetch
setInterval(() => refetch(), 30000);
```

## Patterns

### Data Fetching

```typescript
function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading, error } = useAsyncData(
    `user-${userId}`,
    async () => {
      const res = await fetch(`/api/users/${userId}`);
      return res.json();
    }
  );
  
  return (root: HTMLElement) => {
    effect(() => {
      if (isLoading.get()) {
        return h('div', { className: 'loading' }, 'Loading...');
      }
      
      if (error.get()) {
        return h('div', { className: 'error' }, error.get()!.message);
      }
      
      const user = data.get()!;
      return h('div', null,
        h('h1', null, user.name),
        h('p', null, user.email)
      );
    });
  };
}
```

### Lazy Loading Routes

```typescript
const routes = {
  '/': Home,
  '/about': lazy(() => import('./pages/About')),
  '/dashboard': lazy(() => import('./pages/Dashboard')),
};

function Router({ path }: { path: string }) {
  const Page = routes[path as keyof typeof routes] || NotFound;
  
  return h(Suspense,
    { 
      fallback: h('div', { className: 'spinner' }, 'Loading page...')
    },
    h(Page, {})
  );
}
```

### Optimistic Updates

```typescript
async function updateTodo(id: number, updates: Partial<Todo>) {
  // Optimistic update
  todoList.update(list => 
    list.map(t => t.id === id ? { ...t, ...updates } : t)
  );
  
  try {
    // Background sync
    await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    // Rollback on error
    refetch();
  }
}
```

### Retry Logic

```typescript
function useRetryableData<T>(
  key: string,
  fetcher: () => Promise<T>,
  retries = 3
) {
  const { data, isLoading, error, refetch } = useAsyncData(key, fetcher);
  
  const retry = async () => {
    let lastError: Error;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await fetcher();
      } catch (err) {
        lastError = err as Error;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    
    throw lastError!;
  };
  
  return { data, isLoading, error, refetch: retry };
}
```

### Pagination

```typescript
function usePaginatedData<T>(
  keyPrefix: string,
  fetcher: (page: number) => Promise<{ data: T[]; total: number }>,
  pageSize = 20
) {
  const currentPage = signal(1);
  const allData = signal<T[]>([]);
  const total = signal(0);
  
  const { isLoading, error } = useAsyncData(
    `${keyPrefix}-page-${currentPage.get()}`,
    async () => {
      const result = await fetcher(currentPage.get());
      allData.set([...allData.get(), ...result.data]);
      total.set(result.total);
      return result;
    }
  );
  
  return {
    data: allData,
    isLoading,
    error,
    page: currentPage,
    total,
    hasNextPage: () => allData.get().length < total.get(),
    loadMore: () => currentPage.set(currentPage.get() + 1),
  };
}
```

## Error Handling

### Error Boundaries

```typescript
function ErrorBoundary({ children, fallback }: any) {
  return (root: HTMLElement) => {
    try {
      return children;
    } catch (error) {
      return fallback || h('div', { className: 'error' }, 
        'Something went wrong'
      );
    }
  };
}
```

### Global Error Handler

```typescript
function createApp() {
  const { data, state } = createSuspense(
    async () => loadApp(),
    {
      onError: (error) => {
        // Log to monitoring service
        logError(error);
        
        // Show user-friendly message
        showErrorNotification('Failed to load app');
      }
    }
  );
  
  return { data, state };
}
```

## Performance Tips

### 1. Cache Data

```typescript
// Use staleTime to avoid refetching
useAsyncData('data', fetcher, {
  staleTime: 60000  // 1 minute cache
});
```

### 2. Prefetch

```typescript
// Prefetch on hover
button.addEventListener('mouseenter', () => {
  prefetchData();  // Start loading early
});
```

### 3. Parallel Loading

```typescript
// Load multiple resources in parallel
const [users, posts, comments] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchComments()
]);
```

### 4. Initial Data

```typescript
// Hydrate from server-side rendered data
useAsyncData('user', fetcher, {
  initialData: window.__INITIAL_DATA__.user
});
```

## Comparison with Other Frameworks

| Feature | React | Vue | Solid | Qore |
|---------|-------|-----|-------|------|
| Suspense | ✅ | ✅ | ✅ | ✅ |
| Lazy Loading | ✅ | ✅ | ✅ | ✅ |
| Data Fetching | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Built-in Cache | ❌ | ❌ | ❌ | ✅ |
| Retry Logic | ❌ | ❌ | ❌ | ✅ |

⚠️ Requires additional libraries (React Query, SWR, etc.)

## See Also

- [Stream API](./stream.md) - Streaming with suspense
- [Reactive API](./reactive.md) - Signals and effects
- [Component API](./component.md) - Component patterns
