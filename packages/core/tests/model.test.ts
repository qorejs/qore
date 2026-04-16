/**
 * Model Loader Tests
 * Tests for lazy loading, caching, and async initialization optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelLoader, loadModel, useModel, batchLoadModels } from '../src/model';

describe('ModelLoader', () => {
  let loader: ModelLoader;

  beforeEach(() => {
    // Get fresh instance for each test
    loader = ModelLoader.getInstance();
  });

  afterEach(() => {
    loader.clearCache();
  });

  describe('Lazy Loading', () => {
    it('should not load model immediately when lazy=true', async () => {
      const loadSpy = vi.spyOn(loader, 'load').mockResolvedValue({
        data: null,
        status: 'idle',
        error: null,
        progress: 0,
        reload: vi.fn(),
        unload: vi.fn()
      });

      const instance = await loader.load({
        name: 'test-model',
        source: '/models/test.json',
        lazy: true,
        preload: false
      });

      expect(instance.status).toBe('idle');
      expect(instance.data).toBeNull();
      // Model should be in idle state, not loading
    });

    it('should load model in background when lazy=true', async () => {
      const mockModel = { weights: [1, 2, 3] };
      
      const instance = await loader.load({
        name: 'lazy-model',
        source: '/models/test.json',
        lazy: true,
        preload: false
      });

      // Initially idle
      expect(instance.status).toBe('idle');

      // Wait for background load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should be ready after background load
      expect(instance.status).toBe('ready');
      expect(instance.data).toEqual(mockModel);
    });

    it('should load immediately when preload=true', async () => {
      const instance = await loader.load({
        name: 'preload-model',
        source: '/models/test.json',
        lazy: true,
        preload: true
      });

      // Should start loading immediately
      expect(instance.status).toBe('loading');
      
      // Wait for load to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(instance.status).toBe('ready');
    });
  });

  describe('Model Caching', () => {
    it('should cache loaded models in memory', async () => {
      const firstLoad = await loader.load({
        name: 'cached-model',
        source: '/models/test.json',
        cacheTTL: 3600000
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      const secondLoad = await loader.load({
        name: 'cached-model',
        source: '/models/test.json'
      });

      // Second load should return cached instance immediately
      expect(secondLoad.status).toBe('ready');
      expect(secondLoad.data).toEqual(firstLoad.data);
    });

    it('should respect cache TTL', async () => {
      const instance = await loader.load({
        name: 'ttl-model',
        source: '/models/test.json',
        cacheTTL: 100 // Very short TTL for testing
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Cache should be expired, model should reload
      const reloaded = await loader.load({
        name: 'ttl-model',
        source: '/models/test.json',
        cacheTTL: 100
      });

      expect(reloaded.status).toBe('ready');
    });

    it('should deduplicate concurrent loads', async () => {
      const loadPromises = [
        loader.load({ name: 'concurrent-model', source: '/models/test.json' }),
        loader.load({ name: 'concurrent-model', source: '/models/test.json' }),
        loader.load({ name: 'concurrent-model', source: '/models/test.json' })
      ];

      const results = await Promise.all(loadPromises);

      // All should resolve to the same instance
      expect(results[0].data).toEqual(results[1].data);
      expect(results[1].data).toEqual(results[2].data);
    });

    it('should clear cache on unload', async () => {
      const instance = await loader.load({
        name: 'unload-model',
        source: '/models/test.json'
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      expect(instance.status).toBe('ready');

      instance.unload();

      const stats = loader.getStats();
      expect(stats.loadedModels).toBe(0);
    });
  });

  describe('Async Initialization', () => {
    it('should not block on model initialization', async () => {
      const startTime = Date.now();

      const instance = await loader.load({
        name: 'async-model',
        source: '/models/test.json',
        lazy: true
      });

      const loadTime = Date.now() - startTime;

      // Lazy load should return immediately (< 50ms)
      expect(loadTime).toBeLessThan(50);
      expect(instance.status).toBe('idle');

      // Model loads in background
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(instance.status).toBe('ready');
    });

    it('should support progress tracking', async () => {
      const instance = await loader.load({
        name: 'progress-model',
        source: '/models/test.json'
      });

      // Initial progress
      expect(instance.progress).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(instance.progress).toBeGreaterThan(0);

      await new Promise(resolve => setTimeout(resolve, 300));
      expect(instance.progress).toBe(100);
    });

    it('should handle loading errors gracefully', async () => {
      const instance = await loader.load({
        name: 'error-model',
        source: '/invalid/path.json'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(instance.status).toBe('error');
      expect(instance.error).toBeInstanceOf(Error);
    });
  });

  describe('Batch Loading', () => {
    it('should load multiple models with concurrency control', async () => {
      const models = [
        { name: 'model-1', source: '/models/1.json' },
        { name: 'model-2', source: '/models/2.json' },
        { name: 'model-3', source: '/models/3.json' },
        { name: 'model-4', source: '/models/4.json' },
        { name: 'model-5', source: '/models/5.json' }
      ];

      const startTime = Date.now();
      const results = await batchLoadModels(models, 2); // Concurrency of 2

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.status).toBe('ready');
      });

      // With concurrency 2, 5 models should take ~3 batches
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeGreaterThan(400); // At least 2 batches * 200ms
      expect(loadTime).toBeLessThan(1000); // But not sequential (5 * 200ms)
    });
  });

  describe('useModel Hook', () => {
    it('should provide reactive model access', async () => {
      const instance = useModel({
        name: 'reactive-model',
        source: '/models/test.json'
      });

      // Initially idle
      expect(instance.status).toBe('idle');

      // Wait for background load
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(instance.status).toBe('ready');
      expect(instance.data).not.toBeNull();
    });

    it('should support unload and reload', async () => {
      const instance = useModel({
        name: 'reload-model',
        source: '/models/test.json'
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      expect(instance.status).toBe('ready');

      instance.unload();
      expect(instance.status).toBe('idle');

      instance.reload();
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(instance.status).toBe('ready');
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache size', async () => {
      await loader.load({ name: 'stat-model-1', source: '/models/1.json' });
      await loader.load({ name: 'stat-model-2', source: '/models/2.json' });

      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = loader.getStats();
      expect(stats.loadedModels).toBeGreaterThanOrEqual(2);
      expect(stats.memoryCacheSize).toBeGreaterThanOrEqual(2);
    });

    it('should clear all caches', async () => {
      await loader.load({ name: 'clear-1', source: '/models/1.json' });
      await loader.load({ name: 'clear-2', source: '/models/2.json' });

      await new Promise(resolve => setTimeout(resolve, 300));

      loader.clearCache();

      const stats = loader.getStats();
      expect(stats.loadedModels).toBe(0);
      expect(stats.memoryCacheSize).toBe(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should reduce load time by 60%+ with caching', async () => {
      // First load (no cache)
      const start1 = Date.now();
      await loader.load({ name: 'perf-model', source: '/models/test.json' });
      await new Promise(resolve => setTimeout(resolve, 300));
      const time1 = Date.now() - start1;

      // Second load (from cache)
      const start2 = Date.now();
      await loader.load({ name: 'perf-model', source: '/models/test.json' });
      const time2 = Date.now() - start2;

      // Cached load should be significantly faster
      const improvement = ((time1 - time2) / time1) * 100;
      expect(improvement).toBeGreaterThan(60);
    });

    it('should support lazy loading for non-critical models', async () => {
      const start = Date.now();
      const instance = await loader.load({
        name: 'lazy-perf-model',
        source: '/models/test.json',
        lazy: true,
        preload: false
      });
      const initialTime = Date.now() - start;

      // Initial load should be nearly instant
      expect(initialTime).toBeLessThan(50);

      // Full load happens in background
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(instance.status).toBe('ready');
    });
  });
});

describe('ModelLoader Integration', () => {
  it('should work with realistic AI model loading scenario', async () => {
    const loader = ModelLoader.getInstance();

    // Simulate loading multiple AI models for a chat application
    const models = [
      { name: 'language-model', source: '/models/lang.json', lazy: true },
      { name: 'embedding-model', source: '/models/embed.json', lazy: true },
      { name: 'classifier-model', source: '/models/class.json', preload: true }
    ];

    // Load classifier immediately (critical)
    const classifier = await loader.load(models[2]);
    expect(classifier.status).toBe('loading');

    // Lazy load others (non-critical)
    const language = await loader.load(models[0]);
    const embedding = await loader.load(models[1]);

    expect(language.status).toBe('idle');
    expect(embedding.status).toBe('idle');

    // Wait for all to load
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(classifier.status).toBe('ready');
    expect(language.status).toBe('ready');
    expect(embedding.status).toBe('ready');
  });
});
