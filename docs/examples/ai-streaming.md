# AI Streaming Examples

Complete examples of AI streaming integration with Qore.

## Table of Contents

1. [Basic Chat Stream](#basic-chat-stream)
2. [Markdown Rendering](#markdown-rendering)
3. [Code Streaming](#code-streaming)
4. [Multi-Stream Dashboard](#multi-stream-dashboard)
5. [Error Handling](#error-handling)
6. [Real API Integration](#real-api-integration)

---

## Basic Chat Stream

Simple chat interface with streaming AI responses.

```typescript
import { h, createStream } from '@qore/core';

function createChatInterface(container: HTMLElement) {
  // Create UI
  container.innerHTML = `
    <div class="chat-container">
      <div id="messages" class="messages"></div>
      <div class="input-area">
        <input type="text" id="user-input" placeholder="Type a message..." />
        <button id="send-btn">Send</button>
      </div>
    </div>
  `;
  
  const messagesDiv = document.getElementById('messages')!;
  const userInput = document.getElementById('user-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
  
  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Add user message
    messagesDiv.appendChild(
      h('div', { className: 'message user' }, message) as any
    );
    
    // Create AI response stream
    const stream = createStream(async (writer) => {
      // Loading state
      writer.write(h('div', { className: 'message ai loading' }, 'Thinking...'));
      
      // Fetch AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message })
      });
      
      // Clear loading
      writer.clear();
      
      // Stream response chunks
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        writer.append(h('span', null, chunk));
      }
    }, { container: messagesDiv });
    
    userInput.value = '';
  }
  
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });
}
```

---

## Markdown Rendering

Stream AI responses as formatted markdown.

```typescript
import { streamMarkdown } from '@qore/core';

function renderMarkdownResponse(container: HTMLElement, markdown: string) {
  streamMarkdown(markdown, {
    container,
    speed: 20,  // ms per line
    onComplete: () => {
      // Apply syntax highlighting after render
      document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  });
}

// Example AI response
const aiResponse = `# Analysis Report

## Summary
The data shows **significant growth** in Q4.

## Key Metrics
| Metric | Value | Change |
|--------|-------|--------|
| Revenue | $1.2M | +15% |
| Users | 50K | +23% |

## Code Example
\`\`\`typescript
const growth = calculateGrowth(data);
console.log(growth);
\`\`\`

## Recommendations
1. Continue current strategy
2. Invest in marketing
3. Expand team`;

renderMarkdownResponse(document.getElementById('output')!, aiResponse);
```

---

## Code Streaming

Stream code with syntax highlighting.

```typescript
import { streamCode } from '@qore/core';

function streamCodeExample(container: HTMLElement) {
  const code = `// Fibonacci with memoization
function fibonacci(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 1) return n;
  
  if (memo.has(n)) {
    return memo.get(n)!;
  }
  
  const result = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  memo.set(n, result);
  
  return result;
}

// Calculate first 20 numbers
for (let i = 0; i < 20; i++) {
  console.log(\`fib(\${i}) = \${fibonacci(i)}\`);
}`;

  streamCode(code, 'typescript', {
    container,
    speed: 15,  // ms per character
    onComplete: () => {
      console.log('Code streaming complete!');
    }
  });
}
```

---

## Multi-Stream Dashboard

Multiple streams updating simultaneously.

```typescript
import { createStream, h } from '@qore/core';

function createDashboard(container: HTMLElement) {
  container.innerHTML = `
    <div class="dashboard">
      <div id="stream-1" class="panel"></div>
      <div id="stream-2" class="panel"></div>
      <div id="stream-3" class="panel"></div>
    </div>
  `;
  
  const panels = [
    document.getElementById('stream-1')!,
    document.getElementById('stream-2')!,
    document.getElementById('stream-3')!,
  ];
  
  // Start multiple streams
  panels.forEach((panel, index) => {
    createStream(async (writer) => {
      writer.write(h('h3', null, `Data Stream ${index + 1}`));
      
      // Simulate real-time data
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500 + index * 200));
        const data = {
          timestamp: new Date().toISOString(),
          value: Math.random().toFixed(2),
          status: i % 3 === 0 ? '✓' : '○'
        };
        
        writer.append(
          h('div', { className: 'data-point' }, 
            `[${data.timestamp}] Value: ${data.value} ${data.status}`
          )
        );
      }
    }, { container: panel });
  });
}
```

---

## Error Handling

Graceful error handling for streams.

```typescript
import { createStream, h } from '@qore/core';

function createResilientStream(container: HTMLElement) {
  const stream = createStream(async (writer) => {
    try {
      writer.write(h('div', { className: 'loading' }, 'Loading...'));
      
      const response = await fetch('/api/data', {
        signal: AbortSignal.timeout(5000)  // 5s timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      writer.clear();
      
      for await (const chunk of response.body!) {
        writer.append(chunk);
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      writer.update(
        h('div', { className: 'error' }, [
          h('h3', null, 'Failed to load'),
          h('p', null, message),
          h('button', { 
            className: 'retry-btn',
            onClick: () => createResilientStream(container)
          }, 'Retry')
        ])
      );
    }
  }, {
    container,
    onError: (error) => {
      console.error('Stream error:', error);
      // Log to monitoring service
      logError(error);
    },
    onComplete: () => {
      console.log('Stream completed successfully');
    }
  });
  
  // Store for potential abort
  return stream;
}

// Usage with abort capability
const stream = createResilientStream(container);

// Cancel if needed (e.g., component unmount)
// stream.abort();
```

---

## Real API Integration

Complete example with real AI API.

```typescript
import { createStream, streamMarkdown, h } from '@qore/core';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

class AIChatService {
  private messages: ChatMessage[] = [];
  
  async sendMessage(prompt: string) {
    this.messages.push({ role: 'user', content: prompt });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: this.messages,
        stream: true
      })
    });
    
    return response;
  }
}

function createAIChat(container: HTMLElement) {
  const chatService = new AIChatService();
  
  container.innerHTML = `
    <div class="chat">
      <div id="chat-history" class="history"></div>
      <form id="chat-form" class="form">
        <textarea id="chat-input" placeholder="Ask anything..." rows="3"></textarea>
        <button type="submit">Send</button>
      </form>
    </div>
  `;
  
  const history = document.getElementById('chat-history')!;
  const form = document.getElementById('chat-form') as HTMLFormElement;
  const input = document.getElementById('chat-input') as HTMLTextAreaElement;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const prompt = input.value.trim();
    if (!prompt) return;
    
    // Add user message
    history.appendChild(
      h('div', { className: 'message user' }, prompt) as any
    );
    
    // Create AI response container
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai';
    history.appendChild(aiMessageDiv);
    
    // Stream AI response
    const response = await chatService.sendMessage(prompt);
    
    streamMarkdown('', {
      container: aiMessageDiv,
      speed: 10
    });
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Parse SSE data
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          const content = data.choices[0]?.delta?.content || '';
          fullContent += content;
          // Update markdown stream
          // (In real implementation, you'd update the stream)
        }
      }
    }
    
    input.value = '';
    history.scrollTop = history.scrollHeight;
  });
}
```

---

## Performance Optimization

### Debounce User Input

```typescript
function debounce(fn: Function, delay: number) {
  let timeout: any;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSearch = debounce(async (query: string) => {
  const stream = createStream(async (writer) => {
    const results = await searchAPI(query);
    writer.write(renderResults(results));
  });
}, 300);
```

### Cancel Previous Stream

```typescript
let currentStream: any = null;

async function search(query: string) {
  // Cancel previous
  if (currentStream) {
    currentStream.abort();
  }
  
  currentStream = createStream(async (writer) => {
    const results = await searchAPI(query);
    writer.write(renderResults(results));
  });
}
```

### Batch Updates

```typescript
// Instead of many small updates
for (const item of items) {
  writer.append(h('div', null, item));  // ❌ Many DOM updates
}

// Batch into one update
const batch = h('div', null, 
  ...items.map(item => h('div', null, item))
);
writer.write(batch);  // ✅ Single DOM update
```

---

## Best Practices

1. **Always handle errors** - Provide fallback UI
2. **Support abort** - Clean up on unmount
3. **Show loading states** - Keep users informed
4. **Optimize update frequency** - Batch when possible
5. **Use appropriate speeds** - Balance UX and performance
6. **Test with slow connections** - Ensure graceful degradation

---

## See Also

- [Stream API](../api/stream.md) - API reference
- [Suspense API](../api/suspense.md) - Async patterns
- [Diff API](../api/diff.md) - Incremental updates
