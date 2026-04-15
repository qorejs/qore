<script setup lang="ts">
const features = [
  {
    icon: '⚡',
    title: '细粒度响应式',
    description: '基于 Signal 的响应式系统，精确追踪依赖，零虚拟 DOM 开销',
    link: '/guide/reactivity'
  },
  {
    icon: '🌊',
    title: '流式渲染',
    description: '原生支持 Streaming SSR，首屏加载速度提升 10 倍',
    link: '/guide/streaming'
  },
  {
    icon: '🤖',
    title: 'AI-Native',
    description: '内置 AI 代码生成、性能优化和智能调试',
    link: '/guide/ai-native'
  },
  {
    icon: '🔥',
    title: 'SSR 支持',
    description: '完整的服务端渲染方案，SEO 友好，首屏即达',
    link: '/guide/ssr'
  },
  {
    icon: '📦',
    title: '虚拟化列表',
    description: '内置虚拟滚动，轻松渲染百万级数据',
    link: '/api/virtual-list'
  },
  {
    icon: '📘',
    title: 'TypeScript 优先',
    description: '完整的类型推导，开发体验一流',
    link: '/guide/typescript'
  }
]
</script>

<template>
  <section class="features-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">核心特性</h2>
        <p class="section-desc">为 AI 时代打造的高性能前端框架</p>
      </div>
      
      <div class="features-grid">
        <a 
          v-for="feature in features" 
          :key="feature.title"
          :href="feature.link"
          class="feature-card"
        >
          <div class="feature-icon">{{ feature.icon }}</div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-desc">{{ feature.description }}</p>
          <div class="feature-link">
            <span>了解更多</span>
            <span class="arrow">→</span>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features-section {
  padding: 6rem 2rem;
  background: var(--vp-c-bg-soft);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
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
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background: var(--vp-c-bg);
  border-radius: 1rem;
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand);
  box-shadow: 0 12px 32px var(--vp-c-brand-soft);
}

.feature-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.feature-desc {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  flex: 1;
}

.feature-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--vp-c-brand);
  font-weight: 500;
  font-size: 0.9rem;
  margin-top: auto;
}

.feature-link .arrow {
  transition: transform 0.2s ease;
}

.feature-card:hover .feature-link .arrow {
  transform: translateX(4px);
}

@media (max-width: 960px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .section-title {
    font-size: 2rem;
  }
}

@media (max-width: 640px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .features-section {
    padding: 4rem 1.5rem;
  }
}
</style>
