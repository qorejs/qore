<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stars = ref(0)

// 获取 GitHub Stars
onMounted(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/qorejs/qore')
    const data = await res.json()
    stars.value = data.stargazers_count || 0
  } catch {
    stars.value = 0
  }
})
</script>

<template>
  <section class="hero-section">
    <div class="hero-content">
      <div class="hero-badge">
        <span class="badge-icon">🚀</span>
        <span>AI-Native Framework</span>
      </div>
      
      <h1 class="hero-title">
        <span class="gradient-text">Qore</span>
        <span class="subtitle">The Core of AI Era UI</span>
      </h1>
      
      <p class="hero-tagline">
        细粒度响应式 + 流式渲染，为 AI 应用而生
      </p>
      
      <div class="hero-actions">
        <a href="/guide/getting-started" class="btn btn-primary">
          <span>🚀</span> 快速开始
        </a>
        <a href="/examples/basic" class="btn btn-secondary">
          <span>💡</span> 查看示例
        </a>
        <a href="https://github.com/qore-framework/qore" class="btn btn-ghost" target="_blank">
          <span>⭐</span> {{ stars }}+ Stars
        </a>
      </div>
      
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-value">5KB</span>
          <span class="stat-label">Bundle Size</span>
        </div>
        <div class="stat">
          <span class="stat-value">5ms</span>
          <span class="stat-label">TTFB</span>
        </div>
        <div class="stat">
          <span class="stat-value">150+</span>
          <span class="stat-label">Tests</span>
        </div>
        <div class="stat">
          <span class="stat-value">0.3ms</span>
          <span class="stat-label">Render Time</span>
        </div>
      </div>
    </div>
    
    <div class="hero-code">
      <div class="code-window">
        <div class="code-header">
          <div class="window-controls">
            <span class="control red"></span>
            <span class="control yellow"></span>
            <span class="control green"></span>
          </div>
          <span class="filename">App.qore.ts</span>
        </div>
        <pre class="code-content"><code><span class="keyword">import</span> { signal, computed, effect } <span class="keyword">from</span> <span class="string">'qore'</span>

<span class="comment">// 创建响应式状态</span>
<span class="keyword">const</span> count = <span class="function">signal</span>(<span class="number">0</span>)
<span class="keyword">const</span> double = <span class="function">computed</span>(() => count() * <span class="number">2</span>)

<span class="comment">// 自动追踪依赖</span>
<span class="function">effect</span>(() => {
  console.<span class="function">log</span>(`Count: ${count()}, Double: ${double()}`)
})

<span class="comment">// 更新触发自动重新计算</span>
count.<span class="function">set</span>(<span class="number">5</span>) <span class="comment">// Count: 5, Double: 10</span></code></pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  padding: 6rem 2rem 4rem;
  max-width: 1400px;
  margin: 0 auto;
  align-items: center;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--vp-c-brand-soft);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-brand);
  width: fit-content;
  animation: fadeInUp 0.6s ease-out;
}

.badge-icon {
  font-size: 1rem;
}

.hero-title {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  animation: fadeInUp 0.6s ease-out 0.1s backwards;
}

.gradient-text {
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 2rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: none;
  -webkit-text-fill-color: var(--vp-c-text-2);
}

.hero-tagline {
  font-size: 1.25rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  max-width: 500px;
  animation: fadeInUp 0.6s ease-out 0.2s backwards;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  animation: fadeInUp 0.6s ease-out 0.3s backwards;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-primary {
  background: var(--vp-c-brand);
  color: white;
  box-shadow: 0 4px 12px var(--vp-c-brand-soft);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--vp-c-brand-soft);
}

.btn-secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-secondary:hover {
  background: var(--vp-c-divider);
}

.btn-ghost {
  background: transparent;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

.btn-ghost:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.hero-stats {
  display: flex;
  gap: 2rem;
  padding-top: 2rem;
  animation: fadeInUp 0.6s ease-out 0.4s backwards;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-brand);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
}

.hero-code {
  animation: fadeInRight 0.8s ease-out 0.3s backwards;
}

.code-window {
  background: var(--vp-code-block-bg);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--vp-c-divider);
}

.code-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--vp-code-block-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.window-controls {
  display: flex;
  gap: 0.5rem;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.control.red { background: #ff5f57; }
.control.yellow { background: #febc2e; }
.control.green { background: #28c840; }

.filename {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.code-content {
  padding: 1.5rem;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  overflow-x: auto;
}

.keyword { color: #c678dd; }
.string { color: #98c379; }
.number { color: #d19a66; }
.comment { color: #5c6370; font-style: italic; }
.function { color: #61afef; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 960px) {
  .hero-section {
    grid-template-columns: 1fr;
    gap: 3rem;
    padding: 4rem 1.5rem;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1.5rem;
  }
  
  .hero-stats {
    gap: 1.5rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1.25rem;
  }
  
  .hero-actions {
    flex-direction: column;
  }
  
  .btn {
    justify-content: center;
  }
}
</style>
