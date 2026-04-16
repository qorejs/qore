/**
 * AI Mock Testing Service
 * 
 * Provides mock implementations for AI module testing:
 * - Mock ModelLoader for model loading simulation
 * - Mock AI inference interfaces
 * - Fixed random seed for reproducible tests
 * 
 * @module @qorejs/qore/mock/ai-mock
 */

/**
 * Mock model data structure
 */
export interface MockModelData {
  /** Model identifier */
  id: string;
  /** Model type */
  type: 'language' | 'embedding' | 'classifier' | 'custom';
  /** Mock weights/data */
  weights: number[];
  /** Model metadata */
  metadata: {
    version: string;
    createdAt: number;
    parameters: number;
  };
}

/**
 * Mock AI response structure
 */
export interface MockAIResponse {
  /** Response content */
  content: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Processing time in ms */
  processingTime: number;
  /** Token usage */
  tokens: {
    input: number;
    output: number;
  };
  /** Model used */
  modelId: string;
}

/**
 * Mock inference options
 */
export interface MockInferenceOptions {
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Random seed for reproducibility */
  seed?: number;
}

/**
 * Seeded random number generator for reproducible tests
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  /**
   * Generate next random number (0-1)
   */
  next(): number {
    // Simple LCG algorithm for reproducibility
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * Generate random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in range [min, max]
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Reset seed to initial value
   */
  reset(): void {
    this.seed = 12345;
  }

  /**
   * Set custom seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
}

/**
 * Global seeded random instance
 */
let globalRandom: SeededRandom = new SeededRandom();

/**
 * Mock model cache
 */
const mockModelCache: Map<string, MockModelData> = new Map();

/**
 * Mock response templates for different scenarios
 */
const responseTemplates: Record<string, string[]> = {
  greeting: [
    'Hello! How can I assist you today?',
    'Hi there! What would you like to know?',
    'Greetings! I\'m here to help.',
    'Welcome! How may I be of service?'
  ],
  explanation: [
    'This is a detailed explanation of the concept you asked about.',
    'Let me break this down for you step by step.',
    'Here\'s a comprehensive overview of the topic.',
    'I\'ll explain this in simple terms.'
  ],
  code: [
    'function example() {\n  return "Hello, World!";\n}',
    'const result = data.map(item => item.value);\nconsole.log(result);',
    'class MyClass {\n  constructor() {\n    this.value = 0;\n  }\n}',
    'async function fetchData() {\n  const response = await fetch(url);\n  return response.json();\n}'
  ],
  analysis: [
    'Based on the data provided, I can see several patterns emerging.',
    'The analysis reveals interesting insights about the dataset.',
    'After examining the information, here are my findings.',
    'The data suggests a clear trend in this direction.'
  ],
  error: [
    'I apologize, but I encountered an issue processing your request.',
    'There seems to be a problem with the input provided.',
    'I\'m unable to complete this task due to invalid parameters.',
    'An error occurred during processing. Please try again.'
  ]
};

/**
 * Create a mock model with specified parameters
 * 
 * @param id - Model identifier
 * @param type - Model type (language, embedding, classifier, custom)
 * @param options - Additional model options
 * @returns MockModelData instance
 * 
 * @example
 * ```typescript
 * const model = createMockModel('test-model', 'language', {
 *   parameters: 1000000,
 *   version: '1.0.0'
 * });
 * ```
 */
export function createMockModel(
  id: string,
  type: MockModelData['type'] = 'language',
  options: Partial<MockModelData['metadata']> = {}
): MockModelData {
  const {
    version = '1.0.0',
    parameters = 1000000,
    createdAt = Date.now()
  } = options;

  // Generate deterministic weights based on model id
  const weights: number[] = [];
  const weightCount = Math.min(parameters / 10000, 100); // Cap at 100 weights for performance
  
  for (let i = 0; i < weightCount; i++) {
    weights.push(globalRandom.nextFloat(-1, 1));
  }

  const model: MockModelData = {
    id,
    type,
    weights,
    metadata: {
      version,
      createdAt,
      parameters
    }
  };

  // Cache the model
  mockModelCache.set(id, model);

  return model;
}

/**
 * Generate a mock AI response
 * 
 * @param input - Input prompt/text
 * @param options - Inference options
 * @returns MockAIResponse instance
 * 
 * @example
 * ```typescript
 * const response = await mockAIResponse('Explain quantum computing', {
 *   temperature: 0.7,
 *   maxTokens: 100,
 *   seed: 42
 * });
 * ```
 */
export async function mockAIResponse(
  input: string,
  options: MockInferenceOptions = {}
): Promise<MockAIResponse> {
  const {
    temperature = 0.7,
    maxTokens = 100,
    seed,
    stopSequences = []
  } = options;

  // Use provided seed or global seed
  const random = seed ? new SeededRandom(seed) : globalRandom;

  // Simulate processing time (deterministic based on input length)
  const processingTime = Math.floor(input.length * 2 + random.nextInt(50, 150));

  // Determine response type based on input
  let responseType: keyof typeof responseTemplates = 'explanation';
  const inputLower = input.toLowerCase();
  
  if (inputLower.includes('hello') || inputLower.includes('hi') || inputLower.includes('hey')) {
    responseType = 'greeting';
  } else if (inputLower.includes('code') || inputLower.includes('function') || inputLower.includes('class')) {
    responseType = 'code';
  } else if (inputLower.includes('analyze') || inputLower.includes('data') || inputLower.includes('pattern')) {
    responseType = 'analysis';
  } else if (inputLower.includes('error') || inputLower.includes('fail') || inputLower.includes('invalid')) {
    responseType = 'error';
  }

  // Select response template
  const templates = responseTemplates[responseType];
  let content = random.pick(templates);

  // Apply temperature effect (simplified simulation)
  if (temperature > 0.8) {
    content += ' [High creativity mode]';
  } else if (temperature < 0.3) {
    content += ' [Deterministic mode]';
  }

  // Calculate token counts (simplified estimation)
  const inputTokens = Math.ceil(input.length / 4);
  const outputTokens = Math.min(Math.ceil(content.length / 4), maxTokens);

  // Calculate confidence based on response type and temperature
  let confidence = 0.85 + random.nextFloat(-0.1, 0.1);
  if (responseType === 'error') {
    confidence = 0.5 + random.nextFloat(-0.1, 0.1);
  }

  const response: MockAIResponse = {
    content,
    confidence,
    processingTime,
    tokens: {
      input: inputTokens,
      output: outputTokens
    },
    modelId: 'mock-model-v1'
  };

  return response;
}

/**
 * Set up global AI mocks for testing
 * 
 * This function configures the mock environment for testing:
 * - Sets up seeded random number generator
 * - Pre-creates common mock models
 * - Configures mock inference behavior
 * 
 * @param options - Setup options
 * @param options.seed - Random seed for reproducibility (default: 12345)
 * @param options.preloadModels - Whether to preload common mock models
 * 
 * @example
 * ```typescript
 * beforeEach(() => {
 *   setupAIMocks({ seed: 42, preloadModels: true });
 * });
 * 
 * afterEach(() => {
 *   cleanupAIMocks();
 * });
 * ```
 */
export function setupAIMocks(options: {
  seed?: number;
  preloadModels?: boolean;
} = {}): void {
  const { seed = 12345, preloadModels = false } = options;

  // Reset global random with seed
  globalRandom = new SeededRandom(seed);

  // Preload common mock models if requested
  if (preloadModels) {
    createMockModel('language-model', 'language', {
      version: '1.0.0',
      parameters: 1000000
    });

    createMockModel('embedding-model', 'embedding', {
      version: '1.0.0',
      parameters: 500000
    });

    createMockModel('classifier-model', 'classifier', {
      version: '1.0.0',
      parameters: 100000
    });
  }
}

/**
 * Clean up mock state after tests
 * 
 * Clears all mock models and resets random state
 */
export function cleanupAIMocks(): void {
  mockModelCache.clear();
  globalRandom.reset();
}

/**
 * Get a mock model from cache
 * 
 * @param id - Model identifier
 * @returns MockModelData or undefined if not found
 */
export function getMockModel(id: string): MockModelData | undefined {
  return mockModelCache.get(id);
}

/**
 * Clear specific mock model from cache
 * 
 * @param id - Model identifier
 */
export function clearMockModel(id: string): void {
  mockModelCache.delete(id);
}

/**
 * Create a mock ModelLoader for testing
 * 
 * This provides a mock implementation of the ModelLoader interface
 * that can be used in tests to avoid actual model loading.
 * 
 * @returns Mock ModelLoader instance
 * 
 * @example
 * ```typescript
 * const mockLoader = createMockModelLoader();
 * 
 * // Use in place of real ModelLoader
 * const model = await mockLoader.load({
 *   name: 'test-model',
 *   source: '/models/test.json'
 * });
 * ```
 */
export function createMockModelLoader() {
  return {
    /**
     * Load a mock model
     */
    async load<T = MockModelData>(options: { name: string; source: string; lazy?: boolean; preload?: boolean }) {
      const { name, source, lazy = false, preload = false } = options;

      // Check cache first
      const cached = mockModelCache.get(name);
      if (cached) {
        return {
          data: cached as T,
          status: 'ready' as const,
          error: null,
          progress: 100,
          reload: async () => {},
          unload: () => mockModelCache.delete(name)
        };
      }

      // Create new mock model
      const model = createMockModel(name, 'language', {
        version: '1.0.0',
        parameters: 100000
      });

      if (lazy && !preload) {
        // Return idle placeholder for lazy loading
        return {
          data: null,
          status: 'idle' as const,
          error: null,
          progress: 0,
          reload: async () => {},
          unload: () => mockModelCache.delete(name)
        };
      }

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 50));

      return {
        data: model as T,
        status: 'ready' as const,
        error: null,
        progress: 100,
        reload: async () => {},
        unload: () => mockModelCache.delete(name)
      };
    },

    /**
     * Initialize persistent cache (mock - no-op)
     */
    async initPersistentCache() {
      // Mock implementation - no-op
    },

    /**
     * Unload a model
     */
    unload(name: string) {
      mockModelCache.delete(name);
    },

    /**
     * Clear all caches
     */
    clearCache() {
      mockModelCache.clear();
    },

    /**
     * Get model status
     */
    getStatus(name: string) {
      const model = mockModelCache.get(name);
      return model ? 'ready' as const : 'idle' as const;
    },

    /**
     * Preload multiple models
     */
    async preloadAll(options: Array<{ name: string; source: string }>) {
      await Promise.all(options.map(opt => this.load({ ...opt, preload: true })));
    },

    /**
     * Get cache statistics
     */
    getStats() {
      return {
        memoryCacheSize: mockModelCache.size,
        loadedModels: mockModelCache.size
      };
    }
  };
}

/**
 * Mock stream response generator
 * 
 * Generates a stream of mock responses for testing streaming APIs
 * 
 * @param input - Input prompt
 * @param options - Stream options
 * @returns AsyncIterableIterator of response chunks
 * 
 * @example
 * ```typescript
 * const stream = mockStreamResponse('Write a story', { chunkSize: 10 });
 * 
 * for await (const chunk of stream) {
 *   console.log(chunk);
 * }
 * ```
 */
export async function* mockStreamResponse(
  input: string,
  options: { chunkSize?: number; delayMs?: number } = {}
): AsyncIterableIterator<{ content: string; done: boolean }> {
  const { chunkSize = 10, delayMs = 50 } = options;

  // Generate full response
  const response = await mockAIResponse(input);
  const content = response.content;

  // Stream in chunks
  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.slice(i, i + chunkSize);
    const done = i + chunkSize >= content.length;

    yield {
      content: chunk,
      done
    };

    // Simulate streaming delay
    if (!done) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Mock batch inference
 * 
 * Process multiple inputs in batch mode
 * 
 * @param inputs - Array of input prompts
 * @param options - Inference options
 * @returns Array of mock responses
 */
export async function mockBatchInference(
  inputs: string[],
  options: MockInferenceOptions = {}
): Promise<MockAIResponse[]> {
  const results: MockAIResponse[] = [];

  for (const input of inputs) {
    const response = await mockAIResponse(input, options);
    results.push(response);
  }

  return results;
}

/**
 * Export for test utilities
 */
export const mockUtils = {
  /**
   * Reset random state to initial seed
   */
  resetRandom: () => globalRandom.reset(),
  
  /**
   * Set custom random seed
   */
  setSeed: (seed: number) => globalRandom.setSeed(seed),
  
  /**
   * Get current cache size
   */
  getCacheSize: () => mockModelCache.size,
  
  /**
   * Check if model exists in cache
   */
  hasModel: (id: string) => mockModelCache.has(id)
};

export default {
  createMockModel,
  mockAIResponse,
  setupAIMocks,
  cleanupAIMocks,
  getMockModel,
  clearMockModel,
  createMockModelLoader,
  mockStreamResponse,
  mockBatchInference,
  mockUtils
};
