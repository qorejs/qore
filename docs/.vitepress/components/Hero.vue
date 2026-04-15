<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stars = ref(0)
const isVisible = ref(false)

// 获取 GitHub Stars
onMounted(async () => {
  isVisible.value = true
  
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
    <!-- Decorative Background Elements -->
    <div class="hero-background">
      <div class="bg-gradient-orb bg-gradient-orb-1"></div>
      <div class="bg-gradient-orb bg-gradient-orb-2"></div>
      <div class="bg-gradient-orb bg-gradient-orb-3"></div>
      <div class="bg-grid-pattern"></div>
    </div>
    
    <div class="hero-content">
      <!-- Animated Badge -->
      <div class="hero-badge" :class="{ 'badge-visible': isVisible }">
        <span class="badge-glow"></span>
        <span class="badge-icon">✨</span>
        <span>AI-Native Framework</span>
        <span class="badge-arrow">→</span>
      </div>
      
      <!-- Main Title with Gradient -->
      <h1 class="hero-title" :class="{ 'title-visible': isVisible }">
        <span class="title-wrapper">
          <span class="gradient-text">Qore</span>
        </span>
        <span class="subtitle">The Core of AI Era UI</span>
      </h1>
      
      <!-- Tagline -->
      <p class="hero-tagline" :class="{ 'tagline-visible': isVisible }">
        细粒度响应式 + 流式渲染，为 AI 应用而生
      </p>
      
      <!-- Action Buttons -->
      <div class="hero-actions" :class="{ 'actions-visible': isVisible }">
        <a href="/qore/guide/getting-started.html" class="btn btn-primary btn-glow">
          <span class="btn-icon">🚀</span>
          <span>快速开始</span>
          <span class="btn-shine"></span>
        </a>
        <a href="/qore/examples/basic.html" class="btn btn-secondary">
          <span class="btn-icon">💡</span>
          <span>查看示例</span>
        </a>
        <a href="https://github.com/qorejs/qore" class="btn btn-ghost" target="_blank">
          <span class="btn-icon">⭐</span>
          <span>{{ stars }}+ Stars</span>
        </a>
      </div>
      
      <!-- Performance Stats -->
      <div class="hero-stats" :class="{ 'stats-visible': isVisible }">
        <div class="stat-item">
          <div class="stat-icon-wrapper">
            <span class="stat-icon">📦</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">5KB</span>
            <span class="stat-label">Bundle Size</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon-wrapper">
            <span class="stat-icon">⚡</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">5ms</span>
            <span class="stat-label">TTFB</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon-wrapper">
            <span class="stat-icon">🧪</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">150+</span>
            <span class="stat-label">Tests</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon-wrapper">
            <span class="stat-icon">🎯</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">0.3ms</span>
            <span class="stat-label">Render Time</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Code Window with Enhanced Visual -->
    <div class="hero-code" :class="{ 'code-visible': isVisible }">
      <div class="code-window">
        <!-- Window Header -->
        <div class="code-header">
          <div class="window-controls">
            <span class="control red"></span>
            <span class="control yellow"></span>
            <span class="control green"></span>
          </div>
          <div class="header-center">
            <span class="filename">App.qore.ts</span>
            <span class="file-status">
              <span class="status-dot"></span>
              Ready
            </span>
          </div>
          <div class="header-actions">
            <button class="header-btn" title="Copy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Code Content with Line Numbers -->
        <pre class="code-content"><code><div class="code-line"><span class="line-number">1</span><span class="keyword">import</span> { signal, computed, effect } <span class="keyword">from</span> <span class="string">'qore'</span></div>
<div class="code-line"><span class="line-number">2</span></div>
<div class="code-line"><span class="line-number">3</span><span class="comment">// 创建响应式状态</span></div>
<div class="code-line"><span class="line-number">4</span><span class="keyword">const</span> count = <span class="function">signal</span>(<span class="number">0</span>)</div>
<div class="code-line"><span class="line-number">5</span><span class="keyword">const</span> double = <span class="function">computed</span>(() => count() * <span class="number">2</span>)</div>
<div class="code-line"><span class="line-number">6</span></div>
<div class="code-line"><span class="line-number">7</span><span class="comment">// 自动追踪依赖</span></div>
<div class="code-line"><span class="line-number">8</span><span class="function">effect</span>(() => {</div>
<div class="code-line"><span class="line-number">9</span>  console.<span class="function">log</span>(<span class="string">`Count: ${count()}, Double: ${double()}`</span>)</div>
<div class="code-line"><span class="line-number">10</span>})</div>
<div class="code-line"><span class="line-number">11</span></div>
<div class="code-line"><span class="line-number">12</span><span class="comment">// 更新触发自动重新计算</span></div>
<div class="code-line"><span class="line-number">13</span>count.<span class="function">set</span>(<span class="number">5</span>) <span class="comment">// Count: 5, Double: 10</span></div></code></pre>
        
        <!-- Code Footer -->
        <div class="code-footer">
          <span class="language-badge">TypeScript</span>
          <span class="code-stats">13 lines · 342 bytes</span>
        </div>
      </div>
      
      <!-- Floating Elements -->
      <div class="floating-element floating-element-1">⚡</div>
      <div class="floating-element floating-element-2">🎯</div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  padding: 8rem 2rem 6rem;
  max-width: 1400px;
  margin: 0 auto;
  align-items: center;
  overflow: hidden;
}

/* Background Layer */
.hero-background {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* Content Layer */
.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Animated Badge */
.hero-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 1.25rem;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--vp-radius-full);
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  color: var(--vp-c-brand);
  width: fit-content;
  cursor: pointer;
  transition: all var(--vp-transition-base);
  opacity: 0;
  transform: translateY(20px);
}

.hero-badge:hover {
  background: var(--vp-c-brand-tint);
  border-color: var(--vp-c-brand);
  transform: translateY(0) scale(1.02);
  box-shadow: var(--vp-shadow-brand);
}

.badge-glow {
  position: absolute;
  inset: -2px;
  background: var(--vp-gradient-primary);
  border-radius: var(--vp-radius-full);
  opacity: 0;
  filter: blur(8px);
  transition: opacity var(--vp-transition-base);
  z-index: -1;
}

.hero-badge:hover .badge-glow {
  opacity: 0.3;
}

.badge-icon {
  font-size: 1rem;
  animation: sparkle 2s ease-in-out infinite;
}

.badge-arrow {
  font-size: 0.875rem;
  transition: transform var(--vp-transition-fast);
}

.hero-badge:hover .badge-arrow {
  transform: translateX(4px);
}

.badge-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) forwards;
}

/* Hero Title */
.hero-title {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: var(--font-weight-extrabold);
  line-height: var(--line-height-tight);
  letter-spacing: var(--tracking-tighter);
  opacity: 0;
  transform: translateY(30px);
}

.title-wrapper {
  display: inline-block;
}

.gradient-text {
  background: var(--vp-gradient-hero);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientFlow 4s ease infinite;
}

.subtitle {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: var(--font-weight-semibold);
  color: var(--vp-c-text-2);
  background: none;
  -webkit-text-fill-color: var(--vp-c-text-2);
  letter-spacing: var(--tracking-tight);
}

.title-visible {
  animation: fadeInUp 0.8s var(--vp-animation-enter) 0.1s forwards;
}

/* Tagline */
.hero-tagline {
  font-size: 1.25rem;
  color: var(--vp-c-text-2);
  line-height: var(--line-height-relaxed);
  max-width: 540px;
  opacity: 0;
  transform: translateY(20px);
}

.tagline-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.2s forwards;
}

/* Action Buttons */
.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  opacity: 0;
  transform: translateY(20px);
}

.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.75rem;
  border-radius: var(--vp-radius-lg);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  transition: all var(--vp-transition-base);
  cursor: pointer;
  overflow: hidden;
  letter-spacing: var(--tracking-wide);
}

.btn-icon {
  font-size: 1.125rem;
  transition: transform var(--vp-transition-fast);
}

.btn:hover .btn-icon {
  transform: scale(1.1);
}

.btn-glow {
  box-shadow: var(--vp-shadow-brand);
}

.btn-glow:hover {
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4), 0 6px 20px rgba(168, 85, 247, 0.25);
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn:hover .btn-shine {
  left: 100%;
}

.btn-primary {
  background: var(--vp-gradient-primary);
  background-size: 200% 200%;
  color: white;
  border: none;
  animation: gradientShift 3s ease infinite;
}

.btn-primary:hover {
  transform: translateY(-3px);
}

.btn-secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-secondary:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-border-hover);
  transform: translateY(-2px);
}

.btn-ghost {
  background: transparent;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
}

.btn-ghost:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-tint);
}

.actions-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.3s forwards;
}

/* Stats Bar */
.hero-stats {
  display: flex;
  align-items: center;
  gap: 0;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
  opacity: 0;
  transform: translateY(20px);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.stat-icon-wrapper {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-gradient-subtle);
  border-radius: var(--vp-radius-lg);
  font-size: 1.25rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: var(--vp-c-text-1);
  letter-spacing: var(--tracking-tight);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--vp-c-text-3);
  font-weight: var(--font-weight-medium);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--vp-c-divider);
  margin: 0 1.5rem;
}

.stats-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.4s forwards;
}

/* Code Window */
.hero-code {
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateX(40px);
}

.code-visible {
  animation: slideInRight 0.8s var(--vp-animation-enter) 0.3s forwards;
}

.code-window {
  position: relative;
  background: var(--vp-code-block-bg);
  border-radius: var(--vp-radius-2xl);
  overflow: hidden;
  box-shadow: var(--vp-shadow-2xl);
  border: 1px solid var(--vp-code-block-border);
  transition: all var(--vp-transition-base);
}

.code-window:hover {
  transform: translateY(-4px);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4), var(--vp-shadow-glow);
  border-color: var(--vp-c-border-hover);
}

/* Code Header */
.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--vp-code-block-border);
}

.window-controls {
  display: flex;
  gap: 0.5rem;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: filter var(--vp-transition-fast);
}

.control:hover {
  filter: brightness(1.2);
}

.control.red { background: #ff5f57; }
.control.yellow { background: #febc2e; }
.control.green { background: #28c840; }

.header-center {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filename {
  font-size: 0.8125rem;
  color: var(--vp-c-text-3);
  font-family: 'JetBrains Mono', monospace;
  font-weight: var(--font-weight-medium);
}

.file-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  color: #10b981;
  font-weight: var(--font-weight-medium);
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.header-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--vp-code-block-border);
  border-radius: var(--vp-radius-md);
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all var(--vp-transition-fast);
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--vp-c-border-hover);
  color: var(--vp-c-text-1);
}

/* Code Content */
.code-content {
  padding: 1.5rem;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.7;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-feature-settings: 'liga' 1, 'calt' 1;
}

.code-line {
  display: flex;
  gap: 1rem;
  padding: 0.125rem 0;
}

.line-number {
  width: 2rem;
  text-align: right;
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.75rem;
  user-select: none;
  flex-shrink: 0;
}

.keyword { color: #c084fc; }
.string { color: #4ade80; }
.number { color: #fb923c; }
.comment { color: #6b7280; font-style: italic; }
.function { color: #60a5fa; }

/* Code Footer */
.code-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid var(--vp-code-block-border);
}

.language-badge {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  font-weight: var(--font-weight-medium);
}

.code-stats {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  font-family: 'JetBrains Mono', monospace;
}

/* Floating Elements */
.floating-element {
  position: absolute;
  font-size: 2rem;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  animation: float 3s ease-in-out infinite;
  pointer-events: none;
}

.floating-element-1 {
  top: -20px;
  right: -20px;
  animation-delay: 0s;
}

.floating-element-2 {
  bottom: 40px;
  left: -30px;
  animation-delay: 1.5s;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(10deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(5deg); }
}

/* Tablet */
@media (max-width: 960px) {
  .hero-section {
    grid-template-columns: 1fr;
    gap: 3rem;
    padding: 5rem 1.5rem 3rem;
  }
  
  .hero-code {
    order: -1;
  }
  
  .code-window {
    max-height: 450px;
  }
  
  .hero-stats {
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .stat-divider {
    display: none;
  }
}

/* Mobile */
@media (max-width: 640px) {
  .hero-section {
    padding: 4rem 1rem 2rem;
    gap: 2rem;
  }
  
  .hero-content {
    gap: 1.5rem;
  }
  
  .hero-badge {
    padding: 0.375rem 0.875rem;
    font-size: 0.8125rem;
  }
  
  .hero-title {
    gap: 0.5rem;
  }
  
  .subtitle {
    font-size: 1.5rem;
  }
  
  .hero-tagline {
    font-size: 1rem;
    line-height: var(--line-height-normal);
  }
  
  .hero-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .btn {
    justify-content: center;
    width: 100%;
    padding: 0.875rem 1.5rem;
    text-align: center;
  }
  
  .hero-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding-top: 1.5rem;
    border-top: none;
  }
  
  .stat-item {
    flex-direction: column;
    align-items: flex-start;
    padding: 0;
  }
  
  .stat-divider {
    display: none;
  }
  
  .stat-icon-wrapper {
    width: 36px;
    height: 36px;
    font-size: 1.125rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
  
  .hero-code {
    display: none;
  }
  
  .floating-element {
    display: none;
  }
}

/* Small Mobile (< 400px) */
@media (max-width: 400px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1.25rem;
  }
  
  .hero-tagline {
    font-size: 0.9375rem;
  }
  
  .stat-value {
    font-size: 1.125rem;
  }
  
  .stat-label {
    font-size: 0.6875rem;
  }
}
</style>
