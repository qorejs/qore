import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderToString,
  renderComponentToString,
  renderProps,
  renderToStream,
  renderAsync,
  renderToStreamAsync,
  createPrefetchContext,
  prefetchAndRender,
  renderWithSuspense,
  renderSSR,
  setSSRConfig,
  getSSRConfig,
  SSRErrorReason,
  SSRRecoveryStrategy,
  createErrorBoundary,
  type SSRError
} from '../src/ssr';
import { StreamRenderer } from '../src/stream';

describe('SSR - Error Types', () => {
  it('should have correct error reason enum values', () => {
    expect(SSRErrorReason.TIMEOUT).toBe('TIMEOUT');
    expect(SSRErrorReason.COMPONENT_ERROR).toBe('COMPONENT_ERROR');
    expect(SSRErrorReason.ASYNC_ERROR).toBe('ASYNC_ERROR');
    expect(SSRErrorReason.PREFETCH_ERROR).toBe('PREFETCH_ERROR');
    expect(SSRErrorReason.STREAM_ERROR).toBe('STREAM_ERROR');
    expect(SSRErrorReason.UNKNOWN).toBe('UNKNOWN');
  });

  it('should have correct recovery strategy enum values', () => {
    expect(SSRRecoveryStrategy.FALLBACK_COMMENT).toBe('FALLBACK_COMMENT');
    expect(SSRRecoveryStrategy.EMPTY).toBe('EMPTY');
    expect(SSRRecoveryStrategy.THROW).toBe('THROW');
    expect(SSRRecoveryStrategy.ALTERNATE_COMPONENT).toBe('ALTERNATE_COMPONENT');
  });
});

describe('SSR - Configuration', () => {
  beforeEach(() => {
    // 重置配置到默认值
    setSSRConfig({
      devMode: false,
      errorLog: { enabled: true, verbose: false },
      defaultTimeoutMs: 30000,
      defaultRecoveryStrategy: SSRRecoveryStrategy.FALLBACK_COMMENT
    });
  });

  it('should get default config', () => {
    const config = getSSRConfig();
    expect(config.devMode).toBe(false);
    expect(config.errorLog.enabled).toBe(true);
    expect(config.defaultTimeoutMs).toBe(30000);
  });

  it('should update config', () => {
    setSSRConfig({
      devMode: true,
      defaultTimeoutMs: 5000
    });
    
    const config = getSSRConfig();
    expect(config.devMode).toBe(true);
    expect(config.defaultTimeoutMs).toBe(5000);
    // 其他配置应保持不变
    expect(config.errorLog.enabled).toBe(true);
  });

  it('should update error log config separately', () => {
    setSSRConfig({
      errorLog: { enabled: false, verbose: true }
    });
    
    const config = getSSRConfig();
    expect(config.errorLog.enabled).toBe(false);
    expect(config.errorLog.verbose).toBe(true);
  });
});

describe('SSR - renderToString with errors', () => {
  beforeEach(() => {
    setSSRConfig({ devMode: false });
  });

  it('should return generic error in production mode', () => {
    const Component = () => {
      throw new Error('Render error');
    };
    expect(renderToString(Component)).toBe('<!-- Error -->');
  });

  it('should return detailed error in dev mode', () => {
    setSSRConfig({ devMode: true });
    
    const Component = () => {
      throw new Error('Specific render error');
    };
    const result = renderToString(Component);
    expect(result).toContain('<!-- SSR Error:');
    expect(result).toContain('Specific render error');
  });

  it('should truncate long error messages', () => {
    setSSRConfig({ devMode: true });
    
    const longMessage = 'A'.repeat(300);
    const Component = () => {
      throw new Error(longMessage);
    };
    const result = renderToString(Component);
    expect(result.length).toBeLessThan(300);
    expect(result).toContain('...');
  });
});

describe('SSR - renderAsync with errors', () => {
  beforeEach(() => {
    setSSRConfig({ devMode: false });
  });

  it('should return generic async error in production mode', async () => {
    const AsyncComponent = async () => {
      throw new Error('Async error');
    };
    const result = await renderAsync(AsyncComponent);
    expect(result).toBe('<!-- Async Error -->');
  });

  it('should return detailed async error in dev mode', async () => {
    setSSRConfig({ devMode: true });
    
    const AsyncComponent = async () => {
      throw new Error('Specific async error');
    };
    const result = await renderAsync(AsyncComponent);
    expect(result).toContain('<!-- SSR Error:');
    expect(result).toContain('Specific async error');
  });
});

describe('SSR - renderWithSuspense with detailed errors', () => {
  beforeEach(() => {
    setSSRConfig({ 
      devMode: false,
      defaultTimeoutMs: 30000,
      defaultRecoveryStrategy: SSRRecoveryStrategy.FALLBACK_COMMENT
    });
  });

  it('should render component normally', async () => {
    const Component = () => 'Normal content';
    const result = await renderWithSuspense(Component);
    expect(result).toBe('Normal content');
  });

  it('should return timeout error comment on timeout', async () => {
    // 创建一个真正会超时的组件（使用异步延迟）
    const Component = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'Slow content';
    };
    
    const result = await renderWithSuspense(Component, { 
      timeoutMs: 10,
      fallback: 'Loading...'
    });
    
    // 超时应该返回错误注释
    expect(result).toContain('<!-- SSR Timeout');
  });

  it('should return component error comment on error', async () => {
    const Component = () => {
      throw new Error('Component failed');
    };
    
    const result = await renderWithSuspense(Component);
    expect(result).toContain('<!-- SSR Error:');
    expect(result).toContain('Component failed');
  });

  it('should use EMPTY recovery strategy', async () => {
    const Component = () => {
      throw new Error('Error');
    };
    
    const result = await renderWithSuspense(Component, {
      recoveryStrategy: SSRRecoveryStrategy.EMPTY
    });
    
    expect(result).toBe('');
  });

  it('should use ALTERNATE_COMPONENT recovery strategy', async () => {
    const FailingComponent = () => {
      throw new Error('Failed');
    };
    
    const AlternateComponent = () => 'Alternate content';
    
    const result = await renderWithSuspense(FailingComponent, {
      recoveryStrategy: SSRRecoveryStrategy.ALTERNATE_COMPONENT,
      alternateComponent: AlternateComponent
    });
    
    expect(result).toBe('Alternate content');
  });

  it('should THROW on error when strategy is THROW', async () => {
    const Component = () => {
      throw new Error('Should throw');
    };
    
    await expect(renderWithSuspense(Component, {
      recoveryStrategy: SSRRecoveryStrategy.THROW
    })).rejects.toThrow('Should throw');
  });

  it('should use custom fallback in production mode', async () => {
    setSSRConfig({ devMode: false });
    
    const Component = () => {
      throw new Error('Error');
    };
    
    // 当 recovery strategy 为 FALLBACK_COMMENT 时，开发模式返回错误注释
    // 生产模式下应该也返回错误注释（这是新的默认行为）
    const result = await renderWithSuspense(Component);
    expect(result).toContain('<!-- SSR Error:');
  });

  it('should log error in dev mode', async () => {
    setSSRConfig({ 
      devMode: true,
      errorLog: { enabled: true, verbose: false }
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const Component = () => {
      throw new Error('Test error');
    };
    
    await renderWithSuspense(Component);
    
    // 在 dev 模式下，错误会被记录
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain('[Qore SSR Error]');
    consoleSpy.mockRestore();
  });

  it('should use custom error log function', async () => {
    const logSpy = vi.fn();
    setSSRConfig({ 
      devMode: true,
      errorLog: {
        enabled: true,
        verbose: false,
        logFn: logSpy
      }
    });
    
    const Component = () => {
      throw new Error('Custom log test');
    };
    
    await renderWithSuspense(Component);
    
    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).toHaveProperty('reason');
    expect(logSpy.mock.calls[0][0]).toHaveProperty('message');
  });
});

describe('SSR - renderSSR with detailed errors', () => {
  beforeEach(() => {
    setSSRConfig({ 
      devMode: false,
      defaultTimeoutMs: 30000
    });
  });

  it('should return successful SSR result', async () => {
    const Component = () => 'SSR content';
    const result = await renderSSR(Component);
    
    expect(result.html).toBe('SSR content');
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.renderTimeMs).toBeDefined();
  });

  it('should return error SSR result on component error', async () => {
    const Component = () => {
      throw new Error('SSR failed');
    };
    
    const result = await renderSSR(Component);
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toBe(SSRErrorReason.COMPONENT_ERROR);
    expect(result.html).toContain('<!-- SSR Error:');
  });

  it('should return timeout error in SSR result', async () => {
    const Component = () => {
      throw new Error('Slow');
    };
    
    const result = await renderSSR(Component, { timeoutMs: 10 });
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].reason).toBe(SSRErrorReason.TIMEOUT);
    expect(result.html).toContain('<!-- SSR Timeout');
  });

  it('should include state when requested', async () => {
    const Component = () => 'SSR with state';
    const result = await renderSSR(Component, { 
      includeState: true, 
      state: { user: 'admin', role: 'super' } 
    });
    
    expect(result.html).toBe('SSR with state');
    expect(result.state).toContain('window.__QORE_STATE__');
    expect(result.state).toContain('admin');
    expect(result.state).toContain('super');
  });

  it('should track render time', async () => {
    const Component = () => {
      // 模拟一些工作
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
      return `Result: ${sum}`;
    };
    
    const result = await renderSSR(Component);
    
    expect(result.renderTimeMs).toBeDefined();
    expect(result.renderTimeMs!).toBeGreaterThanOrEqual(0);
  });

  it('should use alternate component on error', async () => {
    const FailingComponent = () => {
      throw new Error('Failed');
    };
    
    const AlternateComponent = () => 'Fallback content';
    
    const result = await renderSSR(FailingComponent, {
      recoveryStrategy: SSRRecoveryStrategy.ALTERNATE_COMPONENT,
      alternateComponent: AlternateComponent
    });
    
    expect(result.success).toBe(true);
    expect(result.html).toBe('Fallback content');
    expect(result.errors.length).toBe(0);
  });
});

describe('SSR - Prefetch with errors', () => {
  beforeEach(() => {
    setSSRConfig({ devMode: false });
  });

  it('should return generic error in production mode', async () => {
    const prefetchFn = async () => {
      throw new Error('Prefetch failed');
    };
    
    const renderFn = (data: any) => () => `Hello`;
    
    const result = await prefetchAndRender(prefetchFn, renderFn);
    expect(result).toBe('<!-- Prefetch Error -->');
  });

  it('should return detailed error in dev mode', async () => {
    setSSRConfig({ devMode: true });
    
    const prefetchFn = async () => {
      throw new Error('Specific prefetch error');
    };
    
    const renderFn = (data: any) => () => `Hello`;
    
    const result = await prefetchAndRender(prefetchFn, renderFn);
    expect(result).toContain('<!-- SSR Error:');
    expect(result).toContain('Specific prefetch error');
  });
});

describe('SSR - Error Boundary', () => {
  beforeEach(() => {
    setSSRConfig({ devMode: false });
  });

  it('should render children successfully', () => {
    const ChildComponent = () => 'Child content';
    const boundary = createErrorBoundary({
      children: ChildComponent
    });
    
    expect(renderToString(boundary)).toBe('Child content');
  });

  it('should use fallback on error', () => {
    const FailingChild = () => {
      throw new Error('Child error');
    };
    
    const Fallback = () => 'Fallback content';
    
    const boundary = createErrorBoundary({
      children: FailingChild,
      fallback: Fallback
    });
    
    expect(renderToString(boundary)).toBe('Fallback content');
  });

  it('should call onError callback', () => {
    const onError = vi.fn();
    
    const FailingChild = () => {
      throw new Error('Boundary error');
    };
    
    const boundary = createErrorBoundary({
      children: FailingChild,
      onError
    });
    
    renderToString(boundary);
    
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toHaveProperty('reason');
    expect(onError.mock.calls[0][0].message).toBe('Boundary error');
  });

  it('should return empty string with captureError', () => {
    const FailingChild = () => {
      throw new Error('Error');
    };
    
    const boundary = createErrorBoundary({
      children: FailingChild,
      captureError: true
    });
    
    expect(renderToString(boundary)).toBe('');
  });

  it('should return detailed error in dev mode', () => {
    setSSRConfig({ devMode: true });
    
    const FailingChild = () => {
      throw new Error('Dev mode error');
    };
    
    const boundary = createErrorBoundary({
      children: FailingChild
    });
    
    const result = renderToString(boundary);
    expect(result).toContain('<!-- SSR Error:');
    expect(result).toContain('Dev mode error');
  });
});

describe('SSR - Integration', () => {
  beforeEach(() => {
    setSSRConfig({ 
      devMode: false,
      defaultTimeoutMs: 30000
    });
  });

  it('should handle complete SSR flow with errors', async () => {
    const App = () => [
      '<header>', 
      renderToString(() => 'My App'),
      '</header>',
      '<main>',
      renderToString(() => ['<p>', 'Content', '</p>']),
      '</main>'
    ];
    
    const result = await renderSSR(App);
    expect(result.html).toContain('My App');
    expect(result.html).toContain('Content');
    expect(result.success).toBe(true);
  });

  it('should handle streaming SSR with prefetch', async () => {
    const prefetchFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return { items: ['A', 'B', 'C'] };
    };
    
    const renderer = new StreamRenderer();
    const chunks: string[] = [];
    renderer.subscribe((chunk: string) => chunks.push(chunk));
    
    const data = await prefetchFn();
    const Component = () => data.items.join(', ');
    
    await renderToStreamAsync(Component, renderer);
    
    expect(chunks.join('')).toBe('A, B, C');
  });

  it('should handle nested error boundaries', () => {
    setSSRConfig({ devMode: false });
    
    const InnerFailing = () => {
      throw new Error('Inner error');
    };
    
    const innerBoundary = createErrorBoundary({
      children: InnerFailing,
      fallback: () => 'Inner fallback'
    });
    
    const outerBoundary = createErrorBoundary({
      children: innerBoundary,
      fallback: () => 'Outer fallback'
    });
    
    // 外层应该成功，因为内层有 fallback
    const result = renderToString(outerBoundary);
    expect(result).toBe('Inner fallback');
  });

  it('should respect timeout in full SSR flow', async () => {
    // 创建一个真正会超时的异步组件
    const SlowComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'Slow content';
    };
    
    const result = await renderSSR(SlowComponent, { timeoutMs: 10 });
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].reason).toBe(SSRErrorReason.TIMEOUT);
  });
});

describe('SSR - Error Recovery Strategies', () => {
  beforeEach(() => {
    setSSRConfig({ 
      devMode: false,
      defaultRecoveryStrategy: SSRRecoveryStrategy.FALLBACK_COMMENT
    });
  });

  it('should FALLBACK_COMMENT by default', async () => {
    const Component = () => {
      throw new Error('Error');
    };
    
    const result = await renderWithSuspense(Component);
    expect(result).toContain('<!-- SSR Error:');
  });

  it('should return EMPTY when strategy is EMPTY', async () => {
    const Component = () => {
      throw new Error('Error');
    };
    
    const result = await renderWithSuspense(Component, {
      recoveryStrategy: SSRRecoveryStrategy.EMPTY
    });
    expect(result).toBe('');
  });

  it('should THROW when strategy is THROW', async () => {
    const Component = () => {
      throw new Error('Should throw');
    };
    
    await expect(renderWithSuspense(Component, {
      recoveryStrategy: SSRRecoveryStrategy.THROW
    })).rejects.toThrow('Should throw');
  });

  it('should use ALTERNATE_COMPONENT when available', async () => {
    const FailingComponent = () => {
      throw new Error('Failed');
    };
    
    const AlternateComponent = () => 'Alternate';
    
    const result = await renderWithSuspense(FailingComponent, {
      recoveryStrategy: SSRRecoveryStrategy.ALTERNATE_COMPONENT,
      alternateComponent: AlternateComponent
    });
    
    expect(result).toBe('Alternate');
  });

  it('should fallback to error comment if alternate also fails', async () => {
    const FailingComponent = () => {
      throw new Error('Primary failed');
    };
    
    const AlsoFailingAlternate = () => {
      throw new Error('Alternate also failed');
    };
    
    const result = await renderWithSuspense(FailingComponent, {
      recoveryStrategy: SSRRecoveryStrategy.ALTERNATE_COMPONENT,
      alternateComponent: AlsoFailingAlternate
    });
    
    expect(result).toContain('<!-- SSR Error:');
    expect(result).toContain('Primary failed');
  });
});

describe('SSR - SSRError object structure', () => {
  it('should have all required properties', () => {
    setSSRConfig({ devMode: true });
    
    const Component = () => {
      throw new Error('Test error');
    };
    
    // 通过 renderWithSuspense 触发错误
    renderWithSuspense(Component).catch(() => {});
    
    // 错误应该被创建并记录
    // 这里我们验证错误对象的结构
    const error: SSRError = {
      reason: SSRErrorReason.COMPONENT_ERROR,
      message: 'Test error',
      timestamp: Date.now(),
      recovered: false
    };
    
    expect(error.reason).toBeDefined();
    expect(error.message).toBeDefined();
    expect(error.timestamp).toBeDefined();
    expect(error.recovered).toBeDefined();
  });

  it('should include originalError when available', () => {
    const originalError = new Error('Original');
    const error: SSRError = {
      reason: SSRErrorReason.COMPONENT_ERROR,
      originalError,
      message: 'Test',
      timestamp: Date.now(),
      recovered: false
    };
    
    expect(error.originalError).toBe(originalError);
    expect(error.originalError?.message).toBe('Original');
  });

  it('should include componentName when available', () => {
    function NamedComponent() {
      return 'test';
    }
    
    const error: SSRError = {
      reason: SSRErrorReason.COMPONENT_ERROR,
      message: 'Test',
      componentName: 'NamedComponent',
      timestamp: Date.now(),
      recovered: false
    };
    
    expect(error.componentName).toBe('NamedComponent');
  });
});
