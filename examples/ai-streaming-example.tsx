/**
 * Qore AI Streaming Example
 * Demonstrates real AI response streaming with incremental rendering
 */

import { h, createStream, streamMarkdown, createStreamWriter } from '@qorejs/qore';

/**
 * Example 1: AI Chat with Streaming Response
 * Simulates fetching from an AI API and streaming the response
 */
export function aiChatStream(container: HTMLElement): void {
  container.innerHTML = `
    <h2>AI Chat Stream</h2>
    <div id="chat-input-container">
      <input type="text" id="user-input" placeholder="Ask something..." />
      <button id="send-btn">Send</button>
    </div>
    <div id="chat-output" class="chat-output"></div>
  `;

  const userInput = document.getElementById('user-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
  const chatOutput = document.getElementById('chat-output') as HTMLDivElement;

  const handleSend = async () => {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    // Clear previous output
    chatOutput.innerHTML = '';

    // Add user message
    const userMessage = h('div', { className: 'message user' }, `You: ${prompt}`);
    const { writer } = createStreamWriter(chatOutput);
    writer.append(userMessage);

    // Create AI response stream
    const aiStream = createStream(async (aiWriter) => {
      // Show loading indicator
      aiWriter.write(h('div', { className: 'message ai loading' }, 'AI is thinking...'));

      try {
        // Simulate AI API call with streaming
        const response = await simulateAIApi(prompt);
        
        // Clear loading and start streaming response
        aiWriter.clear();
        
        // Stream the AI response word by word
        const words = response.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
          currentText += (i > 0 ? ' ' : '') + words[i];
          aiWriter.patch(h('div', { className: 'message ai' }, `AI: ${currentText}`));
        }
      } catch (error) {
        aiWriter.update(h('div', { className: 'error' }, `Error: ${(error as Error).message}`));
      }
    });

    userInput.value = '';
  };

  sendBtn.addEventListener('click', handleSend);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}

/**
 * Example 2: Markdown Streaming with AI Response
 * Renders AI response as formatted markdown
 */
export function markdownStreamDemo(container: HTMLElement): void {
  container.innerHTML = `
    <h2>Markdown Stream Demo</h2>
    <button id="generate-md">Generate Markdown</button>
    <div id="md-output" class="markdown-output"></div>
  `;

  const generateBtn = document.getElementById('generate-md') as HTMLButtonElement;
  const mdOutput = document.getElementById('md-output') as HTMLDivElement;

  generateBtn.addEventListener('click', () => {
    mdOutput.innerHTML = '';

    const markdownContent = `# Qore Framework

## Features
- **Reactive** - Fine-grained reactivity
- **Fast** - Optimized diff algorithm
- **AI-Native** - Built-in streaming support

## Code Example
\`\`\`typescript
const count = signal(0);
effect(() => console.log(count.get()));
\`\`\`

## Benefits
1. Better performance
2. Simpler code
3. AI-friendly`;

    streamMarkdown(markdownContent, {
      container: mdOutput,
      speed: 20,
      onComplete: () => {
        console.log('Markdown rendering complete!');
      },
    });
  });
}

/**
 * Example 3: Code Streaming with Syntax Highlighting
 */
export function codeStreamDemo(container: HTMLElement): void {
  container.innerHTML = `
    <h2>Code Stream Demo</h2>
    <button id="generate-code">Stream Code</button>
    <div id="code-output" class="code-output"></div>
  `;

  const generateBtn = document.getElementById('generate-code') as HTMLButtonElement;
  const codeOutput = document.getElementById('code-output') as HTMLDivElement;

  const codeExample = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate first 10 Fibonacci numbers
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}`;

  generateBtn.addEventListener('click', () => {
    codeOutput.innerHTML = '';

    streamCode(codeExample, 'typescript', {
      container: codeOutput,
      speed: 15,
      onComplete: () => {
        console.log('Code streaming complete!');
      },
    });
  });
}

/**
 * Example 4: Multi-Stream Dashboard
 * Multiple streams updating simultaneously
 */
export function multiStreamDashboard(container: HTMLElement): void {
  container.innerHTML = `
    <h2>Multi-Stream Dashboard</h2>
    <div class="dashboard">
      <div id="stream-1" class="stream-panel"></div>
      <div id="stream-2" class="stream-panel"></div>
      <div id="stream-3" class="stream-panel"></div>
    </div>
    <button id="start-all">Start All Streams</button>
  `;

  const startBtn = document.getElementById('start-all') as HTMLButtonElement;
  const panels = [
    document.getElementById('stream-1') as HTMLDivElement,
    document.getElementById('stream-2') as HTMLDivElement,
    document.getElementById('stream-3') as HTMLDivElement,
  ];

  startBtn.addEventListener('click', () => {
    panels.forEach((panel, index) => {
      panel.innerHTML = '';
      
      createStream(async (writer) => {
        writer.write(h('h3', null, `Stream ${index + 1}`));
        
        for (let i = 1; i <= 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 200 + index * 100));
          writer.append(h('p', null, `Update ${i} from stream ${index + 1}`));
        }
      }, { container: panel });
    });
  });
}

/**
 * Simulate AI API with streaming response
 */
async function simulateAIApi(prompt: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
  
  // Simulated AI responses
  const responses: Record<string, string> = {
    'hello': 'Hello! How can I assist you today? I am an AI assistant powered by Qore framework.',
    'help': 'I can help you with various tasks! Try asking me questions about Qore, or request code examples.',
    'qore': 'Qore is an AI-native frontend framework that provides fine-grained reactivity, optimized rendering, and built-in streaming support for AI responses.',
    'default': `That's an interesting question about "${prompt}"! Let me think about this...\n\nBased on my analysis, I would suggest considering the following points:\n\n1. **Performance**: Qore offers excellent performance with its optimized diff algorithm.\n\n2. **Developer Experience**: The API is intuitive and easy to use.\n\n3. **AI Integration**: Built-in streaming makes AI responses seamless.\n\nWould you like to know more about any specific aspect?`,
  };

  const lowerPrompt = prompt.toLowerCase();
  for (const key of Object.keys(responses)) {
    if (lowerPrompt.includes(key)) {
      return responses[key];
    }
  }
  
  return responses['default'];
}

/**
 * Run all AI streaming demos
 */
export function runAllAIDemos(): void {
  const app = document.getElementById('app') || document.body;
  
  app.innerHTML = '<h1>Qore AI Streaming Examples</h1>';
  
  const demo1 = document.createElement('div');
  demo1.style.marginBottom = '40px';
  app.appendChild(demo1);
  aiChatStream(demo1);
  
  const demo2 = document.createElement('div');
  demo2.style.marginBottom = '40px';
  app.appendChild(demo2);
  markdownStreamDemo(demo2);
  
  const demo3 = document.createElement('div');
  demo3.style.marginBottom = '40px';
  app.appendChild(demo3);
  codeStreamDemo(demo3);
  
  const demo4 = document.createElement('div');
  demo4.style.marginBottom = '40px';
  app.appendChild(demo4);
  multiStreamDashboard(demo4);
}

if (typeof window !== 'undefined') {
  (window as any).runAIDemos = runAllAIDemos;
}
