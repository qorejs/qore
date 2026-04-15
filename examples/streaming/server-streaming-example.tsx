/**
 * Qore Server-Side Streaming Example
 * 演示服务端流式渲染能力
 */

import { 
  h, 
  render, 
  div, 
  h1, 
  p, 
  button,
  StreamRenderer,
  createStreamHTML,
  renderToStream,
  renderToString,
  Suspense,
  lazy,
  asyncComponent
} from '../../packages/core/src/index';

// ============== 示例 1: 基础服务端流式渲染 ==============

/**
 * 模拟大型数据列表组件
 */
function LargeList({ count = 1000 }) {
  return div({ className: 'list' }, 
    ...Array.from({ length: count }, (_, i) => 
      div({ 
        key: i, 
        className: 'list-item',
        style: { padding: '8px', borderBottom: '1px solid #eee' }
      }, `Item ${i + 1}`)
    )
  );
}

/**
 * 服务端流式渲染大型列表
 */
async function streamLargeList() {
  const { renderer, html, stream } = createStreamHTML();
  
  // 模拟服务端逐步渲染
  const chunkSize = 100;
  const totalCount = 1000;
  
  // 开始标签
  renderer.write('<div class="list">');
  
  for (let i = 0; i < totalCount; i += chunkSize) {
    await new Promise(resolve => setTimeout(resolve, 50)); // 模拟网络延迟
    
    let chunk = '';
    for (let j = i; j < Math.min(i + chunkSize, totalCount); j++) {
      chunk += `<div class="list-item" style="padding: 8px; border-bottom: 1px solid #eee">Item ${j + 1}</div>`;
    }
    
    renderer.write(chunk);
    console.log(`Streamed chunk ${Math.floor(i / chunkSize) + 1}`);
  }
  
  // 结束标签
  renderer.write('</div>');
  renderer.end();
  
  return { renderer, html, stream };
}

// ============== 示例 2: Suspense 异步加载 ==============

/**
 * 模拟异步加载的组件
 */
async function AsyncDataComponent() {
  // 模拟 API 调用
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return div({ className: 'data-component' },
    h1({}, '📊 Data Loaded!'),
    p({}, 'This component was loaded asynchronously.')
  );
}

/**
 * 使用 Suspense 包裹异步组件
 */
function SuspenseExample() {
  const fallback = div({ className: 'loading' },
    p({}, '⏳ Loading data...')
  );
  
  return div({ className: 'suspense-example' },
    h1({}, 'Suspense Example'),
    
    // 使用 asyncComponent 包装异步组件
    asyncComponent(
      () => Promise.resolve({ default: AsyncDataComponent }),
      fallback
    )()
  );
}

// ============== 示例 3: Lazy Loading ==============

/**
 * 懒加载组件工厂
 */
const LazyHeavyComponent = lazy(() => 
  import('./heavy-component').then(mod => ({ default: mod.HeavyComponent }))
);

/**
 * 按需加载重型组件
 */
function LazyLoadingExample() {
  const lazyFactory = LazyHeavyComponent();
  const { load, component } = lazyFactory();
  
  return div({ className: 'lazy-example' },
    h1({}, 'Lazy Loading Example'),
    button({
      onClick: async () => {
        console.log('Loading heavy component...');
        await load();
        console.log('Component loaded!');
      }
    }, '📦 Load Heavy Component'),
    
    component ? component() : p({}, 'Component not loaded yet')
  );
}

// ============== 示例 4: 增量 DOM 更新 ==============

import { createUpdate, applyUpdate } from '../../packages/core/src/stream';

/**
 * 演示增量更新
 */
function IncrementalUpdateExample() {
  const container = document.getElementById('incremental-container');
  
  if (!container) return null;
  
  return div({ className: 'incremental-example' },
    h1({}, 'Incremental Updates'),
    
    button({
      onClick: () => {
        // 创建增量更新
        const update = createUpdate(
          'item-1',
          '<div data-stream-id="item-1" style="color: green">✅ Updated!</div>',
          'replace'
        );
        
        applyUpdate(container, update);
      }
    }, '🔄 Update Item'),
    
    button({
      onClick: () => {
        const update = createUpdate(
          'new-item',
          '<div data-stream-id="new-item" style="color: blue">➕ New Item</div>',
          'replace'
        );
        
        applyUpdate(container, update);
      }
    }, '➕ Add Item')
  );
}

// ============== 主示例应用 ==============

function App() {
  return div({ className: 'app', style: { padding: '20px', fontFamily: 'system-ui' } },
    h1({}, '🚀 Qore Streaming Examples'),
    
    div({ className: 'section' },
      h2({}, '1. Server-Side Streaming'),
      button({
        onClick: async () => {
          console.log('Starting stream...');
          const { stream } = await streamLargeList();
          
          const container = document.getElementById('stream-container');
          if (container) {
            container.innerHTML = '';
            for await (const chunk of stream) {
              console.log('Received chunk:', chunk.slice(0, 50) + '...');
            }
          }
        }
      }, '📡 Start Streaming List'),
      div({ id: 'stream-container', style: { marginTop: '10px', border: '1px solid #ddd', padding: '10px' } })
    ),
    
    div({ className: 'section', style: { marginTop: '20px' } },
      h2({}, '2. Suspense Async Loading'),
      div({ id: 'suspense-container' })
    ),
    
    div({ className: 'section', style: { marginTop: '20px' } },
      h2({}, '3. Incremental Updates'),
      div({ id: 'incremental-container', style: { marginTop: '10px' } },
        div({ 'data-stream-id': 'item-1', style: { padding: '8px' } }, 'Initial Item')
      )
    )
  );
}

// ============== 启动应用 ==============

if (typeof document !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    render(root, App);
  }
}

// ============== 性能测试辅助 ==============

export function measureTTFB(): Promise<number> {
  return new Promise(resolve => {
    const start = performance.now();
    
    // 模拟流式渲染开始
    setTimeout(() => {
      const ttfd = performance.now() - start;
      resolve(ttfd);
    }, 10);
  });
}

export async function benchmarkStreaming(): Promise<{
  ttfd: number;
  totalRenderTime: number;
  chunks: number;
}> {
  const startTime = performance.now();
  const { renderer, stream } = createStreamHTML();
  
  let chunks = 0;
  const ttfdPromise = measureTTFB();
  
  // 模拟流式输出
  for (let i = 0; i < 100; i++) {
    renderer.write(`<div>Chunk ${i}</div>`);
    chunks++;
    await new Promise(r => setTimeout(r, 5));
  }
  
  renderer.end();
  
  const ttfd = await ttfdPromise;
  const totalTime = performance.now() - startTime;
  
  return {
    ttfd,
    totalRenderTime: totalTime,
    chunks
  };
}

console.log('🚀 Qore Streaming Example loaded');
