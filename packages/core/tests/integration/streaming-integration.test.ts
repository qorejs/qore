import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal, computed } from '../../src/signal';
import { h, render, For, show } from '../../src/render';

/**
 * 流式渲染集成测试
 */

describe('Streaming Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should stream content progressively', async () => {
    const streamData = signal<string>('');
    const isComplete = signal(false);

    const StreamApp = () => {
      return h('div', { class: 'stream-app' }, [
        h('div', { class: 'content' }, streamData()),
        h('div', { class: 'status' }, isComplete() ? 'Complete' : 'Streaming...')
      ]);
    };

    render(container, StreamApp);
    
    expect(container.innerHTML).toContain('Streaming...');
    
    const chunks = ['Hello', ' ', 'World', '!'];
    for (const chunk of chunks) {
      streamData(streamData() + chunk);
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    isComplete(true);
    
    expect(container.innerHTML).toContain('Hello World!');
    expect(container.innerHTML).toContain('Complete');
  });

  it('should handle streaming with error recovery', async () => {
    const content = signal<string>('');
    const error = signal<Error | null>(null);
    const isStreaming = signal(false);

    const ResilientStreamApp = () => {
      if (error()) {
        return h('div', { class: 'error-state' }, [
          h('p', {}, `Error: ${error()!.message}`),
          h('button', { 
            onclick: () => {
              error(null);
              content('');
            } 
          }, 'Retry')
        ]);
      }

      return h('div', { class: 'stream-app' }, [
        show(isStreaming, () => h('div', { class: 'loading' }, 'Loading...')),
        h('div', { class: 'content' }, content())
      ]);
    };

    render(container, ResilientStreamApp);
    
    isStreaming(true);
    expect(container.innerHTML).toContain('Loading...');
    
    error(new Error('Network error'));
    expect(container.innerHTML).toContain('Error: Network error');
    expect(container.innerHTML).toContain('Retry');
    
    error(null);
    content('Recovered content');
    expect(container.innerHTML).toContain('Recovered content');
  });

  it('should support streaming lists', async () => {
    interface Message {
      id: number;
      text: string;
      timestamp: number;
    }

    const messages = signal<Message[]>([]);
    const isConnected = signal(false);

    const ChatStream = () => {
      return h('div', { class: 'chat-stream' }, [
        h('div', { class: 'status' }, isConnected() ? 'Connected' : 'Disconnected'),
        h('div', { class: 'messages' }, [
          ...messages().map(msg =>
            h('div', { key: msg.id, class: 'message' }, [
              h('span', { class: 'time' }, new Date(msg.timestamp).toLocaleTimeString()),
              h('span', { class: 'text' }, msg.text)
            ])
          )
        ])
      ]);
    };

    render(container, ChatStream);
    
    expect(container.innerHTML).toContain('Disconnected');
    
    isConnected(true);
    expect(container.innerHTML).toContain('Connected');
    
    const newMessages = [
      { id: 1, text: 'Hello!', timestamp: Date.now() },
      { id: 2, text: 'Hi there!', timestamp: Date.now() + 1000 },
      { id: 3, text: 'How are you?', timestamp: Date.now() + 2000 }
    ];
    
    for (const msg of newMessages) {
      messages([...messages(), msg]);
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    expect(container.querySelectorAll('.message').length).toBe(3);
  });

  it('should handle streaming with suspense-like behavior', async () => {
    const data = signal<string | null>(null);
    const isPending = signal(true);

    const SuspenseStream = () => {
      if (isPending()) {
        return h('div', { class: 'suspense-fallback' }, 'Loading data...');
      }
      
      return h('div', { class: 'content' }, data());
    };

    render(container, SuspenseStream);
    
    expect(container.innerHTML).toContain('Loading data...');
    
    await new Promise(resolve => setTimeout(resolve, 5));
    data('Streamed content');
    isPending(false);
    
    expect(container.innerHTML).toContain('Streamed content');
    expect(container.innerHTML).not.toContain('Loading data...');
  });

  it('should support chunked streaming', async () => {
    interface StreamChunk {
      index: number;
      content: string;
      isLast: boolean;
    }

    const chunks = signal<StreamChunk[]>([]);
    const isComplete = signal(false);

    const ChunkedStream = () => {
      const completeContent = chunks().map(c => c.content).join('');
      const chunkCount = chunks().length;
      const done = chunks().length > 0 && chunks()[chunks().length - 1].isLast;
      
      if (done) {
        isComplete(true);
      }
      
      return h('div', { class: 'chunked-stream' }, [
        h('div', { class: 'content' }, completeContent),
        h('div', { class: 'progress' }, `${chunkCount} chunks received`),
        show(isComplete, () => h('div', { class: 'done' }, '✓ Complete'))
      ]);
    };

    render(container, ChunkedStream);
    
    const streamChunks: StreamChunk[] = [
      { index: 0, content: 'Chunk 1: ', isLast: false },
      { index: 1, content: 'Chunk 2: ', isLast: false },
      { index: 2, content: 'Chunk 3: Final', isLast: true }
    ];
    
    for (const chunk of streamChunks) {
      chunks([...chunks(), chunk]);
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    expect(container.innerHTML).toContain('Chunk 1: Chunk 2: Chunk 3: Final');
    expect(container.innerHTML).toContain('3 chunks received');
    expect(container.innerHTML).toContain('✓ Complete');
  });

  it('should handle streaming cancellation', async () => {
    const content = signal<string>('');
    const isCancelled = signal(false);
    const isStreaming = signal(false);

    const CancellableStream = () => {
      return h('div', { class: 'cancellable-stream' }, [
        show(() => isStreaming() && !isCancelled(), () => h('div', { class: 'streaming' }, 'Streaming...')),
        show(isCancelled, () => h('div', { class: 'cancelled' }, 'Stream cancelled')),
        h('div', { class: 'content' }, content())
      ]);
    };

    render(container, CancellableStream);
    
    isStreaming(true);
    expect(container.innerHTML).toContain('Streaming...');
    
    content('Partial content');
    expect(container.innerHTML).toContain('Partial content');
    
    isCancelled(true);
    expect(container.innerHTML).toContain('Stream cancelled');
    expect(container.innerHTML).not.toContain('Streaming...');
  });

  it('should support streaming with transformations', async () => {
    const rawContent = signal<string>('');

    const TransformedStream = () => {
      const transformed = rawContent().toUpperCase();
      return h('div', { class: 'transformed-stream' }, [
        h('div', { class: 'raw' }, `Raw: ${rawContent()}`),
        h('div', { class: 'transformed' }, `Transformed: ${transformed}`)
      ]);
    };

    render(container, TransformedStream);
    
    rawContent('hello');
    expect(container.innerHTML).toContain('Raw: hello');
    expect(container.innerHTML).toContain('Transformed: HELLO');
    
    rawContent('hello world');
    expect(container.innerHTML).toContain('Raw: hello world');
    expect(container.innerHTML).toContain('Transformed: HELLO WORLD');
  });

  it('should handle concurrent streams', async () => {
    const stream1 = signal<string>('');
    const stream2 = signal<string>('');
    const stream3 = signal<string>('');

    const ConcurrentStreams = () => {
      return h('div', { class: 'concurrent-streams' }, [
        h('div', { class: 'stream1' }, `Stream 1: ${stream1()}`),
        h('div', { class: 'stream2' }, `Stream 2: ${stream2()}`),
        h('div', { class: 'stream3' }, `Stream 3: ${stream3()}`),
        h('div', { class: 'combined' }, `Combined: ${stream1()} | ${stream2()} | ${stream3()}`)
      ]);
    };

    render(container, ConcurrentStreams);
    
    await Promise.all([
      (async () => {
        stream1('A');
        await new Promise(r => setTimeout(r, 5));
        stream1('B');
      })(),
      (async () => {
        stream2('1');
        await new Promise(r => setTimeout(r, 8));
        stream2('2');
      })(),
      (async () => {
        stream3('X');
        await new Promise(r => setTimeout(r, 3));
        stream3('Y');
      })()
    ]);
    
    expect(container.innerHTML).toContain('Stream 1: B');
    expect(container.innerHTML).toContain('Stream 2: 2');
    expect(container.innerHTML).toContain('Stream 3: Y');
    expect(container.innerHTML).toContain('Combined: B | 2 | Y');
  });

  it('should handle streaming memory efficiency', async () => {
    const largeStream = signal<string[]>([]);
    const displayCount = signal(10);

    const EfficientStream = () => {
      const all = largeStream();
      const visible = all.slice(-displayCount());
      return h('div', { class: 'efficient-stream' }, [
        h('div', { class: 'stats' }, `Total: ${all.length}, Showing: ${visible.length}`),
        h('div', { class: 'items' }, [
          ...visible.map((item, i) => h('div', { key: i }, item))
        ])
      ]);
    };

    render(container, EfficientStream);
    
    for (let i = 0; i < 100; i++) {
      largeStream([...largeStream(), `Item ${i}`]);
    }
    
    expect(container.innerHTML).toContain('Total: 100');
    expect(container.innerHTML).toContain('Showing: 10');
    
    displayCount(20);
    expect(container.innerHTML).toContain('Showing: 20');
  });
});
