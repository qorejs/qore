/**
 * Qore Stream Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStream, streamText, createStreamWriter } from '../src/stream';
import { h } from '../src/renderer';

describe('Stream', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('createStream', () => {
    it('should create a stream instance', () => {
      const stream = createStream(async (writer) => {
        writer.write(h('div', null, 'Hello'));
      }, { container });

      expect(stream.writer).toBeDefined();
      expect(stream.content).toBeDefined();
      expect(stream.isComplete).toBeDefined();
      expect(stream.error).toBeDefined();
      expect(stream.abort).toBeDefined();
    });

    it('should call onComplete when finished', async () => {
      return new Promise<void>((resolve) => {
        const stream = createStream(async (writer) => {
          writer.write(h('div', null, 'Content'));
        }, {
          container,
          onComplete: () => {
            expect(stream.isComplete.get()).toBe(true);
            resolve();
          },
        });
      });
    });

    it('should handle errors', async () => {
      return new Promise<void>((resolve) => {
        const stream = createStream(async () => {
          throw new Error('Test error');
        }, {
          container,
          onError: (err) => {
            expect(err.message).toBe('Test error');
            expect(stream.error.get()).toBeDefined();
            resolve();
          },
        });
      });
    });

    it('should abort stream', async () => {
      return new Promise<void>((resolve) => {
        const stream = createStream(async (writer) => {
          stream.abort();
          writer.write(h('div', null, 'Should not appear'));
          resolve();
        }, { container });
        
        setTimeout(() => {
          expect(container.innerHTML).not.toContain('Should not appear');
          resolve();
        }, 30);
      });
    });
  });

  describe('streamText', () => {
    it('should call onComplete when finished', async () => {
      return new Promise<void>((resolve) => {
        streamText('Test', {
          container,
          speed: 10,
          onComplete: () => {
            resolve();
          },
        });
      });
    });
  });

  describe('createStreamWriter', () => {
    it('should create writer for manual control', () => {
      const { writer } = createStreamWriter(container);
      
      expect(writer).toBeDefined();
      
      writer.write(h('div', null, 'Manual write'));
      
      expect(container.innerHTML).toContain('Manual write');
    });
  });
});
