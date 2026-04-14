/**
 * Qore Incremental Update Demo
 * Demonstrates diff-based incremental rendering
 */

import { h, createStream, streamMarkdown, streamCode, diff, applyPatches } from '../packages/core/src/index';

// Example 1: Basic incremental update with patch API
function demoBasicPatch() {
  console.log('\n=== Demo 1: Basic Patch API ===\n');
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const stream = createStream(async (writer) => {
    // Initial content
    writer.write(h('div', { className: 'content' }, 
      h('h1', null, 'Hello'),
      h('p', null, 'This is the initial content.')
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Incremental update - only changes will be patched
    writer.patch(h('div', { className: 'content' }, 
      h('h1', null, 'Hello World'), // Changed
      h('p', null, 'This is the initial content.'), // Unchanged
      h('p', null, 'New paragraph added!') // Added
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Another incremental update
    writer.patch(h('div', { className: 'content updated' }, // Prop changed
      h('h1', null, 'Hello World'),
      h('p', null, 'This is the initial content.'),
      h('p', null, 'New paragraph added!'),
      h('ul', null,
        h('li', null, 'Item 1'),
        h('li', null, 'Item 2'),
        h('li', null, 'Item 3')
      )
    ));
  }, { container });
  
  return stream;
}

// Example 2: Markdown streaming with incremental rendering
function demoMarkdownStreaming() {
  console.log('\n=== Demo 2: Markdown Streaming ===\n');
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const markdown = `# Welcome to Qore

## Features

- 🚀 High Performance
- 🧠 AI Native
- ⚡ Lightweight
- 🎯 Simple API

## Code Example

\`\`\`typescript
const count = signal(0)
const doubled = computed(() => count.value * 2)
\`\`\`

## Getting Started

Qore is the core of AI era UI.

It's designed for streaming and incremental updates.
`;
  
  const stream = streamMarkdown(markdown, {
    container,
    speed: 50,
    onComplete: () => {
      console.log('Markdown streaming complete!');
    }
  });
  
  return stream;
}

// Example 3: Code streaming with syntax highlighting
function demoCodeStreaming() {
  console.log('\n=== Demo 3: Code Streaming ===\n');
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const code = `// Qore - AI Native Framework
import { signal, computed, h, render } from 'qore'

// Reactive state
const count = signal(0)
const doubled = computed(() => count.value * 2)

// Component
const App = () => h('div', null,
  h('h1', null, \`Count: \${count.value}\`),
  h('button', { 
    onclick: () => count.value++ 
  }, 'Increment')
)

// Render
render(h(App), document.getElementById('root'))
`;
  
  const stream = streamCode(code, 'typescript', {
    container,
    speed: 30,
    onComplete: () => {
      console.log('Code streaming complete!');
    }
  });
  
  return stream;
}

// Example 4: AI Chat Response with incremental updates
function demoAIChatResponse() {
  console.log('\n=== Demo 4: AI Chat Response ===\n');
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const stream = createStream(async (writer) => {
    // Initial loading state
    writer.write(h('div', { className: 'chat-response' },
      h('div', { className: 'loading' }, 'Thinking...')
    ));
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Start streaming response
    writer.patch(h('div', { className: 'chat-response' },
      h('p', null, 'Qore is a lightweight, high-performance frontend framework designed for the AI era.')
    ));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Add more content
    writer.patch(h('div', { className: 'chat-response' },
      h('p', null, 'Qore is a lightweight, high-performance frontend framework designed for the AI era.'),
      h('p', null, 'Key features include:'),
      h('ul', null,
        h('li', null, 'Signal-based reactivity'),
        h('li', null, 'Incremental updates'),
        h('li', null, 'Streaming components')
      )
    ));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Final update
    writer.patch(h('div', { className: 'chat-response complete' },
      h('p', null, 'Qore is a lightweight, high-performance frontend framework designed for the AI era.'),
      h('p', null, 'Key features include:'),
      h('ul', null,
        h('li', null, 'Signal-based reactivity'),
        h('li', null, 'Incremental updates'),
        h('li', null, 'Streaming components'),
        h('li', null, 'AI-native architecture')
      ),
      h('p', null, 'Would you like to know more?')
    ));
  }, { container });
  
  return stream;
}

// Example 5: List with keyed reconciliation
function demoKeyedList() {
  console.log('\n=== Demo 5: Keyed List Reconciliation ===\n');
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const stream = createStream(async (writer) => {
    // Initial list
    writer.write(h('ul', null,
      h('li', { key: 'a' }, 'Item A'),
      h('li', { key: 'b' }, 'Item B'),
      h('li', { key: 'c' }, 'Item C')
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reorder items (keys ensure efficient update)
    writer.patch(h('ul', null,
      h('li', { key: 'c' }, 'Item C'),
      h('li', { key: 'a' }, 'Item A'),
      h('li', { key: 'b' }, 'Item B')
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add new item
    writer.patch(h('ul', null,
      h('li', { key: 'c' }, 'Item C'),
      h('li', { key: 'a' }, 'Item A - Updated'),
      h('li', { key: 'b' }, 'Item B'),
      h('li', { key: 'd' }, 'Item D')
    ));
  }, { container });
  
  return stream;
}

// Example 6: Diff algorithm demonstration
function demoDiffAlgorithm() {
  console.log('\n=== Demo 6: Diff Algorithm ===\n');
  
  const oldVNode = h('div', { className: 'container' },
    h('h1', null, 'Hello'),
    h('p', null, 'Old content'),
    h('ul', null,
      h('li', { key: 1 }, 'Item 1'),
      h('li', { key: 2 }, 'Item 2')
    )
  );
  
  const newVNode = h('div', { className: 'container updated' },
    h('h1', null, 'Hello World'),
    h('p', null, 'New content'),
    h('ul', null,
      h('li', { key: 1 }, 'Item 1'),
      h('li', { key: 2 }, 'Item 2'),
      h('li', { key: 3 }, 'Item 3')
    )
  );
  
  const patches = diff(oldVNode, newVNode);
  
  console.log('Old VNode:', JSON.stringify(oldVNode, null, 2));
  console.log('\nNew VNode:', JSON.stringify(newVNode, null, 2));
  console.log('\nGenerated Patches:');
  patches.forEach((patch, i) => {
    console.log(`  ${i + 1}. ${patch.type} at ${patch.path.join('.')}`);
  });
  
  console.log('\nApplying patches...');
  const result = applyPatches(JSON.parse(JSON.stringify(oldVNode)), patches);
  console.log('Result matches new VNode:', JSON.stringify(result) === JSON.stringify(newVNode));
}

// Run all demos
function runAllDemos() {
  console.log('🚀 Qore Incremental Update Demos\n');
  console.log('Running all demos...\n');
  
  // Note: In browser environment, uncomment the demos you want to run
  // demoBasicPatch();
  // demoMarkdownStreaming();
  // demoCodeStreaming();
  // demoAIChatResponse();
  // demoKeyedList();
  
  // Run diff algorithm demo (console output)
  demoDiffAlgorithm();
}

// Export for use
export {
  demoBasicPatch,
  demoMarkdownStreaming,
  demoCodeStreaming,
  demoAIChatResponse,
  demoKeyedList,
  demoDiffAlgorithm,
  runAllDemos
};

// Run if executed directly
if (typeof window !== 'undefined') {
  runAllDemos();
}
