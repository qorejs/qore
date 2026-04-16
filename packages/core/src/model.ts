/**
 * Qore Model Loader - Optimized AI Model Loading with Enhanced Error Handling
 * Features: Lazy loading, persistent caching, async initialization, retry logic, timeout, fallback
 * Import via: import { ModelLoader, loadModel } from '@qorejs/qore/model'
 */

import { signal, computed } from './signal';
import { retry as retryUtil } from './error';

/**
 * Model loading state
 */
export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Model cache entry
 */
interface ModelCacheEntry<T = unknown> {
  model: T;
  loadedAt: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
}

/**
 * Fallback strategy for model loading
 */
export type FallbackStrategy = 
  | 'none'           // No fallback, just fail
  | 'cache'          // Use cached version if available
  | 'default'        // Use a default mock model
  | 'graceful';      // Return partial functionality

/**
 * Model loader options with enhanced error handling
 */
export interface ModelLoaderOptions {
  /** Model identifier/name */
  name: string;
  /** Model source URL or path */
  source: string;
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTTL?: number;
  /** Enable persistent caching (IndexedDB) */
  persistentCache?: boolean;
  /** Lazy load (only load when first used) */
  lazy?: boolean;
  /** Preload on initialization */
  preload?: boolean;
  
  // Error handling options
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Retry backoff multiplier (default: 2) */
  retryBackoff?: number;
  /** Load timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Fallback strategy when all retries fail */
  fallbackStrategy?: FallbackStrategy;
  /** Default/fallback model data */
  fallbackData?: any;
  /** Called on each retry attempt */
  onRetry?: (error: Error, attempt: number) => void;
  /** Called when load fails completely */
  onLoadError?: (error: Error) => void;
  /** Called when fallback is used */
  onFallback?: (reason: string) => void;
}

/**
 * Model instance wrapper with enhanced error information
 */
export interface ModelInstance<T = unknown> {
  /** The loaded model */
  data: T | null;
  /** Loading status */
  status: ModelStatus;
  /** Error if loading failed */
  error: Error | null;
  /** Progress (0-100) */
  progress: number;
  /** Reload the model */
  reload: () => Promise<void>;
  /** Unload and clear cache */
  unload: () => void;
  /** Whether using fallback data */
  isFallback?: boolean;
  /** Number of retry attempts made */
  retryCount?: number;
  /** Time taken to load in milliseconds */
  loadTime?: number;
  /** Force reload ignoring cache */
  forceReload: () => Promise<void>;
}

/**
 * Persistent cache using IndexedDB
 */
class PersistentCache {
  private dbName = 'qore-model-cache';
  private storeName = 'models';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'name' });
        }
      };
    });
  }

  async get(name: string): Promise<unknown | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(name);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result;
        resolve(entry ? entry.data : null);
      };
    });
  }

  async set(name: string, data: unknown): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ name, data, timestamp: Date.now() });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(name: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(name);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * In-memory model cache (LRU-style)
 */
class MemoryCache {
  private cache: Map<string, ModelCacheEntry> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  get(name: string): ModelCacheEntry | null {
    const entry = this.cache.get(name);
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.loadedAt > entry.ttl) {
      this.cache.delete(name);
      return null;
    }
    
    entry.accessCount++;
    return entry;
  }

  set(name: string, model: unknown, ttl: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].accessCount - b[1].accessCount)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    
    this.cache.set(name, {
      model,
      loadedAt: Date.now(),
      ttl,
      accessCount: 1
    });
  }

  delete(name: string): void {
    this.cache.delete(name);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Model Loader Class - Centralized model management
 */
export class ModelLoader {
  private static instance: ModelLoader | null = null;
  private memoryCache: MemoryCache;
  private persistentCache: PersistentCache | null = null;
  private loadingPromises: Map<string, Promise<unknown>> = new Map();
  private models: Map<string, ModelInstance> = new Map();

  private constructor() {
    this.memoryCache = new MemoryCache(10);
    // Lazy init persistent cache (only when needed)
    this.persistentCache = null;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  /**
   * Initialize persistent cache (call when needed)
   */
  async initPersistentCache(): Promise<void> {
    if (!this.persistentCache) {
      this.persistentCache = new PersistentCache();
      try {
        await this.persistentCache.init();
      } catch (error) {
        console.warn('Persistent cache initialization failed, falling back to memory cache:', error);
        this.persistentCache = null;
      }
    }
  }

  /**
   * Load a model with lazy loading and caching
   */
  async load<T = unknown>(options: ModelLoaderOptions): Promise<ModelInstance<T>> {
    const { name, source, cacheTTL = 3600000, lazy = false, preload = false } = options;

    // Check if already loaded
    const existing = this.models.get(name);
    if (existing && existing.status === 'ready') {
      return existing as ModelInstance<T>;
    }

    // Check memory cache
    const cached = this.memoryCache.get(name);
    if (cached) {
      const instance: ModelInstance<T> = {
        data: cached.model as T,
        status: 'ready',
        error: null,
        progress: 100,
        reload: () => this.load(options).then(() => {}),
        unload: () => this.unload(name)
      };
      this.models.set(name, instance);
      return instance;
    }

    // Check persistent cache (lazy init)
    if (options.persistentCache && !this.persistentCache) {
      await this.initPersistentCache();
    }

    if (this.persistentCache) {
      try {
        const persisted = await this.persistentCache.get(name);
        if (persisted) {
          const instance: ModelInstance<T> = {
            data: persisted as T,
            status: 'ready',
            error: null,
            progress: 100,
            reload: () => this.load(options).then(() => {}),
            unload: () => this.unload(name)
          };
          this.models.set(name, instance);
          this.memoryCache.set(name, persisted, cacheTTL);
          return instance;
        }
      } catch (error) {
        console.warn('Persistent cache read failed:', error);
      }
    }

    // Lazy loading - create instance with idle state, load in background
    if (lazy && !preload) {
      const status = signal<ModelStatus>('idle');
      const errorSig = signal<Error | null>(null);
      const progress = signal(0);
      const isFallback = signal(false);
      const retryCount = signal(0);

      const instance: ModelInstance<T> = {
        data: null,
        get status() { return status(); },
        get error() { return errorSig(); },
        get progress() { return progress(); },
        get isFallback() { return isFallback(); },
        get retryCount() { return retryCount(); },
        reload: () => this.load(options).then(() => {}),
        unload: () => this.unload(name),
        forceReload: () => {
          this.unload(name);
          return this.load({ ...options, preload: true }).then(() => {});
        }
      };
      this.models.set(name, instance);
      
      // Start background loading (will update the same instance's signals)
      this.startBackgroundLoad<T>(options, name);
      
      return instance;
    }

    // Immediate loading
    return this.startLoading<T>(options);
  }

  private async startBackgroundLoad<T>(options: ModelLoaderOptions, name: string): Promise<void> {
    // Background load will update the instance in models map via startLoading
    await this.startLoading<T>(options);
  }

  private async startLoading<T>(options: ModelLoaderOptions, existingInstance?: ModelInstance<T>): Promise<ModelInstance<T>> {
    const { 
      name, 
      source, 
      cacheTTL = 3600000,
      maxRetries = 3,
      retryDelay = 1000,
      retryBackoff = 2,
      timeout = 30000,
      fallbackStrategy = 'none',
      fallbackData,
      onRetry,
      onLoadError,
      onFallback
    } = options;

    // Check if already loading (deduplicate concurrent loads)
    const existingLoad = this.loadingPromises.get(name);
    if (existingLoad) {
      await existingLoad;
      const instance = this.models.get(name);
      if (instance) return instance as ModelInstance<T>;
    }

    // Use existing instance signals if provided (for lazy loading background load)
    const status = existingInstance ? (existingInstance.status as any)._signal ?? signal<ModelStatus>('loading') : signal<ModelStatus>('loading');
    const errorSig = existingInstance ? (existingInstance.error as any)._signal ?? signal<Error | null>(null) : signal<Error | null>(null);
    const progress = existingInstance ? (existingInstance.progress as any)._signal ?? signal(0) : signal(0);
    const retryCount = existingInstance ? (existingInstance.retryCount as any)._signal ?? signal(0) : signal(0);
    const isFallback = existingInstance ? (existingInstance.isFallback as any)._signal ?? signal(false) : signal(false);
    const loadStartTime = Date.now();

    // Create the actual load function with timeout
    const loadWithTimeout = (): Promise<T> => {
      return Promise.race([
        this.fetchModel<T>(source, progress, options),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Model load timeout after ${timeout}ms`)), timeout)
        )
      ]);
    };

    // Create load function with retry logic
    const loadWithRetry = async (): Promise<T> => {
      let lastError: Error | null = null;
      let currentDelay = retryDelay;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        retryCount(attempt);
        try {
          return await loadWithTimeout();
        } catch (err) {
          lastError = err as Error;
          onRetry?.(lastError, attempt);
          
          if (attempt < maxRetries) {
            console.log(`[ModelLoader] Retry ${attempt}/${maxRetries} for "${name}" failed: ${lastError.message}`);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            currentDelay *= retryBackoff;
            progress(Math.min(10 + (attempt * 10), 50)); // Show retry progress
          }
        }
      }

      throw lastError;
    };

    const loadPromise = loadWithRetry()
      .then(async (model) => {
        // Store in caches
        this.memoryCache.set(name, model, cacheTTL);
        if (this.persistentCache && options.persistentCache) {
          try {
            await this.persistentCache.set(name, model);
          } catch (e) {
            console.warn('Failed to persist model:', e);
          }
        }

        status('ready');
        progress(100);
        this.loadingPromises.delete(name);

        return {
          data: model,
          status: 'ready' as ModelStatus,
          error: null,
          progress: 100,
          retryCount: retryCount(),
          loadTime: Date.now() - loadStartTime,
          isFallback: false,
          reload: () => this.load(options).then(() => {}),
          unload: () => this.unload(name),
          forceReload: () => {
            this.unload(name);
            return this.load({ ...options, preload: true }).then(() => {});
          }
        };
      })
      .catch(async (err) => {
        const loadError = err as Error;
        this.loadingPromises.delete(name);

        // Try fallback strategy
        let fallbackModel: T | null = null;
        let fallbackReason = '';

        if (fallbackStrategy !== 'none') {
          // Try cache fallback
          if (fallbackStrategy === 'cache' || fallbackStrategy === 'graceful') {
            const cached = this.memoryCache.get(name);
            if (cached) {
              fallbackModel = cached.model as T;
              fallbackReason = 'cache';
              onFallback?.('Using cached version due to load failure');
            }
          }

          // Try default fallback
          if (!fallbackModel && fallbackData && (fallbackStrategy === 'default' || fallbackStrategy === 'graceful')) {
            fallbackModel = fallbackData as T;
            fallbackReason = 'default';
            onFallback?.('Using default fallback model');
          }
        }

        if (fallbackModel) {
          // Use fallback successfully
          status('ready');
          isFallback(true);
          progress(100);

          return {
            data: fallbackModel,
            status: 'ready' as ModelStatus,
            error: loadError,
            progress: 100,
            retryCount: retryCount(),
            loadTime: Date.now() - loadStartTime,
            isFallback: true,
            reload: () => this.load(options).then(() => {}),
            unload: () => this.unload(name),
            forceReload: () => {
              this.unload(name);
              return this.load({ ...options, preload: true }).then(() => {});
            }
          };
        }

        // No fallback available, report error
        status('error');
        errorSig(loadError);
        onLoadError?.(loadError);

        return {
          data: null,
          status: 'error' as ModelStatus,
          error: loadError,
          progress: 0,
          retryCount: retryCount(),
          loadTime: Date.now() - loadStartTime,
          isFallback: false,
          reload: () => this.load(options).then(() => {}),
          unload: () => this.unload(name),
          forceReload: () => {
            this.unload(name);
            return this.load({ ...options, preload: true }).then(() => {});
          }
        };
      });

    this.loadingPromises.set(name, loadPromise);

    const instance: ModelInstance<T> = {
      data: null,
      get status() { return status(); },
      get error() { return errorSig(); },
      get progress() { return progress(); },
      get isFallback() { return isFallback(); },
      get retryCount() { return retryCount(); },
      reload: () => this.load(options).then(() => {}),
      unload: () => this.unload(name),
      forceReload: () => {
        this.unload(name);
        return this.load({ ...options, preload: true }).then(() => {});
      }
    };

    this.models.set(name, instance);
    await loadPromise;
    return this.models.get(name) as ModelInstance<T>;
  }

  private async fetchModel<T>(
    source: string, 
    progress: (value: number) => void,
    options?: ModelLoaderOptions
  ): Promise<T> {
    // Simulate model loading with progress
    // In real implementation, this would fetch from URL or load from file
    progress(10);
    
    // Simulate async loading (replace with actual fetch logic)
    await new Promise(resolve => setTimeout(resolve, 100));
    progress(50);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    progress(80);
    
    // Mock model data - in real implementation, this would be the actual model
    const model = await this.loadFromSource<T>(source, options);
    progress(100);
    
    return model;
  }

  private async loadFromSource<T>(source: string, options?: ModelLoaderOptions): Promise<T> {
    // Try to fetch from URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      try {
        const response = await fetch(source, {
          headers: {
            'Accept': 'application/json',
            ...(options?.name ? { 'X-Model-Name': options.name } : {})
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch model "${options?.name || source}": ${response.statusText} (${response.status})`);
        }
        
        return response.json() as Promise<T>;
      } catch (error) {
        if ((error as Error).message.includes('fetch') || (error as Error).message.includes('network')) {
          throw new Error(`Network error loading model "${options?.name || source}": ${(error as Error).message}`);
        }
        throw error;
      }
    }
    
    // Otherwise, treat as mock data for testing
    return { source, type: 'mock-model', name: options?.name } as T;
  }

  /**
   * Unload a model from cache
   */
  unload(name: string): void {
    this.memoryCache.delete(name);
    this.persistentCache?.delete(name).catch(console.warn);
    this.models.delete(name);
    this.loadingPromises.delete(name);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.memoryCache.clear();
    this.persistentCache?.clear().catch(console.warn);
    this.models.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get model status
   */
  getStatus(name: string): ModelStatus {
    const instance = this.models.get(name);
    return instance?.status || 'idle';
  }

  /**
   * Preload multiple models in parallel
   */
  async preloadAll(options: ModelLoaderOptions[]): Promise<void> {
    await Promise.all(options.map(opt => this.load({ ...opt, preload: true })));
  }

  /**
   * Get cache statistics
   */
  getStats(): { memoryCacheSize: number; loadedModels: number } {
    return {
      memoryCacheSize: this.memoryCache.size,
      loadedModels: this.models.size
    };
  }
}

/**
 * Convenience function for loading a single model
 */
export async function loadModel<T = unknown>(options: ModelLoaderOptions): Promise<ModelInstance<T>> {
  return ModelLoader.getInstance().load<T>(options);
}

/**
 * Reactively use a model in components
 */
export function useModel<T = unknown>(options: ModelLoaderOptions): ModelInstance<T> {
  const loader = ModelLoader.getInstance();
  let instance: ModelInstance<T> | null = null;
  
  // Lazy load on first access
  const loadIfNeeded = async () => {
    if (!instance) {
      instance = await loader.load<T>({ ...options, lazy: true });
    }
    return instance;
  };

  // Return a reactive wrapper
  const reactiveInstance: ModelInstance<T> = {
    get data() { return instance?.data ?? null; },
    get status() { return instance?.status ?? 'idle'; },
    get error() { return instance?.error ?? null; },
    get progress() { return instance?.progress ?? 0; },
    reload: () => loadIfNeeded().then(() => {}),
    unload: () => {
      if (instance) {
        instance.unload();
        instance = null;
      }
    }
  };

  // Start background loading
  loadIfNeeded().catch(console.warn);

  return reactiveInstance;
}

/**
 * Batch load models with concurrency control
 */
export async function batchLoadModels(
  options: ModelLoaderOptions[],
  concurrency: number = 3
): Promise<ModelInstance[]> {
  const loader = ModelLoader.getInstance();
  const results: ModelInstance[] = [];
  
  // Process in batches
  for (let i = 0; i < options.length; i += concurrency) {
    const batch = options.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(opt => loader.load(opt)));
    results.push(...batchResults);
  }
  
  return results;
}
