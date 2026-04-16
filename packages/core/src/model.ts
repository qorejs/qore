/**
 * Qore Model Loader - Optimized AI Model Loading
 * Features: Lazy loading, persistent caching, async initialization
 * Import via: import { ModelLoader, loadModel } from '@qorejs/qore/model'
 */

import { signal, computed } from './signal';

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
 * Model loader options
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
}

/**
 * Model instance wrapper
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

    // Lazy loading - return placeholder if not preloading
    if (lazy && !preload) {
      const placeholder: ModelInstance<T> = {
        data: null,
        status: 'idle',
        error: null,
        progress: 0,
        reload: () => this.load(options).then(() => {}),
        unload: () => this.unload(name)
      };
      this.models.set(name, placeholder);
      
      // Start background loading
      this.startBackgroundLoad<T>(options, placeholder);
      
      return placeholder;
    }

    // Immediate loading
    return this.startLoading<T>(options);
  }

  private async startBackgroundLoad<T>(options: ModelLoaderOptions, placeholder: ModelInstance<T>): Promise<void> {
    try {
      const instance = await this.startLoading<T>(options);
      // Update placeholder reference
      placeholder.data = instance.data;
      placeholder.status = instance.status;
      placeholder.progress = instance.progress;
    } catch (error) {
      placeholder.status = 'error';
      placeholder.error = error as Error;
    }
  }

  private async startLoading<T>(options: ModelLoaderOptions): Promise<ModelInstance<T>> {
    const { name, source, cacheTTL = 3600000 } = options;

    // Check if already loading (deduplicate concurrent loads)
    const existingLoad = this.loadingPromises.get(name);
    if (existingLoad) {
      await existingLoad;
      const instance = this.models.get(name);
      if (instance) return instance as ModelInstance<T>;
    }

    const status = signal<ModelStatus>('loading');
    const errorSig = signal<Error | null>(null);
    const progress = signal(0);

    const loadPromise = this.fetchModel<T>(source, progress)
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
          reload: () => this.load(options).then(() => {}),
          unload: () => this.unload(name)
        };
      })
      .catch((err) => {
        status('error');
        errorSig(err as Error);
        this.loadingPromises.delete(name);

        return {
          data: null,
          status: 'error' as ModelStatus,
          error: err as Error,
          progress: 0,
          reload: () => this.load(options).then(() => {}),
          unload: () => this.unload(name)
        };
      });

    this.loadingPromises.set(name, loadPromise);

    const instance: ModelInstance<T> = {
      data: null,
      get status() { return status(); },
      get error() { return errorSig(); },
      get progress() { return progress(); },
      reload: () => this.load(options).then(() => {}),
      unload: () => this.unload(name)
    };

    this.models.set(name, instance);
    await loadPromise;
    return this.models.get(name) as ModelInstance<T>;
  }

  private async fetchModel<T>(source: string, progress: (value: number) => void): Promise<T> {
    // Simulate model loading with progress
    // In real implementation, this would fetch from URL or load from file
    progress(10);
    
    // Simulate async loading (replace with actual fetch logic)
    await new Promise(resolve => setTimeout(resolve, 100));
    progress(50);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    progress(80);
    
    // Mock model data - in real implementation, this would be the actual model
    const model = await this.loadFromSource<T>(source);
    progress(100);
    
    return model;
  }

  private async loadFromSource<T>(source: string): Promise<T> {
    // Try to fetch from URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);
      return response.json() as Promise<T>;
    }
    
    // Otherwise, treat as mock data for testing
    return { source, type: 'mock-model' } as T;
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
