<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref(0)

const examples = [
  {
    name: 'Signal',
    code: `import { signal, computed, effect } from 'qore'

// 创建响应式状态
const count = signal(0)
const double = computed(() => count() * 2)

// 自动追踪依赖
effect(() => {
  console.log(\`Count: \${count()}, Double: \${double()}\`)
})

// 更新触发自动重新计算
count.set(5) // Count: 5, Double: 10`,
    preview: {
      type: 'counter',
      label: '输出',
      value: 'Count: 5, Double: 10'
    }
  },
  {
    name: 'Component',
    code: `import { component, signal } from 'qore'

// 定义组件
const Counter = component(() => {
  const count = signal(0)
  
  return \`
    <div class="counter">
      <p>Count: \${count()}</p>
      <button onclick={() => count.set(count() + 1)}>
        Increment
      </button>
    </div>
  \`
})`,
    preview: {
      type: 'component',
      label: '预览',
      value: 'Count: 0\n[Increment Button]'
    }
  },
  {
    name: 'Streaming',
    code: `import { stream, html } from 'qore/ssr'

// 流式服务端渲染
async function renderPage() {
  return stream(async (write) => {
    write(html\`<html><body>\`)
    
    // 异步加载数据
    const user = await fetchUser()
    write(html\`<h1>Hello, \${user.name}!</h1>\`)
    
    write(html\`</body></html>\`)
  })
}`,
    preview: {
      type: 'stream',
      label: '流式输出',
      value: '<html><body>...loading...<h1>Hello, User!</h1>...</body></html>'
    }
  }
]
</script>

<template>
  <section class="code-preview-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">开发体验</h2>
        <p class="section-desc">简洁直观的 API，让开发变得愉悦</p>
      </div>
      
      <div class="tabs">
        <button
          v-for="(example, index) in examples"
          :key="example.name"
          :class="['tab', { active: activeTab === index }]"
          @click="activeTab = index"
        >
          {{ example.name }}
        </button>
      </div>
      
      <div class="preview-container">
        <div class="code-panel">
          <div class="panel-header">
            <span class="panel-title">代码示例</span>
          </div>
          <pre class="code-block"><code>{{ examples[activeTab].code }}</code></pre>
        </div>
        
        <div class="preview-panel">
          <div class="panel-header">
            <span class="panel-title">{{ examples[activeTab].preview.label }}</span>
          </div>
          <div class="preview-content">
            <pre>{{ examples[activeTab].preview.value }}</pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.code-preview-section {
  padding: 6rem 2rem;
  background: var(--vp-c-bg);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--vp-c-text-1);
}

.section-desc {
  font-size: 1.125rem;
  color: var(--vp-c-text-2);
}

.tabs {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-text-1);
}

.tab.active {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  color: white;
}

.preview-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.code-panel,
.preview-panel {
  background: var(--vp-code-block-bg);
}

.panel-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-code-block-bg);
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.code-block {
  padding: 1.5rem;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
}

.preview-content {
  padding: 1.5rem;
  min-height: 300px;
}

.preview-content pre {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
}

@media (max-width: 960px) {
  .preview-container {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 2rem;
  }
}

@media (max-width: 640px) {
  .tabs {
    flex-wrap: wrap;
  }
  
  .tab {
    flex: 1;
    min-width: 100px;
    text-align: center;
  }
}
</style>
