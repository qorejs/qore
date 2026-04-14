/**
 * Qore Suspense - Async Loading Component
 * Handles lazy loading and async data fetching for components
 */

import { Signal, signal, effect } from './reactive';
import { VNode, h } from './renderer';
import { Component, Props } from './component';

export interface SuspenseState {
  loading: boolean;
  error: Error | null;
  hasData: boolean;
}

export interface SuspenseOptions {
  fallback?: VNode;
  onError?: (error: Error) => void;
  timeout?: number;
}

/**
 * Create a suspense boundary for async content
 * 
 * @param asyncFn - Async function that returns the content
 * @param options - Suspense configuration options
 * @returns Object with state signals and refresh function
 */
export function createSuspense<T>(
  asyncFn: () => Promise<T>,
  options: SuspenseOptions = {}
): {
  data: Signal<T | null>;
  state: Signal<SuspenseState>;
  refresh: () => void;
} {
  const data = signal<T | null>(null);
  const state = signal<SuspenseState>({
    loading: true,
    error: null,
    hasData: false,
  });

  let aborted = false;

  const execute = async () => {
    aborted = false;
    state.set({ loading: true, error: null, hasData: false });

    try {
      const result = await asyncFn();
      
      if (!aborted) {
        data.set(result);
        state.set({ loading: false, error: null, hasData: true });
      }
    } catch (err) {
      if (!aborted) {
        const error = err instanceof Error ? err : new Error(String(err));
        state.set({ loading: false, error, hasData: false });
        options.onError?.(error);
      }
    }
  };

  // Auto-execute on creation
  execute();

  return {
    data,
    state,
    refresh: execute,
  };
}

/**
 * Suspense component wrapper
 * Renders fallback while loading, error state on failure, or content on success
 */
export function Suspense<P extends Props>(
  asyncComponent: Component<P>,
  props: P,
  options: SuspenseOptions = {}
): Component<P> {
  const { fallback = h('div', { className: 'loading' }, 'Loading...') } = options;

  return (renderProps: P) => {
    const mergedProps = { ...props, ...renderProps };
    
    const { data, state } = createSuspense(
      () => Promise.resolve(asyncComponent(mergedProps)),
      options
    );

    return (root: HTMLElement) => {
      effect(() => {
        const currentState = state.get();
        
        if (currentState.loading) {
          return fallback;
        }
        
        if (currentState.error) {
          return h('div', { className: 'error' }, `Error: ${currentState.error.message}`);
        }
        
        return asyncComponent(mergedProps);
      });
    };
  };
}

/**
 * Lazy load a component
 * Returns a component that will be loaded on demand
 */
export function lazy<P extends Props>(
  importFn: () => Promise<{ default: Component<P> }>
): Component<P> {
  let loadedComponent: Component<P> | null = null;
  let loadPromise: Promise<Component<P>> | null = null;

  const LazyComponent: Component<P> = (props: P) => {
    if (loadedComponent) {
      return loadedComponent(props);
    }

    if (!loadPromise) {
      loadPromise = importFn().then(module => {
        loadedComponent = module.default;
        return loadedComponent;
      });
    }

    throw loadPromise;
  };

  return LazyComponent;
}

/**
 * Load async data and provide it to a component
 * Similar to React's useQuery pattern
 */
export function useAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    initialData?: T;
    staleTime?: number;
  } = {}
): {
  data: Signal<T | null>;
  isLoading: Signal<boolean>;
  error: Signal<Error | null>;
  refetch: () => void;
} {
  const { initialData, staleTime = 5000 } = options;
  
  const data = signal<T | null>(initialData ?? null);
  const isLoading = signal<boolean>(false);
  const error = signal<Error | null>(null);
  
  let lastFetch = 0;
  let pendingPromise: Promise<T> | null = null;

  const fetch = async (force = false) => {
    const now = Date.now();
    
    if (pendingPromise) {
      return pendingPromise;
    }
    
    if (!force && data.get() && now - lastFetch < staleTime) {
      return Promise.resolve(data.get() as T);
    }

    isLoading.set(true);
    error.set(null);

    pendingPromise = fetcher()
      .then(result => {
        data.set(result);
        lastFetch = now;
        isLoading.set(false);
        pendingPromise = null;
        return result;
      })
      .catch(err => {
        error.set(err instanceof Error ? err : new Error(String(err)));
        isLoading.set(false);
        pendingPromise = null;
        return undefined as unknown as T;
      });

    return pendingPromise;
  };

  // Only auto-fetch if no initial data
  if (!initialData) {
    fetch();
  }

  return {
    data,
    isLoading,
    error,
    refetch: () => fetch(true),
  };
}
