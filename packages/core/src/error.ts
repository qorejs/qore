/**
 * Qore Error Handling - Error Boundaries and Error Recovery
 */

import { signal, effect, computed } from './signal';

export interface ErrorBoundaryProps {
  fallback?: (error: Error, reset: () => void) => any;
  onError?: (error: Error) => void;
  children: any;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary state - can be used within components
 */
export function createErrorBoundary() {
  const state = signal<ErrorState>({ hasError: false, error: null });
  
  const handleError = (error: Error) => {
    state({ hasError: true, error });
  };
  
  const reset = () => {
    state({ hasError: false, error: null });
  };
  
  return {
    state,
    handleError,
    reset,
    hasError: () => state().hasError,
    error: () => state().error,
  };
}

/**
 * Global error handler for uncaught errors
 */
export function setupGlobalErrorHandler(onError: (error: Error) => void): () => void {
  const handler = (event: ErrorEvent | PromiseRejectionEvent) => {
    const error = event instanceof ErrorEvent 
      ? event.error || new Error(event.message)
      : event.reason || new Error('Unhandled promise rejection');
    
    onError(error);
  };
  
  window.addEventListener('error', handler as EventListener);
  window.addEventListener('unhandledrejection', handler as EventListener);
  
  return () => {
    window.removeEventListener('error', handler as EventListener);
    window.removeEventListener('unhandledrejection', handler as EventListener);
  };
}

/**
 * Try-catch wrapper for async operations
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    return null;
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onError,
  } = options;
  
  let lastError: Error | null = null;
  let currentDelay = delay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      onError?.(lastError, attempt);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= backoff;
      }
    }
  }
  
  throw lastError;
}

/**
 * Error boundary component wrapper
 */
export function withErrorBoundary<T extends Record<string, any>>(
  Component: (props: T) => any,
  options: {
    fallback?: (error: Error, reset: () => void) => any;
    onError?: (error: Error) => void;
  } = {}
): (props: T) => any {
  return (props: T) => {
    const boundary = createErrorBoundary();
    
    try {
      return Component(props);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      boundary.handleError(err);
      options.onError?.(err);
      
      if (options.fallback) {
        return options.fallback(err, boundary.reset);
      }
      
      return null;
    }
  };
}
