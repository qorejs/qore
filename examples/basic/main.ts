/**
 * Qore Basic Example - New API
 */

import { signal, h, render, stream } from '@qorejs/qore';

// Counter Example
function Counter() {
  const count = signal(0);
  
  const increment = () => count(count() + 1);
  const decrement = () => count(count() - 1);
  
  return h('div', { style: { textAlign: 'center', padding: '20px' } }, [
    h('h1', null, ['🚀 Qore Framework']),
    h('p', null, ['Count: ', String(count())]),
    h('div', { style: { gap: '10px', display: 'flex', justifyContent: 'center', marginTop: '10px' } }, [
      h('button', { onClick: decrement }, ['➖']),
      h('button', { onClick: increment }, ['➕']),
    ])
  ]);
}

// AI Stream Example
function AIStream() {
  const container = document.createElement('div');
  container.style.cssText = 'margin-top: 20px; padding: 15px; border: 1px solid #ddd;';
  
  const startStream = () => {
    stream(async (write) => {
      const response = 'Hello! I am an AI assistant. This is a streaming response demonstrating Qore\'s AI-native capabilities.';
      for (let i = 0; i < response.length; i++) {
        await new Promise(r => setTimeout(r, 30));
        write(response[i]);
      }
      write.done();
    }, { 
      container,
      parseMarkdown: true 
    });
  };
  
  return h('div', null, [
    h('h2', null, ['🤖 AI Stream']),
    h('button', { onClick: startStream }, ['Start Stream']),
    container,
  ]);
}

// Main App
const app = document.getElementById('app');
if (app) {
  app.innerHTML = '';
  
  // Render counter
  const counterContainer = document.createElement('div');
  app.appendChild(counterContainer);
  render(() => Counter(), counterContainer);
  
  // Render AI stream
  const streamContainer = document.createElement('div');
  app.appendChild(streamContainer);
  render(() => AIStream(), streamContainer);
  
  console.log('✅ Qore app rendered!');
}
