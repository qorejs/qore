/**
 * Qore Stream Demo - AI Streaming Response Example
 */

import { h, createStream, streamText, div, span, button } from '@qore/core';

// Example 1: Basic streaming with AI response simulation
export function basicStreamDemo(container: HTMLElement): void {
  container.innerHTML = '<h2>Basic Stream Demo</h2><div id="stream-output"></div>';
  const output = document.getElementById('stream-output')!;
  
  const stream = createStream(async (writer) => {
    // Initial loading state
    writer.write(h('div', { className: 'loading' }, 'Loading...'));
    
    // Simulate AI response streaming
    await new Promise(resolve => setTimeout(resolve, 500));
    writer.update(h('div', null, 'Thinking'));
    
    await new Promise(resolve => setTimeout(resolve, 500));
    writer.update(h('div', null, 'Thinking...'));
    
    await new Promise(resolve => setTimeout(resolve, 800));
    writer.update(
      h('div', { className: 'response' }, [
        h('p', null, 'Hello! I am an AI assistant.'),
        h('p', null, 'This is a streaming response example.'),
      ])
    );
  });
  
  stream.isComplete.subscribe(complete => {
    if (complete) {
      console.log('Stream completed!');
    }
  });
}

// Example 2: Typewriter effect
export function typewriterDemo(container: HTMLElement): void {
  container.innerHTML = '<h2>Typewriter Effect Demo</h2><div id="typewriter-output"></div>';
  const output = document.getElementById('typewriter-output')!;
  
  const text = 'Welcome to Qore! This is a demonstration of the typewriter streaming effect. Watch as each character appears one by one...';
  
  streamText(text, {
    container: output,
    speed: 30,
    onComplete: () => {
      console.log('Typewriter complete!');
    },
  });
}

// Example 3: Incremental append (chat-like)
export function chatStreamDemo(container: HTMLElement): void {
  container.innerHTML = `
    <h2>Chat Stream Demo</h2>
    <div id="chat-output"></div>
    <button id="send-btn">Send Message</button>
  `;
  
  const output = document.getElementById('chat-output')!;
  const sendBtn = document.getElementById('send-btn')!;
  
  let stream: any = null;
  
  sendBtn.addEventListener('click', () => {
    if (stream) {
      stream.abort();
    }
    
    output.innerHTML = '';
    
    stream = createStream(async (writer) => {
      const messages = [
        h('div', { className: 'message' }, 'User: Hello!'),
        h('div', { className: 'message' }, 'AI: Hi there!'),
        h('div', { className: 'message' }, 'AI: How can I help you today?'),
      ];
      
      for (const msg of messages) {
        await new Promise(resolve => setTimeout(resolve, 600));
        writer.append(msg);
      }
    }, { container: output });
  });
}

// Example 4: Error handling
export function errorHandlingDemo(container: HTMLElement): void {
  container.innerHTML = '<h2>Error Handling Demo</h2><div id="error-output"></div><button id="error-btn">Trigger Error</button>';
  const output = document.getElementById('error-output')!;
  const errorBtn = document.getElementById('error-btn')!;
  
  errorBtn.addEventListener('click', () => {
    output.innerHTML = '';
    
    const stream = createStream(async (writer) => {
      writer.write(h('div', null, 'Starting...'));
      await new Promise(resolve => setTimeout(resolve, 500));
      throw new Error('Simulated network error');
    }, {
      container: output,
      onError: (err) => {
        console.error('Stream error:', err);
        output.innerHTML += `<div class="error">Error: ${err.message}</div>`;
      },
    });
  });
}

// Main demo runner
export function runAllDemos(): void {
  const app = document.getElementById('app');
  if (!app) {
    const newApp = document.createElement('div');
    newApp.id = 'app';
    document.body.appendChild(newApp);
    runAllDemos();
    return;
  }
  
  app.innerHTML = '<h1>Qore Stream Demos</h1>';
  
  const demo1 = document.createElement('div');
  demo1.id = 'demo1';
  app.appendChild(demo1);
  basicStreamDemo(demo1);
  
  const demo2 = document.createElement('div');
  demo2.id = 'demo2';
  app.appendChild(demo2);
  typewriterDemo(demo2);
  
  const demo3 = document.createElement('div');
  demo3.id = 'demo3';
  app.appendChild(demo3);
  chatStreamDemo(demo3);
  
  const demo4 = document.createElement('div');
  demo4.id = 'demo4';
  app.appendChild(demo4);
  errorHandlingDemo(demo4);
}

if (typeof window !== 'undefined') {
  (window as any).runStreamDemos = runAllDemos;
}
