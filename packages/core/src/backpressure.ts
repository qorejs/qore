/**
 * Qore Backpressure Handling
 * 流式渲染背压处理 - 流速率控制、缓冲区管理、慢消费者检测
 * Import via: import { ... } from '@qorejs/qore/backpressure'
 */

import { signal, computed, effect } from './signal';

// ============== 类型定义 ==============

export interface BackpressureOptions {
  /** 最大缓冲区大小 (chunks) */
  maxBufferSize?: number;
  /** 高水位线 (触发背压) */
  highWaterMark?: number;
  /** 低水位线 (解除背压) */
  lowWaterMark?: number;
  /** 流速率限制 (chunks/ms) */
  rateLimit?: number;
  /** 慢消费者检测阈值 (ms) */
  slowConsumerThreshold?: number;
  /** 背压回调 */
  onBackpressure?: (state: BackpressureState) => void;
  /** 恢复回调 */
  onResume?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

export interface BackpressureState {
  /** 是否处于背压状态 */
  isBackpressured: boolean;
  /** 当前缓冲区大小 */
  bufferSize: number;
  /** 缓冲区使用率 (0-1) */
  bufferUtilization: number;
  /** 当前流速率 (chunks/ms) */
  currentRate: number;
  /** 慢消费者标志 */
  isSlowConsumer: boolean;
  /** 暂停的消费者数量 */
  pausedConsumers: number;
}

export interface BackpressureMetrics {
  /** 总写入 chunks 数 */
  totalWritten: number;
  /** 总读取 chunks 数 */
  totalRead: number;
  /** 背压触发次数 */
  backpressureCount: number;
  /** 平均缓冲区大小 */
  avgBufferSize: number;
  /** 最大缓冲区大小 */
  maxBufferSize: number;
  /** 慢消费者检测次数 */
  slowConsumerCount: number;
  /** 背压持续时间 (ms) */
  totalBackpressureTime: number;
}

export interface BackpressureConsumer {
  /** 消费者 ID */
  id: string;
  /** 上次消费时间 */
  lastConsumedAt: number;
  /** 消费速率 (chunks/ms) */
  consumptionRate: number;
  /** 是否暂停 */
  isPaused: boolean;
  /** 待处理 chunks 数 */
  pendingChunks: number;
}

// ============== 背压控制器 ==============

/**
 * 背压控制器 - 管理流式渲染的背压处理
 */
export class BackpressureController {
  private options: Required<BackpressureOptions>;
  private buffer: string[] = [];
  private consumers: Map<string, BackpressureConsumer> = new Map();
  private state: BackpressureState = {
    isBackpressured: false,
    bufferSize: 0,
    bufferUtilization: 0,
    currentRate: 0,
    isSlowConsumer: false,
    pausedConsumers: 0
  };
  private metrics: BackpressureMetrics = {
    totalWritten: 0,
    totalRead: 0,
    backpressureCount: 0,
    avgBufferSize: 0,
    maxBufferSize: 0,
    slowConsumerCount: 0,
    totalBackpressureTime: 0
  };
  private rateLimiter: RateLimiter;
  private backpressureStartTime: number | null = null;
  private _isDestroyed = false;

  constructor(options: BackpressureOptions = {}) {
    this.options = {
      maxBufferSize: options.maxBufferSize ?? 1000,
      highWaterMark: options.highWaterMark ?? 0.8,
      lowWaterMark: options.lowWaterMark ?? 0.5,
      rateLimit: options.rateLimit ?? 100,
      slowConsumerThreshold: options.slowConsumerThreshold ?? 1000,
      onBackpressure: options.onBackpressure ?? (() => {}),
      onResume: options.onResume ?? (() => {}),
      onError: options.onError ?? ((err) => console.error('Backpressure error:', err))
    };

    this.rateLimiter = new RateLimiter(this.options.rateLimit);
    this.updateState();
  }

  /**
   * 写入 chunk 到缓冲区
   */
  async write(chunk: string): Promise<boolean> {
    if (this._isDestroyed) {
      throw new Error('BackpressureController has been destroyed');
    }

    // 速率限制
    await this.rateLimiter.acquire();

    // 检查背压状态
    if (this.state.isBackpressured) {
      this.metrics.backpressureCount++;
      if (this.backpressureStartTime === null) {
        this.backpressureStartTime = Date.now();
      }
      this.options.onBackpressure(this.state);
      return false;
    }

    // 写入缓冲区
    this.buffer.push(chunk);
    this.metrics.totalWritten++;
    this.updateState();

    // 检查是否需要触发背压
    this.checkBackpressure();

    return true;
  }

  /**
   * 从缓冲区读取 chunk
   */
  read(consumerId: string): string | null {
    if (this.buffer.length === 0) {
      return null;
    }

    const chunk = this.buffer.shift()!;
    this.metrics.totalRead++;
    
    // 更新消费者状态
    this.updateConsumer(consumerId);
    
    // 更新状态
    this.updateState();
    
    // 检查是否需要解除背压
    this.checkResume();

    return chunk;
  }

  /**
   * 注册消费者
   */
  registerConsumer(consumerId: string): void {
    this.consumers.set(consumerId, {
      id: consumerId,
      lastConsumedAt: Date.now(),
      consumptionRate: 0,
      isPaused: false,
      pendingChunks: 0
    });
  }

  /**
   * 注销消费者
   */
  unregisterConsumer(consumerId: string): void {
    this.consumers.delete(consumerId);
  }

  /**
   * 暂停消费者
   */
  pauseConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.isPaused = true;
      this.updatePausedCount();
    }
  }

  /**
   * 恢复消费者
   */
  resumeConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.isPaused = false;
      this.updatePausedCount();
    }
  }

  /**
   * 检测慢消费者
   */
  detectSlowConsumers(): string[] {
    const now = Date.now();
    const slowConsumers: string[] = [];

    for (const [id, consumer] of this.consumers.entries()) {
      if (consumer.isPaused) continue;

      const timeSinceLastConsumed = now - consumer.lastConsumedAt;
      if (timeSinceLastConsumed > this.options.slowConsumerThreshold) {
        slowConsumers.push(id);
        consumer.isPaused = true;
        this.metrics.slowConsumerCount++;
        this.state.isSlowConsumer = true;
      }
    }

    this.updatePausedCount();
    return slowConsumers;
  }

  /**
   * 获取当前状态
   */
  getState(): BackpressureState {
    return { ...this.state };
  }

  /**
   * 获取指标
   */
  getMetrics(): BackpressureMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = [];
    this.updateState();
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this._isDestroyed = true;
    this.buffer = [];
    this.consumers.clear();
    this.rateLimiter.destroy();
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalWritten: 0,
      totalRead: 0,
      backpressureCount: 0,
      avgBufferSize: 0,
      maxBufferSize: 0,
      slowConsumerCount: 0,
      totalBackpressureTime: 0
    };
  }

  private updateState(): void {
    const bufferSize = this.buffer.length;
    const maxBufferSize = this.options.maxBufferSize;
    
    this.state.bufferSize = bufferSize;
    this.state.bufferUtilization = bufferSize / maxBufferSize;
    this.state.currentRate = this.rateLimiter.getCurrentRate();
    this.state.isBackpressured = this.state.bufferUtilization >= this.options.highWaterMark;
    this.state.pausedConsumers = Array.from(this.consumers.values()).filter(c => c.isPaused).length;

    // 更新最大缓冲区大小
    if (bufferSize > this.metrics.maxBufferSize) {
      this.metrics.maxBufferSize = bufferSize;
    }

    // 更新平均缓冲区大小
    const totalSamples = this.metrics.totalWritten || 1;
    this.metrics.avgBufferSize = (
      (this.metrics.avgBufferSize * (totalSamples - 1) + bufferSize) / totalSamples
    );
  }

  private checkBackpressure(): void {
    if (this.state.bufferUtilization >= this.options.highWaterMark && !this.state.isBackpressured) {
      this.state.isBackpressured = true;
      this.backpressureStartTime = Date.now();
      this.options.onBackpressure(this.state);
      
      // 暂停所有消费者
      for (const [id] of this.consumers) {
        this.pauseConsumer(id);
      }
    }
  }

  private checkResume(): void {
    if (!this.state.isBackpressured) return;

    if (this.state.bufferUtilization <= this.options.lowWaterMark) {
      this.state.isBackpressured = false;
      
      // 计算背压持续时间
      if (this.backpressureStartTime !== null) {
        this.metrics.totalBackpressureTime += Date.now() - this.backpressureStartTime;
        this.backpressureStartTime = null;
      }

      // 恢复所有消费者
      for (const [id] of this.consumers) {
        this.resumeConsumer(id);
      }

      this.options.onResume();
    }
  }

  private updateConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return;

    const now = Date.now();
    const timeDiff = now - consumer.lastConsumedAt;
    
    if (timeDiff > 0) {
      // 指数移动平均更新消费速率
      const newRate = 1 / timeDiff;
      consumer.consumptionRate = consumer.consumptionRate * 0.7 + newRate * 0.3;
    }
    
    consumer.lastConsumedAt = now;
    consumer.pendingChunks = Math.max(0, consumer.pendingChunks - 1);
  }

  private updatePausedCount(): void {
    this.state.pausedConsumers = Array.from(this.consumers.values()).filter(c => c.isPaused).length;
  }
}

// ============== 速率限制器 ==============

/**
 * 速率限制器 - 令牌桶算法实现
 */
class RateLimiter {
  private rateLimit: number; // chunks/ms
  private tokens: number;
  private lastRefillTime: number;
  private _isDestroyed = false;
  private rateHistory: number[] = [];

  constructor(rateLimit: number) {
    this.rateLimit = rateLimit;
    this.tokens = rateLimit;
    this.lastRefillTime = Date.now();
  }

  /**
   * 获取令牌（等待直到有可用令牌）
   */
  async acquire(): Promise<void> {
    if (this._isDestroyed) {
      throw new Error('RateLimiter has been destroyed');
    }

    while (this.tokens < 1) {
      this.refill();
      if (this.tokens < 1) {
        // 等待直到有令牌
        const waitTime = Math.ceil((1 - this.tokens) / this.rateLimit);
        await this.sleep(Math.max(1, waitTime));
      }
    }

    this.tokens -= 1;
    this.recordRate();
  }

  /**
   * 获取当前速率
   */
  getCurrentRate(): number {
    if (this.rateHistory.length === 0) return 0;
    
    // 计算最近 10 次采样的平均速率
    const recentRates = this.rateHistory.slice(-10);
    return recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
  }

  /**
   * 销毁速率限制器
   */
  destroy(): void {
    this._isDestroyed = true;
    this.rateHistory = [];
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const tokensToAdd = timePassed * this.rateLimit;
    
    this.tokens = Math.min(this.rateLimit, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  private recordRate(): void {
    const currentRate = this.tokens / this.rateLimit;
    this.rateHistory.push(currentRate);
    
    // 保持历史记录大小
    if (this.rateHistory.length > 100) {
      this.rateHistory.shift();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============== 背压感知流 ==============

export interface BackpressureStreamOptions extends BackpressureOptions {
  /** 流名称 */
  name?: string;
}

/**
 * 背压感知流 - 自动处理背压的流式渲染
 */
export class BackpressureStream {
  private controller: BackpressureController;
  private name: string;
  private _isClosed = false;

  constructor(options: BackpressureStreamOptions = {}) {
    const { name = 'default', ...backpressureOptions } = options;
    this.name = name;
    this.controller = new BackpressureController(backpressureOptions);
  }

  /**
   * 写入 chunk
   */
  async write(chunk: string): Promise<boolean> {
    if (this._isClosed) {
      throw new Error('Stream is closed');
    }
    return await this.controller.write(chunk);
  }

  /**
   * 读取 chunk
   */
  read(consumerId: string): string | null {
    return this.controller.read(consumerId);
  }

  /**
   * 注册消费者
   */
  registerConsumer(consumerId: string): void {
    this.controller.registerConsumer(consumerId);
  }

  /**
   * 关闭流
   */
  close(): void {
    this._isClosed = true;
    this.controller.destroy();
  }

  /**
   * 获取状态
   */
  getState(): BackpressureState {
    return this.controller.getState();
  }

  /**
   * 获取指标
   */
  getMetrics(): BackpressureMetrics {
    return this.controller.getMetrics();
  }

  /**
   * 创建异步迭代器
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<string, void, unknown> {
    const consumerId = `consumer-${Date.now()}-${Math.random()}`;
    this.registerConsumer(consumerId);

    try {
      while (!this._isClosed) {
        const chunk = this.read(consumerId);
        if (chunk !== null) {
          yield chunk;
        } else {
          // 等待新数据
          await this.sleep(10);
        }
      }
    } finally {
      this.controller.unregisterConsumer(consumerId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============== 工具函数 ==============

/**
 * 创建背压控制器
 */
export function createBackpressureController(options?: BackpressureOptions): BackpressureController {
  return new BackpressureController(options);
}

/**
 * 创建背压感知流
 */
export function createBackpressureStream(options?: BackpressureStreamOptions): BackpressureStream {
  return new BackpressureStream(options);
}

/**
 * 背压感知包装器 - 包装现有流以添加背压处理
 */
export function withBackpressure<T extends { write: (chunk: string) => void }>(
  stream: T,
  options?: BackpressureOptions
): T & { controller: BackpressureController } {
  const controller = new BackpressureController(options);
  
  const originalWrite = stream.write.bind(stream);
  const wrappedWrite = async (chunk: string) => {
    const canWrite = await controller.write(chunk);
    if (canWrite) {
      originalWrite(chunk);
    }
    return canWrite;
  };

  return Object.assign(stream, {
    write: wrappedWrite,
    controller
  });
}
