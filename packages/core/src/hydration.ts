/**
 * Qore Progressive Hydration
 * 渐进式水合 - 分块水合、优先级水合、水合状态追踪
 * Import via: import { ... } from '@qorejs/qore/hydration'
 */

import { signal, computed, effect, batch } from './signal';
import type { VNode, Component } from './render';

// ============== 类型定义 ==============

export type HydrationPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

export interface HydrationOptions {
  /** 水合优先级 */
  priority?: HydrationPriority;
  /** 水合超时时间 (ms) */
  timeout?: number;
  /** 水合回调 */
  onHydrate?: (id: string) => void;
  /** 水合失败回调 */
  onError?: (id: string, error: Error) => void;
  /** 水合进度回调 */
  onProgress?: (progress: HydrationProgress) => void;
}

export interface HydrationProgress {
  /** 总组件数 */
  total: number;
  /** 已水合组件数 */
  hydrated: number;
  /** 失败组件数 */
  failed: number;
  /** 水合进度 (0-1) */
  progress: number;
  /** 当前水合的组件 ID */
  currentId?: string;
}

export interface HydrationState {
  /** 组件 ID */
  id: string;
  /** 水合状态 */
  status: 'pending' | 'hydrating' | 'hydrated' | 'failed' | 'skipped';
  /** 优先级 */
  priority: HydrationPriority;
  /** 水合开始时间 */
  startTime?: number;
  /** 水合完成时间 */
  endTime?: number;
  /** 错误信息 */
  error?: Error;
  /** 组件类型 */
  componentType?: string;
  /** 依赖项 */
  dependencies?: string[];
}

export interface HydrationMetrics {
  /** 总组件数 */
  totalComponents: number;
  /** 已水合组件数 */
  hydratedComponents: number;
  /** 失败组件数 */
  failedComponents: number;
  /** 跳过组件数 */
  skippedComponents: number;
  /** 平均水合时间 (ms) */
  avgHydrationTime: number;
  /** 总水合时间 (ms) */
  totalHydrationTime: number;
  /** 首次水合时间 (ms) */
  firstHydrationTime: number;
  /** 最后水合时间 (ms) */
  lastHydrationTime: number;
  /** 各优先级水合数 */
  byPriority: Record<HydrationPriority, number>;
}

export interface HydrationChunk {
  /** 分块 ID */
  id: string;
  /** 分块中的组件 IDs */
  componentIds: string[];
  /** 分块优先级 */
  priority: HydrationPriority;
  /** 是否已水合 */
  hydrated: boolean;
}

// ============== 水合状态追踪器 ==============

/**
 * 水合状态追踪器 - 追踪每个组件的水合状态
 */
export class HydrationTracker {
  private states: Map<string, HydrationState> = new Map();
  private metrics: HydrationMetrics = {
    totalComponents: 0,
    hydratedComponents: 0,
    failedComponents: 0,
    skippedComponents: 0,
    avgHydrationTime: 0,
    totalHydrationTime: 0,
    firstHydrationTime: 0,
    lastHydrationTime: 0,
    byPriority: { critical: 0, high: 0, normal: 0, low: 0, idle: 0 }
  };
  private hydrationTimes: number[] = [];
  private _hydrationStart: number | null = null;

  /**
   * 注册组件
   */
  register(id: string, options: HydrationOptions = {}): void {
    const state: HydrationState = {
      id,
      status: 'pending',
      priority: options.priority ?? 'normal',
      componentType: undefined,
      dependencies: undefined
    };
    
    this.states.set(id, state);
    this.metrics.totalComponents++;
    this.metrics.byPriority[state.priority]++;
  }

  /**
   * 开始水合
   */
  startHydration(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    state.status = 'hydrating';
    state.startTime = Date.now();
    
    if (this._hydrationStart === null) {
      this._hydrationStart = state.startTime;
    }
  }

  /**
   * 完成水合
   */
  completeHydration(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    state.status = 'hydrated';
    state.endTime = Date.now();
    
    this.metrics.hydratedComponents++;
    
    // 计算水合时间
    if (state.startTime) {
      const hydrationTime = state.endTime - state.startTime;
      this.hydrationTimes.push(hydrationTime);
      this.metrics.totalHydrationTime += hydrationTime;
      this.metrics.avgHydrationTime = 
        this.metrics.totalHydrationTime / this.hydrationTimes.length;
      
      if (this.metrics.firstHydrationTime === 0) {
        this.metrics.firstHydrationTime = hydrationTime;
      }
      this.metrics.lastHydrationTime = hydrationTime;
    }
  }

  /**
   * 标记水合失败
   */
  failHydration(id: string, error: Error): void {
    const state = this.states.get(id);
    if (!state) return;

    state.status = 'failed';
    state.error = error;
    state.endTime = Date.now();
    
    this.metrics.failedComponents++;
  }

  /**
   * 跳过水合
   */
  skipHydration(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    state.status = 'skipped';
    this.metrics.skippedComponents++;
  }

  /**
   * 获取组件状态
   */
  getState(id: string): HydrationState | undefined {
    return this.states.get(id);
  }

  /**
   * 获取所有状态
   */
  getAllStates(): Map<string, HydrationState> {
    return new Map(this.states);
  }

  /**
   * 获取指标
   */
  getMetrics(): HydrationMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取水合进度
   */
  getProgress(): HydrationProgress {
    const { totalComponents, hydratedComponents, failedComponents } = this.metrics;
    return {
      total: totalComponents,
      hydrated: hydratedComponents,
      failed: failedComponents,
      progress: totalComponents > 0 ? hydratedComponents / totalComponents : 0
    };
  }

  /**
   * 获取按优先级分组的状态
   */
  getByPriority(priority: HydrationPriority): HydrationState[] {
    return Array.from(this.states.values()).filter(s => s.priority === priority);
  }

  /**
   * 获取待水合组件
   */
  getPendingComponents(): HydrationState[] {
    return Array.from(this.states.values()).filter(s => s.status === 'pending');
  }

  /**
   * 获取正在水合的组件
   */
  getHydratingComponents(): HydrationState[] {
    return Array.from(this.states.values()).filter(s => s.status === 'hydrating');
  }

  /**
   * 重置追踪器
   */
  reset(): void {
    this.states.clear();
    this.metrics = {
      totalComponents: 0,
      hydratedComponents: 0,
      failedComponents: 0,
      skippedComponents: 0,
      avgHydrationTime: 0,
      totalHydrationTime: 0,
      firstHydrationTime: 0,
      lastHydrationTime: 0,
      byPriority: { critical: 0, high: 0, normal: 0, low: 0, idle: 0 }
    };
    this.hydrationTimes = [];
    this._hydrationStart = null;
  }
}

// ============== 分块水合器 ==============

/**
 * 分块水合器 - 将组件分组为多个分块进行水合
 */
export class ChunkedHydrator {
  private chunks: Map<string, HydrationChunk> = new Map();
  private componentToChunk: Map<string, string> = new Map();
  private tracker: HydrationTracker;
  private options: {
    chunkSize: number;
    maxConcurrent: number;
  };

  constructor(options: { chunkSize?: number; maxConcurrent?: number } = {}) {
    this.options = {
      chunkSize: options.chunkSize ?? 10,
      maxConcurrent: options.maxConcurrent ?? 3
    };
    this.tracker = new HydrationTracker();
  }

  /**
   * 创建分块
   */
  createChunk(id: string, componentIds: string[], priority: HydrationPriority = 'normal'): void {
    const chunk: HydrationChunk = {
      id,
      componentIds: [...componentIds],
      priority,
      hydrated: false
    };

    this.chunks.set(id, chunk);
    
    // 映射组件到分块
    for (const componentId of componentIds) {
      this.componentToChunk.set(componentId, id);
      this.tracker.register(componentId, { priority });
    }
  }

  /**
   * 自动分块 - 根据组件列表自动创建分块
   */
  autoChunk(componentIds: string[], options: {
    chunkSize?: number;
    priority?: HydrationPriority;
  } = {}): string[] {
    const { chunkSize = this.options.chunkSize, priority = 'normal' } = options;
    const chunkIds: string[] = [];

    for (let i = 0; i < componentIds.length; i += chunkSize) {
      const chunkId = `chunk-${Date.now()}-${i}`;
      const chunkComponentIds = componentIds.slice(i, i + chunkSize);
      
      this.createChunk(chunkId, chunkComponentIds, priority);
      chunkIds.push(chunkId);
    }

    return chunkIds;
  }

  /**
   * 水合分块
   */
  async hydrateChunk(chunkId: string, hydrateFn: (componentId: string) => Promise<void>): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) throw new Error(`Chunk ${chunkId} not found`);

    for (const componentId of chunk.componentIds) {
      this.tracker.startHydration(componentId);
      
      try {
        await hydrateFn(componentId);
        this.tracker.completeHydration(componentId);
      } catch (error) {
        this.tracker.failHydration(componentId, error as Error);
      }
    }

    chunk.hydrated = true;
  }

  /**
   * 按优先级水合所有分块
   */
  async hydrateAll(
    hydrateFn: (componentId: string) => Promise<void>
  ): Promise<void> {
    const priorities: HydrationPriority[] = ['critical', 'high', 'normal', 'low', 'idle'];

    for (const priority of priorities) {
      const priorityChunks = Array.from(this.chunks.values())
        .filter(chunk => chunk.priority === priority && !chunk.hydrated);

      // 并发水合
      const concurrentChunks = [];
      for (const chunk of priorityChunks) {
        concurrentChunks.push(this.hydrateChunk(chunk.id, hydrateFn));
        
        if (concurrentChunks.length >= this.options.maxConcurrent) {
          await Promise.all(concurrentChunks);
          concurrentChunks.length = 0;
        }
      }

      await Promise.all(concurrentChunks);
    }
  }

  /**
   * 获取分块状态
   */
  getChunk(chunkId: string): HydrationChunk | undefined {
    return this.chunks.get(chunkId);
  }

  /**
   * 获取所有分块
   */
  getAllChunks(): HydrationChunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * 获取追踪器
   */
  getTracker(): HydrationTracker {
    return this.tracker;
  }

  /**
   * 重置
   */
  reset(): void {
    this.chunks.clear();
    this.componentToChunk.clear();
    this.tracker.reset();
  }
}

// ============== 优先级水合器 ==============

/**
 * 优先级水合器 - 根据优先级调度水合任务
 */
export class PriorityHydrator {
  private queues: Map<HydrationPriority, Array<{
    id: string;
    hydrateFn: () => Promise<void>;
    options: HydrationOptions;
  }>> = new Map();
  private tracker: HydrationTracker;
  private isProcessing = false;
  private options: {
    maxConcurrent: number;
    idleCallbackTimeout: number;
  };

  constructor(options: { maxConcurrent?: number; idleCallbackTimeout?: number } = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? 4,
      idleCallbackTimeout: options.idleCallbackTimeout ?? 1000
    };

    // 初始化优先级队列
    const priorities: HydrationPriority[] = ['critical', 'high', 'normal', 'low', 'idle'];
    for (const priority of priorities) {
      this.queues.set(priority, []);
    }

    this.tracker = new HydrationTracker();
  }

  /**
   * 添加水合任务
   */
  schedule(
    id: string,
    hydrateFn: () => Promise<void>,
    options: HydrationOptions = {}
  ): void {
    const priority = options.priority ?? 'normal';
    const queue = this.queues.get(priority)!;
    
    queue.push({ id, hydrateFn, options });
    this.tracker.register(id, options);
  }

  /**
   * 开始水合处理
   */
  async start(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const priorities: HydrationPriority[] = ['critical', 'high', 'normal', 'low', 'idle'];

    for (const priority of priorities) {
      await this.processQueue(priority);
    }

    this.isProcessing = false;
  }

  /**
   * 立即水合高优先级任务
   */
  async flushCritical(): Promise<void> {
    await this.processQueue('critical');
  }

  /**
   * 使用 requestIdleCallback 水合低优先级任务
   */
  scheduleIdle(): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        this.processQueue('idle');
      }, { timeout: this.options.idleCallbackTimeout });
    } else {
      // Fallback: 使用 setTimeout
      setTimeout(() => {
        this.processQueue('idle');
      }, this.options.idleCallbackTimeout);
    }
  }

  /**
   * 获取追踪器
   */
  getTracker(): HydrationTracker {
    return this.tracker;
  }

  /**
   * 取消任务
   */
  cancel(id: string): void {
    for (const [, queue] of this.queues.entries()) {
      const index = queue.findIndex(task => task.id === id);
      if (index !== -1) {
        queue.splice(index, 1);
        this.tracker.skipHydration(id);
        break;
      }
    }
  }

  /**
   * 清空所有队列
   */
  clear(): void {
    for (const [, queue] of this.queues.entries()) {
      queue.length = 0;
    }
    this.tracker.reset();
  }

  private async processQueue(priority: HydrationPriority): Promise<void> {
    const queue = this.queues.get(priority)!;
    
    while (queue.length > 0) {
      const tasks = queue.splice(0, this.options.maxConcurrent);
      
      await Promise.all(
        tasks.map(async (task) => {
          this.tracker.startHydration(task.id);
          
          try {
            await task.hydrateFn();
            this.tracker.completeHydration(task.id);
            task.options.onHydrate?.(task.id);
          } catch (error) {
            this.tracker.failHydration(task.id, error as Error);
            task.options.onError?.(task.id, error as Error);
          }
        })
      );
    }
  }
}

// ============== 渐进式水合组件 ==============

export interface ProgressiveHydrationProps {
  /** 组件 ID */
  id: string;
  /** 优先级 */
  priority?: HydrationPriority;
  /** 占位内容 */
  placeholder: VNode;
  /** 实际内容 */
  children: Component;
  /** 水合回调 */
  onHydrate?: () => void;
}

/**
 * 创建渐进式水合组件
 */
export function createProgressiveComponent({
  id,
  priority = 'normal',
  placeholder,
  children,
  onHydrate
}: ProgressiveHydrationProps): {
  component: Component;
  hydrate: () => Promise<void>;
  getState: () => HydrationState | undefined;
} {
  const hydrated = signal(false);
  const hydrating = signal(false);
  const error = signal<Error | null>(null);
  const tracker = new HydrationTracker();

  tracker.register(id, { priority });

  const hydrate = async (): Promise<void> => {
    if (hydrated()) return;
    
    hydrating(true);
    tracker.startHydration(id);

    try {
      // 触发组件重新渲染
      hydrated(true);
      onHydrate?.();
      tracker.completeHydration(id);
    } catch (err) {
      error(err as Error);
      tracker.failHydration(id, err as Error);
    } finally {
      hydrating(false);
    }
  };

  const component: Component = () => {
    if (error()) {
      return placeholder; // 或者显示错误 UI
    }
    
    if (!hydrated()) {
      return placeholder;
    }
    
    return children();
  };

  return {
    component,
    hydrate,
    getState: () => tracker.getState(id)
  };
}

// ============== 工具函数 ==============

/**
 * 创建水合追踪器
 */
export function createHydrationTracker(): HydrationTracker {
  return new HydrationTracker();
}

/**
 * 创建分块水合器
 */
export function createChunkedHydrator(options?: {
  chunkSize?: number;
  maxConcurrent?: number;
}): ChunkedHydrator {
  return new ChunkedHydrator(options);
}

/**
 * 创建优先级水合器
 */
export function createPriorityHydrator(options?: {
  maxConcurrent?: number;
  idleCallbackTimeout?: number;
}): PriorityHydrator {
  return new PriorityHydrator(options);
}

/**
 * 水合指令 - 用于 SSR 水合标记
 */
export function hydrationDirective(
  element: HTMLElement,
  id: string,
  hydrateFn: () => Promise<void>,
  options: HydrationOptions = {}
): () => void {
  element.setAttribute('data-hydration-id', id);
  element.setAttribute('data-hydration-priority', options.priority ?? 'normal');
  element.setAttribute('data-hydration-status', 'pending');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          element.setAttribute('data-hydration-status', 'hydrating');
          hydrateFn()
            .then(() => {
              element.setAttribute('data-hydration-status', 'hydrated');
              options.onHydrate?.(id);
            })
            .catch((err) => {
              element.setAttribute('data-hydration-status', 'failed');
              options.onError?.(id, err);
            })
            .finally(() => {
              observer.disconnect();
            });
        }
      });
    },
    { rootMargin: '100px' }
  );

  observer.observe(element);

  return () => observer.disconnect();
}

/**
 * 批量水合 - 水合多个组件
 */
export async function batchHydrate(
  components: Array<{ id: string; hydrateFn: () => Promise<void> }>,
  options: { concurrent?: number } = {}
): Promise<HydrationMetrics> {
  const { concurrent = 4 } = options;
  const tracker = new HydrationTracker();

  // 注册所有组件
  for (const { id } of components) {
    tracker.register(id);
  }

  // 分批水合
  for (let i = 0; i < components.length; i += concurrent) {
    const batch = components.slice(i, i + concurrent);
    
    await Promise.all(
      batch.map(async ({ id, hydrateFn }) => {
        tracker.startHydration(id);
        
        try {
          await hydrateFn();
          tracker.completeHydration(id);
        } catch (error) {
          tracker.failHydration(id, error as Error);
        }
      })
    );
  }

  return tracker.getMetrics();
}
