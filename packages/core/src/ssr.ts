/**
 * Qore SSR - Server-Side Rendering (separate entry point)
 * Import via: import { ... } from '@qorejs/qore/ssr'
 */

import { StreamRenderer } from './stream';
import type { VNode, Component } from './render';

// ============================================================================
// SSR Error Types
// ============================================================================

/**
 * SSR 错误原因枚举
 */
export enum SSRErrorReason {
  /** 渲染超时 */
  TIMEOUT = 'TIMEOUT',
  /** 组件渲染错误 */
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  /** 异步渲染错误 */
  ASYNC_ERROR = 'ASYNC_ERROR',
  /** 预取数据错误 */
  PREFETCH_ERROR = 'PREFETCH_ERROR',
  /** 流渲染错误 */
  STREAM_ERROR = 'STREAM_ERROR',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN'
}

/**
 * 错误恢复策略
 */
export enum SSRRecoveryStrategy {
  /** 返回错误注释，继续渲染 */
  FALLBACK_COMMENT = 'FALLBACK_COMMENT',
  /** 返回空内容 */
  EMPTY = 'EMPTY',
  /** 抛出错误 */
  THROW = 'THROW',
  /** 使用备用组件 */
  ALTERNATE_COMPONENT = 'ALTERNATE_COMPONENT'
}

/**
 * SSR 错误接口
 */
export interface SSRError {
  /** 错误原因 */
  reason: SSRErrorReason;
  /** 原始错误对象 */
  originalError?: Error;
  /** 错误消息摘要 */
  message: string;
  /** 组件名称（如果有） */
  componentName?: string;
  /** 错误发生时间 */
  timestamp: number;
  /** 是否已恢复 */
  recovered: boolean;
  /** 恢复策略 */
  recoveryStrategy?: SSRRecoveryStrategy;
}

/**
 * SSR 错误日志配置
 */
export interface SSRErrorLogConfig {
  /** 是否启用错误日志 */
  enabled: boolean;
  /** 是否输出详细堆栈信息 */
  verbose: boolean;
  /** 自定义日志函数 */
  logFn?: (error: SSRError) => void;
}

/**
 * SSR 全局配置
 */
export interface SSRConfig {
  /** 是否为开发模式 */
  devMode: boolean;
  /** 错误日志配置 */
  errorLog: SSRErrorLogConfig;
  /** 默认超时时间（毫秒） */
  defaultTimeoutMs: number;
  /** 默认恢复策略 */
  defaultRecoveryStrategy: SSRRecoveryStrategy;
}

// 全局配置（可通过 setSSRConfig 修改）
let globalConfig: SSRConfig = {
  devMode: false,
  errorLog: {
    enabled: true,
    verbose: false
  },
  defaultTimeoutMs: 30000,
  defaultRecoveryStrategy: SSRRecoveryStrategy.FALLBACK_COMMENT
};

/**
 * 设置 SSR 全局配置
 */
export function setSSRConfig(config: Partial<SSRConfig>): void {
  globalConfig = {
    ...globalConfig,
    ...config,
    errorLog: config.errorLog ? { ...globalConfig.errorLog, ...config.errorLog } : globalConfig.errorLog
  };
}

/**
 * 获取当前 SSR 配置
 */
export function getSSRConfig(): SSRConfig {
  return { ...globalConfig };
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(str: string): string {
  // 如果已经是 HTML 注释（SSR 错误标记），不要转义
  if (str.startsWith('<!--') && str.endsWith('-->')) {
    return str;
  }
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/**
 * 创建 SSRError 对象
 */
function createSSRError(
  reason: SSRErrorReason,
  originalError?: Error,
  componentName?: string
): SSRError {
  const message = originalError?.message || 'Unknown SSR error';
  const error: SSRError = {
    reason,
    originalError,
    message: message.length > 200 ? message.slice(0, 200) + '...' : message,
    componentName,
    timestamp: Date.now(),
    recovered: false
  };

  // 在开发模式下输出错误日志
  if (globalConfig.devMode && globalConfig.errorLog.enabled) {
    logSSRError(error);
  }

  return error;
}

/**
 * 输出 SSR 错误日志
 */
function logSSRError(error: SSRError): void {
  if (globalConfig.errorLog.logFn) {
    globalConfig.errorLog.logFn(error);
  } else {
    const prefix = `[Qore SSR Error] ${error.reason}`;
    if (globalConfig.errorLog.verbose && error.originalError) {
      console.error(`${prefix}: ${error.message}`, error.originalError);
    } else {
      console.error(`${prefix}: ${error.message}${error.componentName ? ` (Component: ${error.componentName})` : ''}`);
    }
  }
}

/**
 * 根据错误生成 HTML 注释
 */
function errorToComment(error: SSRError): string {
  const reasonText = error.reason === SSRErrorReason.TIMEOUT 
    ? `SSR Timeout (${globalConfig.defaultTimeoutMs / 1000}s)`
    : `SSR Error: ${error.message}`;
  
  return `<!-- ${reasonText} -->`;
}

/**
 * 获取组件名称（从函数名推断）
 */
function getComponentName(component: Component): string | undefined {
  return component.name || undefined;
}

// ============================================================================
// Core Rendering Functions
// ============================================================================

export function renderToString(vnode: VNode): string {
  if (vnode == null || vnode === false) return '';
  if (typeof vnode === 'string') return escapeHtml(vnode);
  if (typeof vnode === 'number') return String(vnode);
  if (Array.isArray(vnode)) return vnode.map(v => renderToString(v)).join('');
  if (typeof vnode === 'function') {
    try { 
      return renderToString(vnode()); 
    } catch (err) {
      const error = createSSRError(
        SSRErrorReason.COMPONENT_ERROR,
        err instanceof Error ? err : new Error(String(err)),
        getComponentName(vnode)
      );
      if (globalConfig.devMode) {
        return errorToComment(error);
      }
      return '<!-- Error -->';
    }
  }
  return '';
}

export function renderComponentToString(component: Component): string {
  return renderToString(component());
}

export function renderProps(props: Record<string, any> | null): string {
  if (!props) return '';
  const attrs: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || value == null || key.startsWith('on') || typeof value === 'function') continue;
    if (key === 'className') attrs.push(`class="${escapeHtml(String(value))}"`);
    else if (key === 'style' && typeof value === 'object') {
      const styleStr = Object.entries(value).map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}: ${v}`).join('; ');
      attrs.push(`style="${escapeHtml(styleStr)}"`);
    } else {
      attrs.push(`${key}="${escapeHtml(String(value))}"`);
    }
  }
  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

export function renderToStream(
  component: Component,
  options?: { chunkSize?: number; onChunk?: (chunk: string) => void }
): { renderer: StreamRenderer; promise: Promise<void>; abort: () => void } {
  const { chunkSize = 1000, onChunk } = options || {};
  const renderer = new StreamRenderer();
  let aborted = false;
  
  const promise = Promise.resolve().then(() => {
    if (aborted) return;
    const html = renderToString(component());
    if (html.length <= chunkSize) {
      renderer.write(html);
      onChunk?.(html);
    } else {
      for (let i = 0; i < html.length; i += chunkSize) {
        if (aborted) break;
        const chunk = html.slice(i, i + chunkSize);
        renderer.write(chunk);
        onChunk?.(chunk);
      }
    }
    renderer.end();
  });
  
  return { renderer, promise, abort: () => { aborted = true; } };
}

export async function renderAsync(vnode: VNode | Promise<VNode>): Promise<string> {
  const resolved = await vnode;
  if (resolved == null || resolved === false) return '';
  if (typeof resolved === 'string') return escapeHtml(resolved);
  if (typeof resolved === 'number') return String(resolved);
  if (Array.isArray(resolved)) {
    const results = await Promise.all(resolved.map(v => renderAsync(v)));
    return results.join('');
  }
  if (typeof resolved === 'function') {
    try {
      const result = await resolved();
      return renderAsync(result);
    } catch (err) {
      const error = createSSRError(
        SSRErrorReason.ASYNC_ERROR,
        err instanceof Error ? err : new Error(String(err)),
        getComponentName(resolved)
      );
      if (globalConfig.devMode) {
        return errorToComment(error);
      }
      return '<!-- Async Error -->';
    }
  }
  return '';
}

export async function renderToStreamAsync(
  component: Component,
  renderer: StreamRenderer,
  options?: { onChunk?: (chunk: string) => void }
): Promise<void> {
  try {
    const vnode = await Promise.resolve(component());
    const html = await renderAsync(vnode);
    renderer.write(html);
    options?.onChunk?.(html);
    renderer.end();
  } catch (err) {
    const error = createSSRError(
      SSRErrorReason.STREAM_ERROR,
      err instanceof Error ? err : new Error(String(err)),
      getComponentName(component)
    );
    renderer.fail(error.originalError || new Error(error.message));
  }
}

export interface PrefetchContext {
  promises: Promise<any>[];
  errors: Error[];
  add: (promise: Promise<any>) => void;
  waitAll: () => Promise<void>;
}

export function createPrefetchContext(): PrefetchContext {
  const promises: Promise<any>[] = [];
  const errors: Error[] = [];
  
  return {
    promises, errors,
    add: (promise: Promise<any>) => {
      promises.push(promise.catch((err: Error) => { errors.push(err); return null; }));
    },
    waitAll: async () => { await Promise.all(promises); }
  };
}

export async function prefetchAndRender<T>(
  prefetchFn: () => Promise<T>,
  renderFn: (data: T) => Component
): Promise<string> {
  const ctx = createPrefetchContext();
  ctx.add(prefetchFn());
  await ctx.waitAll();
  if (ctx.errors.length > 0) {
    const error = createSSRError(
      SSRErrorReason.PREFETCH_ERROR,
      ctx.errors[0]
    );
    if (globalConfig.devMode) {
      return errorToComment(error);
    }
    return '<!-- Prefetch Error -->';
  }
  const data = await ctx.promises[0];
  return renderToString(renderFn(data)());
}

/**
 * renderWithSuspense 选项
 */
export interface RenderWithSuspenseOptions {
  /** 自定义 fallback（生产模式使用） */
  fallback?: string;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
  /** 错误恢复策略 */
  recoveryStrategy?: SSRRecoveryStrategy;
  /** 备用组件（当 recoveryStrategy 为 ALTERNATE_COMPONENT 时使用） */
  alternateComponent?: Component;
}

/**
 * renderWithSuspense 返回结果
 */
export interface RenderWithSuspenseResult {
  /** 渲染的 HTML 字符串 */
  html: string;
  /** 是否发生错误 */
  hasError: boolean;
  /** 错误信息（如果有） */
  error?: SSRError;
}

export async function renderWithSuspense(
  component: Component,
  options?: RenderWithSuspenseOptions
): Promise<string | RenderWithSuspenseResult> {
  const {
    fallback = '<!-- Loading -->',
    timeoutMs = globalConfig.defaultTimeoutMs,
    recoveryStrategy = globalConfig.defaultRecoveryStrategy,
    alternateComponent
  } = options || {};

  let renderError: SSRError | undefined;

  // 创建超时 promise，使用 setTimeout 包装以便正确触发
  const timeoutPromise: Promise<string> = new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      const timeoutError = new Error('SSR timeout');
      (timeoutError as any)._isTimeout = true;
      reject(timeoutError);
    }, timeoutMs);
    
    // 清理超时（虽然 race 后不会用到，但保持良好实践）
    timeoutId.unref?.();
  });

  const renderPromise = Promise.resolve().then(() => {
    try {
      return renderToString(component());
    } catch (err) {
      renderError = createSSRError(
        SSRErrorReason.COMPONENT_ERROR,
        err instanceof Error ? err : new Error(String(err)),
        getComponentName(component)
      );
      
      // 根据恢复策略处理
      switch (recoveryStrategy) {
        case SSRRecoveryStrategy.EMPTY:
          return '';
        case SSRRecoveryStrategy.ALTERNATE_COMPONENT:
          if (alternateComponent) {
            try {
              return renderToString(alternateComponent());
            } catch {
              // 备用组件也失败，返回错误注释
            }
          }
          return errorToComment(renderError);
        case SSRRecoveryStrategy.THROW:
          throw err;
        case SSRRecoveryStrategy.FALLBACK_COMMENT:
        default:
          return errorToComment(renderError);
      }
    }
  });

  try {
    const result = await Promise.race([renderPromise, timeoutPromise]);
    
    // 如果返回的是详细结果对象
    if (typeof result === 'object' && result !== null && 'html' in result) {
      return result;
    }
    
    return result;
  } catch (err) {
    // 检查是否是超时错误
    const isTimeout = (err as any)._isTimeout === true || 
                      (err instanceof Error && err.message === 'SSR timeout');
    
    // 超时错误
    renderError = createSSRError(
      isTimeout ? SSRErrorReason.TIMEOUT : SSRErrorReason.COMPONENT_ERROR,
      err instanceof Error ? err : new Error(String(err))
    );

    // 根据恢复策略处理
    switch (recoveryStrategy) {
      case SSRRecoveryStrategy.EMPTY:
        return '';
      case SSRRecoveryStrategy.ALTERNATE_COMPONENT:
        if (alternateComponent) {
          try {
            return renderToString(alternateComponent());
          } catch {
            // 备用组件也失败
          }
        }
        return errorToComment(renderError);
      case SSRRecoveryStrategy.THROW:
        throw err;
      case SSRRecoveryStrategy.FALLBACK_COMMENT:
      default:
        return errorToComment(renderError);
    }
  }
}

export interface SSRResult {
  html: string;
  state?: string;
  errors: SSRError[];
  /** 是否成功渲染 */
  success: boolean;
  /** 渲染耗时（毫秒） */
  renderTimeMs?: number;
}

export interface RenderSSROptions {
  /** 是否包含状态注入脚本 */
  includeState?: boolean;
  /** 状态数据 */
  state?: any;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
  /** 错误恢复策略 */
  recoveryStrategy?: SSRRecoveryStrategy;
  /** 备用组件 */
  alternateComponent?: Component;
  /** 是否返回详细结果（包含 error 对象） */
  detailedResult?: boolean;
}

export async function renderSSR(
  component: Component,
  options?: RenderSSROptions
): Promise<SSRResult> {
  const {
    includeState = false,
    state,
    timeoutMs,
    recoveryStrategy = globalConfig.defaultRecoveryStrategy,
    alternateComponent,
    detailedResult = false
  } = options || {};

  const errors: SSRError[] = [];
  const startTime = Date.now();
  let html: string;
  let success = true;

  try {
    const result = await renderWithSuspense(component, {
      timeoutMs,
      recoveryStrategy,
      alternateComponent
    });

    if (typeof result === 'string') {
      html = result;
      // 检查 HTML 是否包含错误注释，并创建相应的错误对象
      if (html.includes('<!-- SSR Timeout')) {
        success = false;
        const error: SSRError = {
          reason: SSRErrorReason.TIMEOUT,
          message: `SSR Timeout (${timeoutMs || globalConfig.defaultTimeoutMs}ms)`,
          timestamp: Date.now(),
          recovered: false
        };
        errors.push(error);
      } else if (html.includes('<!-- SSR Error:')) {
        success = false;
        // 从注释中提取错误消息
        const match = html.match(/<!-- SSR Error: ([^-]+?) -->/);
        const errorMessage = match ? match[1].trim() : 'Unknown SSR error';
        const error: SSRError = {
          reason: SSRErrorReason.COMPONENT_ERROR,
          message: errorMessage,
          timestamp: Date.now(),
          recovered: false
        };
        errors.push(error);
      }
    } else {
      // 详细结果模式
      html = result.html;
      success = !result.hasError;
      if (result.error) {
        errors.push(result.error);
      }
    }
  } catch (err) {
    success = false;
    const error = createSSRError(
      SSRErrorReason.UNKNOWN,
      err instanceof Error ? err : new Error(String(err))
    );
    errors.push(error);
    html = errorToComment(error);
  }

  const renderTimeMs = Date.now() - startTime;

  const result: SSRResult = {
    html,
    errors,
    success,
    renderTimeMs
  };

  if (includeState && state) {
    result.state = `<script>window.__QORE_STATE__ = ${JSON.stringify(state)}</script>`;
  }

  return result;
}

// ============================================================================
// Error Boundary Component (Optional Helper)
// ============================================================================

/**
 * 错误边界组件 props
 */
export interface ErrorBoundaryProps {
  /** 子组件 */
  children: Component;
  /** 错误时显示的备用组件 */
  fallback?: Component;
  /** 错误回调 */
  onError?: (error: SSRError) => void;
  /** 是否捕获错误并继续渲染 */
  captureError?: boolean;
}

/**
 * 错误边界组件工厂
 * 在 SSR 中用于捕获子组件的错误
 */
export function createErrorBoundary(props: ErrorBoundaryProps): Component {
  return () => {
    try {
      return props.children();
    } catch (err) {
      const error = createSSRError(
        SSRErrorReason.COMPONENT_ERROR,
        err instanceof Error ? err : new Error(String(err))
      );

      if (props.onError) {
        props.onError(error);
      }

      if (props.fallback) {
        try {
          return props.fallback();
        } catch {
          // fallback 也失败，返回错误注释
        }
      }

      if (globalConfig.devMode) {
        return errorToComment(error);
      }

      return props.captureError ? '' : '<!-- Error -->';
    }
  };
}
