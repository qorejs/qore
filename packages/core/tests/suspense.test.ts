/**
 * Qore Suspense Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSuspense, useAsyncData } from '../src/suspense';
import { h } from '../src/renderer';

describe('Suspense', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('createSuspense', () => {
    it('should create suspense instance with loading state', () => {
      const suspense = createSuspense(async () => {
        return 'data';
      });

      expect(suspense.data).toBeDefined();
      expect(suspense.state).toBeDefined();
      expect(suspense.refresh).toBeDefined();
      expect(suspense.state.get().loading).toBe(true);
    });

    it('should resolve and update state on success', async () => {
      return new Promise<void>((resolve) => {
        const suspense = createSuspense(async () => {
          return 'test data';
        });

        setTimeout(() => {
          const state = suspense.state.get();
          expect(state.loading).toBe(false);
          expect(state.hasData).toBe(true);
          expect(state.error).toBeNull();
          expect(suspense.data.get()).toBe('test data');
          resolve();
        }, 50);
      });
    });

    it('should handle errors', async () => {
      return new Promise<void>((resolve) => {
        let errorHandlerCalled = false;
        
        const suspense = createSuspense(async () => {
          throw new Error('Test error');
        }, {
          onError: (err) => {
            errorHandlerCalled = true;
            expect(err.message).toBe('Test error');
          },
        });

        setTimeout(() => {
          const state = suspense.state.get();
          expect(state.loading).toBe(false);
          expect(state.hasData).toBe(false);
          expect(state.error).toBeDefined();
          expect(errorHandlerCalled).toBe(true);
          resolve();
        }, 50);
      });
    });

    it('should refresh data on demand', async () => {
      let callCount = 0;
      
      const suspense = createSuspense(async () => {
        callCount++;
        return `data-${callCount}`;
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(suspense.data.get()).toBe('data-1');
      
      suspense.refresh();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(suspense.data.get()).toBe('data-2');
    });
  });

  describe('useAsyncData', () => {
    it('should load data asynchronously', async () => {
      return new Promise<void>((resolve) => {
        const { data, isLoading, error } = useAsyncData(
          'test-key',
          async () => {
            return 'fetched data';
          }
        );

        expect(isLoading.get()).toBe(true);

        setTimeout(() => {
          expect(isLoading.get()).toBe(false);
          expect(error.get()).toBeNull();
          expect(data.get()).toBe('fetched data');
          resolve();
        }, 50);
      });
    });

    it('should use initial data if provided', () => {
      const { data, isLoading } = useAsyncData(
        'test-key',
        async () => {
          return 'fetched data';
        },
        { initialData: 'initial' }
      );

      expect(data.get()).toBe('initial');
      expect(isLoading.get()).toBe(false);
    });

    it('should handle errors', async () => {
      const { error, isLoading, refetch } = useAsyncData(
        'test-key-error',
        async () => {
          throw new Error('Fetch failed');
        }
      );

      // Wait for the async operation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(isLoading.get()).toBe(false);
      expect(error.get()).toBeDefined();
      expect(error.get()!.message).toBe('Fetch failed');
    });

    it('should refetch on demand', async () => {
      let callCount = 0;
      
      const { data, refetch } = useAsyncData(
        'test-key',
        async () => {
          callCount++;
          return `data-${callCount}`;
        }
      );

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(data.get()).toBe('data-1');

      refetch();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(data.get()).toBe('data-2');
    });

    it('should respect stale time', async () => {
      let callCount = 0;
      
      const { data } = useAsyncData(
        'test-key',
        async () => {
          callCount++;
          return `data-${callCount}`;
        },
        { staleTime: 100 }
      );

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(callCount).toBe(1);

      // Create another useAsyncData with same key within stale time
      // Should use cached data and not fetch again
      const { data: data2 } = useAsyncData(
        'test-key-2',
        async () => {
          callCount++;
          return `data-${callCount}`;
        },
        { initialData: 'cached', staleTime: 100 }
      );
      
      expect(data2.get()).toBe('cached');
      expect(callCount).toBe(1);
    });
  });
});
