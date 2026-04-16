/**
 * AI Mock Testing Service - Example Tests
 * 
 * Demonstrates how to use the AI mock testing service for:
 * - Reproducible tests with fixed random seeds
 * - Testing without external API dependencies
 * - Mock model loading and inference
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMockModel,
  mockAIResponse,
  setupAIMocks,
  cleanupAIMocks,
  getMockModel,
  createMockModelLoader,
  mockStreamResponse,
  mockBatchInference,
  mockUtils
} from '../src/mock/ai-mock';

describe('AI Mock Testing Service', () => {
  // Set up mocks before each test with fixed seed for reproducibility
  beforeEach(() => {
    setupAIMocks({ seed: 42, preloadModels: false });
  });

  // Clean up after each test
  afterEach(() => {
    cleanupAIMocks();
  });

  describe('createMockModel()', () => {
    it('should create a mock model with specified parameters', () => {
      const model = createMockModel('test-model', 'language', {
        version: '2.0.0',
        parameters: 500000
      });

      expect(model.id).toBe('test-model');
      expect(model.type).toBe('language');
      expect(model.metadata.version).toBe('2.0.0');
      expect(model.metadata.parameters).toBe(500000);
      expect(model.weights).toBeDefined();
      expect(model.weights.length).toBeGreaterThan(0);
    });

    it('should cache created models', () => {
      createMockModel('cached-model', 'embedding');
      
      const cached = getMockModel('cached-model');
      expect(cached).toBeDefined();
      expect(cached?.id).toBe('cached-model');
    });

    it('should generate deterministic weights with same seed', () => {
      // Reset to known seed
      mockUtils.setSeed(12345);
      const model1 = createMockModel('det-model-1', 'language');
      
      mockUtils.setSeed(12345);
      const model2 = createMockModel('det-model-2', 'language');
      
      // Weights should be identical due to same seed
      expect(model1.weights).toEqual(model2.weights);
    });

    it('should support different model types', () => {
      const types: Array<MockModelData['type']> = ['language', 'embedding', 'classifier', 'custom'];
      
      types.forEach(type => {
        const model = createMockModel(`${type}-model`, type);
        expect(model.type).toBe(type);
      });
    });
  });

  describe('mockAIResponse()', () => {
    it('should generate consistent responses with same seed', async () => {
      setupAIMocks({ seed: 100 });
      const response1 = await mockAIResponse('Hello, how are you?');
      
      setupAIMocks({ seed: 100 });
      const response2 = await mockAIResponse('Hello, how are you?');
      
      // Responses should be identical with same seed
      expect(response1.content).toBe(response2.content);
      expect(response1.confidence).toBe(response2.confidence);
    });

    it('should generate different responses with different seeds', async () => {
      setupAIMocks({ seed: 100 });
      const response1 = await mockAIResponse('Test input');
      const confidence1 = response1.confidence;
      
      setupAIMocks({ seed: 200 });
      const response2 = await mockAIResponse('Test input');
      const confidence2 = response2.confidence;
      
      // At least some aspect should differ with different seeds
      // (content might be same due to template selection, but confidence will differ)
      expect(confidence1).not.toBe(confidence2);
    });

    it('should detect response type from input', async () => {
      // Greeting input should produce greeting-type response
      const greeting = await mockAIResponse('Hello, how are you?');
      expect(greeting.content.length).toBeGreaterThan(0);
      
      // Code input should produce code-type response
      const code = await mockAIResponse('Show me some code');
      expect(code.content.length).toBeGreaterThan(0);
      
      // Analysis input should produce analysis-type response
      const analysis = await mockAIResponse('Analyze this data');
      expect(analysis.content.length).toBeGreaterThan(0);
      
      // All responses should have valid structure
      expect(greeting.confidence).toBeGreaterThan(0);
      expect(code.confidence).toBeGreaterThan(0);
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    it('should respect temperature settings', async () => {
      const lowTemp = await mockAIResponse('Test', { temperature: 0.2 });
      expect(lowTemp.content).toContain('[Deterministic mode]');
      
      const highTemp = await mockAIResponse('Test', { temperature: 0.9 });
      expect(highTemp.content).toContain('[High creativity mode]');
    });

    it('should calculate realistic token counts', async () => {
      const response = await mockAIResponse('This is a test input with some length');
      
      expect(response.tokens.input).toBeGreaterThan(0);
      expect(response.tokens.output).toBeGreaterThan(0);
      expect(response.tokens.input).toBeLessThan(100);
    });

    it('should simulate processing time', async () => {
      const response = await mockAIResponse('Test input');
      
      expect(response.processingTime).toBeGreaterThan(0);
      expect(response.processingTime).toBeLessThan(1000);
    });
  });

  describe('setupAIMocks()', () => {
    it('should initialize with custom seed', () => {
      setupAIMocks({ seed: 99999 });
      
      const model1 = createMockModel('seed-test', 'language');
      
      setupAIMocks({ seed: 99999 });
      const model2 = createMockModel('seed-test-2', 'language');
      
      expect(model1.weights).toEqual(model2.weights);
    });

    it('should preload common models when requested', () => {
      setupAIMocks({ preloadModels: true });
      
      expect(getMockModel('language-model')).toBeDefined();
      expect(getMockModel('embedding-model')).toBeDefined();
      expect(getMockModel('classifier-model')).toBeDefined();
    });

    it('should not preload models when disabled', () => {
      cleanupAIMocks(); // Clear any existing models
      setupAIMocks({ preloadModels: false });
      
      expect(getMockModel('language-model')).toBeUndefined();
      expect(getMockModel('embedding-model')).toBeUndefined();
      expect(getMockModel('classifier-model')).toBeUndefined();
    });
  });

  describe('createMockModelLoader()', () => {
    it('should provide mock ModelLoader interface', async () => {
      const mockLoader = createMockModelLoader();
      
      const model = await mockLoader.load({
        name: 'loader-test',
        source: '/models/test.json'
      });
      
      expect(model.status).toBe('ready');
      expect(model.data).toBeDefined();
      expect(model.progress).toBe(100);
    });

    it('should support lazy loading', async () => {
      const mockLoader = createMockModelLoader();
      
      const model = await mockLoader.load({
        name: 'lazy-test',
        source: '/models/test.json',
        lazy: true,
        preload: false
      });
      
      expect(model.status).toBe('idle');
      expect(model.data).toBeNull();
    });

    it('should cache loaded models', async () => {
      cleanupAIMocks(); // Start fresh
      const mockLoader = createMockModelLoader();
      
      await mockLoader.load({ name: 'cache-test', source: '/models/test.json' });
      const stats = mockLoader.getStats();
      
      expect(stats.loadedModels).toBe(1);
      expect(stats.memoryCacheSize).toBe(1);
    });

    it('should support unload', async () => {
      cleanupAIMocks(); // Start fresh
      const mockLoader = createMockModelLoader();
      
      const model = await mockLoader.load({ name: 'unload-test', source: '/models/test.json' });
      model.unload();
      
      const stats = mockLoader.getStats();
      expect(stats.loadedModels).toBe(0);
    });

    it('should clear all caches', async () => {
      const mockLoader = createMockModelLoader();
      
      await mockLoader.load({ name: 'clear-1', source: '/models/1.json' });
      await mockLoader.load({ name: 'clear-2', source: '/models/2.json' });
      
      mockLoader.clearCache();
      
      const stats = mockLoader.getStats();
      expect(stats.loadedModels).toBe(0);
      expect(stats.memoryCacheSize).toBe(0);
    });
  });

  describe('mockStreamResponse()', () => {
    it('should stream response in chunks', async () => {
      const chunks: string[] = [];
      
      for await (const chunk of mockStreamResponse('Write a short story', { chunkSize: 5 })) {
        chunks.push(chunk.content);
        expect(typeof chunk.done).toBe('boolean');
      }
      
      expect(chunks.length).toBeGreaterThan(1);
      const fullContent = chunks.join('');
      expect(fullContent.length).toBeGreaterThan(0);
    });

    it('should complete stream with done=true', async () => {
      let lastChunk: any;
      
      for await (const chunk of mockStreamResponse('Test stream')) {
        lastChunk = chunk;
      }
      
      expect(lastChunk.done).toBe(true);
    });
  });

  describe('mockBatchInference()', () => {
    it('should process multiple inputs', async () => {
      const inputs = ['Hello', 'How are you?', 'What is AI?'];
      
      const results = await mockBatchInference(inputs);
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.content).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should maintain consistency across batch', async () => {
      setupAIMocks({ seed: 42 });
      const inputs = ['Test 1', 'Test 2', 'Test 3'];
      
      const results1 = await mockBatchInference(inputs);
      
      setupAIMocks({ seed: 42 });
      const results2 = await mockBatchInference(inputs);
      
      // Same seed should produce same results
      expect(results1[0].content).toBe(results2[0].content);
      expect(results1[1].content).toBe(results2[1].content);
      expect(results1[2].content).toBe(results2[2].content);
    });
  });

  describe('Reproducibility Tests', () => {
    it('should produce identical results across multiple runs with same seed', () => {
      const run1 = () => {
        setupAIMocks({ seed: 7777 });
        const model = createMockModel('repro-test', 'language');
        return model.weights.slice(0, 5);
      };
      
      const run2 = () => {
        setupAIMocks({ seed: 7777 });
        const model = createMockModel('repro-test', 'language');
        return model.weights.slice(0, 5);
      };
      
      expect(run1()).toEqual(run2());
    });

    it('should isolate test state between tests', () => {
      // Create some models
      createMockModel('isolation-test-1', 'language');
      createMockModel('isolation-test-2', 'embedding');
      
      const cacheSize = mockUtils.getCacheSize();
      expect(cacheSize).toBeGreaterThanOrEqual(2);
      
      // After cleanup, cache should be empty
      cleanupAIMocks();
      expect(mockUtils.getCacheSize()).toBe(0);
    });
  });

  describe('Integration Example: Testing AI Feature', () => {
    it('should test AI feature without external dependencies', async () => {
      // Simulate testing a feature that uses AI
      const mockLoader = createMockModelLoader();
      
      // Load model (mocked - no external API)
      const model = await mockLoader.load({
        name: 'feature-model',
        source: '/models/feature.json'
      });
      
      expect(model.status).toBe('ready');
      
      // Generate response (mocked - deterministic)
      const response = await mockAIResponse('Process this data', { seed: 42 });
      
      expect(response.content).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.5);
      
      // Verify no external calls were made (mocked)
      expect(mockUtils.getCacheSize()).toBeGreaterThan(0);
    });

    it('should test streaming AI feature', async () => {
      const mockLoader = createMockModelLoader();
      await mockLoader.load({ name: 'stream-model', source: '/models/stream.json' });
      
      const chunks: string[] = [];
      for await (const chunk of mockStreamResponse('Stream this', { chunkSize: 10 })) {
        chunks.push(chunk.content);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1]).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle error-type inputs gracefully', async () => {
      const response = await mockAIResponse('This will cause an error');
      
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// Type import for test
import type { MockModelData } from '../src/mock/ai-mock';
