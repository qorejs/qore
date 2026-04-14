import { describe, it, expect, vi } from 'vitest';
import { 
  createErrorBoundary, 
  tryCatch, 
  retry,
  withErrorBoundary 
} from '../src/error';
import { signal } from '../src/signal';

describe('createErrorBoundary', () => {
  it('should create error boundary with initial clean state', () => {
    const boundary = createErrorBoundary();
    expect(boundary.hasError()).toBe(false);
    expect(boundary.error()).toBe(null);
  });

  it('should handle error', () => {
    const boundary = createErrorBoundary();
    const error = new Error('Test error');
    
    boundary.handleError(error);
    
    expect(boundary.hasError()).toBe(true);
    expect(boundary.error()).toBe(error);
  });

  it('should reset error state', () => {
    const boundary = createErrorBoundary();
    const error = new Error('Test error');
    
    boundary.handleError(error);
    expect(boundary.hasError()).toBe(true);
    
    boundary.reset();
    
    expect(boundary.hasError()).toBe(false);
    expect(boundary.error()).toBe(null);
  });

  it('should provide state signal', () => {
    const boundary = createErrorBoundary();
    expect(boundary.state().hasError).toBe(false);
    expect(boundary.state().error).toBe(null);
  });
});

describe('tryCatch', () => {
  it('should return result on success', async () => {
    const result = await tryCatch(async () => 'success');
    expect(result).toBe('success');
  });

  it('should return null on error', async () => {
    const result = await tryCatch(async () => {
      throw new Error('Test error');
    });
    expect(result).toBe(null);
  });

  it('should call onError callback', async () => {
    const onError = vi.fn();
    await tryCatch(
      async () => { throw new Error('Test error'); },
      onError
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle non-Error errors', async () => {
    const result = await tryCatch(async () => {
      throw 'string error';
    });
    expect(result).toBe(null);
  });
});

describe('retry', () => {
  it('should succeed on first try', async () => {
    const result = await retry(async () => 'success');
    expect(result).toBe('success');
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const result = await retry(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    }, { maxRetries: 3, delay: 10 });
    
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries', async () => {
    await expect(async () => {
      await retry(
        async () => { throw new Error('Always fail'); },
        { maxRetries: 3, delay: 10 }
      );
    }).rejects.toThrow('Always fail');
  });

  it('should use exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    
    vi.spyOn(global, 'setTimeout').mockImplementation((cb, delay) => {
      delays.push(delay as number);
      return originalSetTimeout(cb, 0);
    });
    
    try {
      await retry(
        async () => { throw new Error('Fail'); },
        { maxRetries: 3, delay: 100, backoff: 2 }
      );
    } catch {}
    
    expect(delays).toEqual([100, 200]);
  });

  it('should call onError callback', async () => {
    const onError = vi.fn();
    
    try {
      await retry(
        async () => { throw new Error('Fail'); },
        { maxRetries: 2, delay: 10, onError }
      );
    } catch {}
    
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Number));
  });
});

describe('withErrorBoundary', () => {
  it('should render component successfully', () => {
    const Component = (props: { value: number }) => props.value;
    const WrappedComponent = withErrorBoundary(Component);
    
    const result = WrappedComponent({ value: 42 });
    expect(result).toBe(42);
  });

  it('should catch errors in component', () => {
    const Component = () => { throw new Error('Component error'); };
    const WrappedComponent = withErrorBoundary(Component);
    
    const result = WrappedComponent({});
    expect(result).toBe(null);
  });

  it('should call onError callback', () => {
    const onError = vi.fn();
    const Component = () => { throw new Error('Component error'); };
    const WrappedComponent = withErrorBoundary(Component, { onError });
    
    WrappedComponent({});
    
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should render fallback on error', () => {
    const Component = () => { throw new Error('Component error'); };
    const fallback = vi.fn(() => 'Fallback UI');
    const WrappedComponent = withErrorBoundary(Component, { fallback });
    
    const result = WrappedComponent({});
    
    expect(fallback).toHaveBeenCalledWith(expect.any(Error), expect.any(Function));
    expect(result).toBe('Fallback UI');
  });

  it('should provide reset function in fallback', () => {
    const Component = () => { throw new Error('Component error'); };
    let resetFn: (() => void) | null = null;
    
    const fallback = (error: Error, reset: () => void) => {
      resetFn = reset;
      return 'Fallback';
    };
    
    const WrappedComponent = withErrorBoundary(Component, { fallback });
    WrappedComponent({});
    
    expect(resetFn).toBeInstanceOf(Function);
  });
});
