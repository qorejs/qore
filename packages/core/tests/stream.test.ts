import { describe, it, expect, vi } from 'vitest';
import { stream, streamText } from '../src/stream';

describe('Stream', () => {
  describe('stream', () => {
    it('should create a stream instance', async () => {
      const container = document.createElement('div');
      const { abort } = stream(async (write) => {
        write('Hello');
        write.done();
      }, { container });
      
      expect(abort).toBeDefined();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(container.querySelector('.stream-output')?.textContent).toBe('Hello');
    });

    it('should call onComplete when finished', async () => {
      const container = document.createElement('div');
      const onComplete = vi.fn();
      
      stream(async (write) => {
        write('Test');
        write.done();
      }, { container, onComplete });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const container = document.createElement('div');
      const onError = vi.fn();
      
      stream(async () => {
        throw new Error('Test error');
      }, { container, onError });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(onError).toHaveBeenCalled();
    });

    it('should abort stream', async () => {
      const container = document.createElement('div');
      
      const { abort } = stream(async (write) => {
        write('Start');
        await new Promise(resolve => setTimeout(resolve, 5));
        write('Middle');
        await new Promise(resolve => setTimeout(resolve, 5));
        write('End');
        write.done();
      }, { container });
      
      // Wait for first write
      await new Promise(resolve => setTimeout(resolve, 2));
      expect(container.querySelector('.stream-output')?.textContent).toBe('Start');
      
      // Abort before more writes
      abort();
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should not have 'Middle' or 'End'
      expect(container.querySelector('.stream-output')?.textContent).toBe('Start');
    });
  });

  describe('streamText', () => {
    it('should stream text with typewriter effect', async () => {
      const container = document.createElement('div');
      const onComplete = vi.fn();
      
      streamText('Hello', { container, speed: 10, onComplete });
      
      await new Promise(resolve => setTimeout(resolve, 80));
      expect(container.querySelector('.stream-output')?.textContent).toBe('Hello');
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
