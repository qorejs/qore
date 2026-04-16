/**
 * Qore ErrorBoundary Component
 * Advanced error boundary with retry mechanism and user-friendly UI
 * 
 * Features:
 * - Catch rendering errors in child components
 * - Display user-friendly error messages
 * - Automatic retry with exponential backoff
 * - Fallback UI support
 * - Error reporting integration
 */

import { signal, computed } from './signal';
import { h, VNode } from './render';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error state interface
 */
export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: {
    componentStack?: string;
    timestamp: number;
    retryCount: number;
  };
  severity: ErrorSeverity;
}

/**
 * ErrorBoundary props
 */
export interface ErrorBoundaryProps {
  /** Fallback UI to show when error occurs */
  fallback?: (error: Error, reset: () => void, retry: () => void) => VNode;
  /** Custom error UI component */
  errorUI?: ErrorUIProps;
  /** Called when error is caught */
  onError?: (error: Error, errorInfo?: any) => void;
  /** Enable automatic retry */
  autoRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Initial retry delay in ms */
  retryDelay?: number;
  /** Backoff multiplier for retry delay */
  retryBackoff?: number;
  /** Children to wrap with error boundary */
  children: VNode | VNode[] | ((reset: () => void) => VNode);
  /** Enable error reporting */
  reportError?: boolean;
  /** Custom error reporter function */
  errorReporter?: (error: Error, errorInfo?: any) => void;
}

/**
 * Error UI component props
 */
export interface ErrorUIProps {
  title?: string;
  message?: string;
  showStackTrace?: boolean;
  showRetryButton?: boolean;
  retryButtonText?: string;
  showResetButton?: boolean;
  resetButtonText?: string;
  icon?: 'error' | 'warning' | 'info';
  style?: 'inline' | 'modal' | 'banner';
}

/**
 * Default error UI component
 */
function DefaultErrorUI({
  error,
  retryCount,
  onRetry,
  onReset,
  props
}: {
  error: Error;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  props: ErrorUIProps;
}): VNode {
  const {
    title = 'Something went wrong',
    message,
    showStackTrace = false,
    showRetryButton = true,
    retryButtonText = 'Try Again',
    showResetButton = true,
    resetButtonText = 'Reset',
    icon = 'error',
    style = 'inline'
  } = props;

  const styles = {
    inline: {
      container: {
        padding: '16px',
        margin: '16px 0',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#991b1b'
      },
      title: {
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      },
      message: {
        fontSize: '14px',
        marginBottom: '12px'
      },
      stackTrace: {
        fontSize: '12px',
        fontFamily: 'monospace',
        backgroundColor: '#fee2e2',
        padding: '8px',
        borderRadius: '4px',
        overflow: 'auto',
        maxHeight: '200px'
      },
      buttonContainer: {
        display: 'flex',
        gap: '8px',
        marginTop: '12px'
      },
      button: {
        padding: '8px 16px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
      },
      retryButton: {
        backgroundColor: '#dc2626',
        color: 'white'
      },
      resetButton: {
        backgroundColor: '#f3f4f6',
        color: '#374151'
      }
    }
  };

  const currentStyle = styles[style as keyof typeof styles] || styles.inline;

  const iconMap = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return h('div', { style: currentStyle.container as any }, [
    h('div', { style: currentStyle.title as any }, [
      h('span', null, iconMap[icon]),
      h('span', null, title)
    ]),
    h('p', { style: currentStyle.message as any }, 
      message || error?.message || 'An unexpected error occurred'
    ),
    retryCount > 0 && h('p', { style: { ...currentStyle.message, fontSize: '12px' } }, 
      `Retry attempts: ${retryCount}`
    ),
    showStackTrace && error?.stack && h('pre', { style: currentStyle.stackTrace as any }, error.stack),
    h('div', { style: currentStyle.buttonContainer as any }, [
      showRetryButton && h('button', {
        style: { ...currentStyle.button as any, ...currentStyle.retryButton } as any,
        onClick: onRetry
      }, retryButtonText),
      showResetButton && h('button', {
        style: { ...currentStyle.button as any, ...currentStyle.resetButton } as any,
        onClick: onReset
      }, resetButtonText)
    ])
  ]);
}

/**
 * Create an error boundary with retry mechanism
 */
export function createErrorBoundary(options: {
  onError?: (error: Error, errorInfo?: any) => void;
  errorReporter?: (error: Error, errorInfo?: any) => void;
} = {}) {
  const state = signal<ErrorState>({
    hasError: false,
    error: null,
    severity: 'error'
  });

  const retryCount = signal(0);
  const isRetrying = signal(false);

  const handleError = (error: Error, errorInfo?: any) => {
    const severity = determineErrorSeverity(error);
    
    state({
      hasError: true,
      error,
      errorInfo: {
        ...errorInfo,
        timestamp: Date.now(),
        retryCount: retryCount()
      },
      severity
    });

    options.onError?.(error, errorInfo);
    
    if (options.errorReporter) {
      options.errorReporter(error, errorInfo);
    } else if (options.onError) {
      // Default: log to console
      console.error('[ErrorBoundary] Error caught:', error, errorInfo);
    }
  };

  const reset = () => {
    state({ hasError: false, error: null, severity: 'error' });
    retryCount(0);
    isRetrying(false);
  };

  const retry = async (
    fn: () => Promise<void>,
    options: {
      maxRetries?: number;
      delay?: number;
      backoff?: number;
      onRetry?: (attempt: number) => void;
    } = {}
  ) => {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = 2,
      onRetry
    } = options;

    if (retryCount() >= maxRetries) {
      console.error('[ErrorBoundary] Max retries exceeded');
      return false;
    }

    isRetrying(true);
    retryCount(prev => prev + 1);
    onRetry?.(retryCount());

    try {
      await fn();
      reset();
      return true;
    } catch (error) {
      handleError(error as Error);
      return false;
    } finally {
      isRetrying(false);
    }
  };

  const retryWithBackoff = async (
    fn: () => Promise<void>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      backoff?: number;
    } = {}
  ) => {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      backoff = 2
    } = options;

    let currentDelay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fn();
        reset();
        return true;
      } catch (error) {
        if (attempt < maxRetries) {
          console.log(`[ErrorBoundary] Retry ${attempt}/${maxRetries} failed, waiting ${currentDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= backoff;
        } else {
          handleError(error as Error);
          return false;
        }
      }
    }

    return false;
  };

  return {
    state,
    hasError: computed(() => state().hasError),
    error: computed(() => state().error),
    severity: computed(() => state().severity),
    retryCount: computed(() => retryCount()),
    isRetrying: computed(() => isRetrying()),
    handleError,
    reset,
    retry,
    retryWithBackoff
  };
}

/**
 * Determine error severity based on error type/message
 */
function determineErrorSeverity(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'warning';
  }
  
  if (message.includes('timeout')) {
    return 'warning';
  }
  
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return 'info';
  }
  
  if (message.includes('critical') || message.includes('fatal')) {
    return 'critical';
  }
  
  return 'error';
}

/**
 * ErrorBoundary component function
 */
export function ErrorBoundary(props: ErrorBoundaryProps): VNode {
  const {
    fallback,
    errorUI = {},
    onError,
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 1000,
    retryBackoff = 2,
    children,
    reportError = false,
    errorReporter
  } = props;

  const boundary = createErrorBoundary({
    onError,
    errorReporter: reportError ? errorReporter : undefined
  });

  const handleRetry = async () => {
    if (typeof children === 'function') {
      try {
        children(boundary.reset);
        boundary.reset();
      } catch (error) {
        boundary.handleError(error as Error);
      }
    }
  };

  if (boundary.hasError()) {
    if (fallback) {
      return fallback(
        boundary.error()!,
        boundary.reset,
        handleRetry
      );
    }

    return DefaultErrorUI({
      error: boundary.error()!,
      retryCount: boundary.retryCount(),
      onRetry: handleRetry,
      onReset: boundary.reset,
      props: errorUI
    });
  }

  try {
    return typeof children === 'function' 
      ? children(boundary.reset)
      : children;
  } catch (error) {
    boundary.handleError(error as Error);
    
    if (fallback) {
      return fallback(
        error as Error,
        boundary.reset,
        handleRetry
      );
    }

    return DefaultErrorUI({
      error: error as Error,
      retryCount: 0,
      onRetry: handleRetry,
      onReset: boundary.reset,
      props: errorUI
    });
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends Record<string, any>>(
  WrappedComponent: (props: P) => VNode,
  options: {
    fallback?: (error: Error, reset: () => void, retry: () => void) => VNode;
    onError?: (error: Error, errorInfo?: any) => void;
    errorUI?: ErrorUIProps;
  } = {}
): (props: P) => VNode {
  return (props: P) => {
    return h(ErrorBoundary, {
      fallback: options.fallback,
      errorUI: options.errorUI,
      onError: options.onError
    }, () => WrappedComponent(props));
  };
}

/**
 * Async error boundary for handling promise rejections
 */
export function createAsyncErrorBoundary<T>(
  fn: () => Promise<T>,
  options: {
    onError?: (error: Error) => void;
    fallback?: T;
    maxRetries?: number;
  } = {}
): {
  result: () => T | null;
  error: () => Error | null;
  isLoading: () => boolean;
  retry: () => Promise<T | null>;
} {
  const result = signal<T | null>(null);
  const error = signal<Error | null>(null);
  const isLoading = signal(false);

  const execute = async () => {
    isLoading(true);
    error(null);
    
    try {
      const res = await fn();
      result(res);
      return res;
    } catch (err) {
      const e = err as Error;
      error(e);
      options.onError?.(e);
      return options.fallback ?? null;
    } finally {
      isLoading(false);
    }
  };

  // Initial execution
  execute();

  return {
    result: () => result(),
    error: () => error(),
    isLoading: () => isLoading(),
    retry: execute
  };
}

/**
 * Retry hook for async operations
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): {
  execute: () => Promise<T>;
  result: () => T | null;
  error: () => Error | null;
  isLoading: () => boolean;
  retryCount: () => number;
} {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onError
  } = options;

  const result = signal<T | null>(null);
  const error = signal<Error | null>(null);
  const isLoading = signal(false);
  const retryCountVal = signal(0);

  const execute = async (): Promise<T> => {
    isLoading(true);
    error(null);
    
    let lastError: Error | null = null;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      retryCountVal(attempt);
      
      try {
        const res = await fn();
        result(res);
        return res;
      } catch (err) {
        lastError = err as Error;
        onError?.(lastError, attempt);
        
        if (attempt < maxRetries) {
          console.log(`[useRetry] Attempt ${attempt} failed, retrying in ${currentDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= backoff;
        }
      }
    }

    error(lastError);
    throw lastError;
  };

  return {
    execute,
    result: () => result(),
    error: () => error(),
    isLoading: () => isLoading(),
    retryCount: () => retryCountVal()
  };
}
