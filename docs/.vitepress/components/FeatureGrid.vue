<script setup lang="ts">
import { ref, onMounted } from 'vue'

const features = [
  {
    icon: '⚡',
    title: '细粒度响应式',
    description: '基于 Signal 的响应式系统，精确追踪依赖，零虚拟 DOM 开销',
    link: '/guide/reactivity',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    icon: '🌊',
    title: '流式渲染',
    description: '原生支持 Streaming SSR，首屏加载速度提升 10 倍',
    link: '/guide/streaming',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    icon: '🤖',
    title: 'AI-Native',
    description: '内置 AI 代码生成、性能优化和智能调试',
    link: '/guide/ai-native',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: '🔥',
    title: 'SSR 支持',
    description: '完整的服务端渲染方案，SEO 友好，首屏即达',
    link: '/guide/ssr',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: '📦',
    title: '虚拟化列表',
    description: '内置虚拟滚动，轻松渲染百万级数据',
    link: '/api/virtual-list',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    icon: '📘',
    title: 'TypeScript 优先',
    description: '完整的类型推导，开发体验一流',
    link: '/guide/typescript',
    color: 'from-blue-500 to-indigo-500'
  }
]

const visibleFeatures = ref<number[]>([])

onMounted(() => {
  // Stagger animation for features
  features.forEach((_, index) => {
    setTimeout(() => {
      visibleFeatures.value.push(index)
    }, index * 100)
  })
})
</script>

<template>
  <section class="features-section">
    <div class="container">
      <!-- Section Header -->
      <div class="section-header">
        <div class="header-badge">
          <span class="badge-icon">✨</span>
          <span>Powerful Features</span>
        </div>
        <h2 class="section-title">核心特性</h2>
        <p class="section-desc">为 AI 时代打造的高性能前端框架</p>
      </div>
      
      <!-- Features Grid -->
      <div class="features-grid">
        <a 
          v-for="(feature, index) in features" 
          :key="feature.title"
          :href="feature.link"
          class="feature-card"
          :class="{ 'card-visible': visibleFeatures.includes(index) }"
          :style="{ transitionDelay: `${index * 80}ms` }"
        >
          <!-- Icon with Gradient Background -->
          <div class="feature-icon-wrapper">
            <div class="feature-icon-bg"></div>
            <span class="feature-icon">{{ feature.icon }}</span>
          </div>
          
          <!-- Content -->
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-desc">{{ feature.description }}</p>
          
          <!-- Learn More Link -->
          <div class="feature-link">
            <span>了解更多</span>
            <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          
          <!-- Hover Glow Effect -->
          <div class="card-glow"></div>
        </a>
      </div>
      
      <!-- Bottom CTA -->
      <div class="features-cta">
        <a href="/guide/introduction" class="cta-link">
          <span>探索所有特性</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features-section {
  position: relative;
  padding: 6rem 2rem;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}

/* Background Pattern */
.features-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(168, 85, 247, 0.08) 0px, transparent 50%),
    radial-gradient(at 20% 80%, rgba(236, 72, 153, 0.08) 0px, transparent 50%);
  pointer-events: none;
}

.container {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
}

/* Section Header */
.section-header {
  text-align: center;
  margin-bottom: 5rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--vp-radius-full);
  font-size: 0.8125rem;
  font-weight: var(--font-weight-medium);
  color: var(--vp-c-brand);
  margin-bottom: 1.5rem;
  animation: fadeInDown 0.6s var(--vp-animation-enter);
}

.badge-icon {
  font-size: 1rem;
  animation: sparkle 2s ease-in-out infinite;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: var(--font-weight-bold);
  margin-bottom: 1rem;
  color: var(--vp-c-text-1);
  letter-spacing: var(--tracking-tight);
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.1s forwards;
  opacity: 0;
}

.section-desc {
  font-size: 1.125rem;
  color: var(--vp-c-text-2);
  max-width: 600px;
  margin: 0 auto;
  line-height: var(--line-height-relaxed);
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.2s forwards;
  opacity: 0;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

/* Feature Card */
.feature-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem;
  background: var(--vp-c-bg);
  border-radius: var(--vp-radius-2xl);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  transition: all var(--vp-transition-base);
  cursor: pointer;
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
}

.feature-card.card-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) forwards;
}

.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--vp-gradient-subtle);
  opacity: 0;
  transition: opacity var(--vp-transition-base);
}

.feature-card:hover::before {
  opacity: 1;
}

/* Card Glow Effect */
.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--vp-transition-slow);
  pointer-events: none;
}

.feature-card:hover .card-glow {
  opacity: 1;
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: var(--vp-c-border-hover);
  box-shadow: var(--vp-shadow-xl);
}

/* Icon with Gradient Background */
.feature-icon-wrapper {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--vp-radius-xl);
  overflow: hidden;
  flex-shrink: 0;
}

.feature-icon-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
  transition: all var(--vp-transition-base);
}

.feature-card:hover .feature-icon-bg {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%);
  transform: scale(1.1);
}

.feature-icon {
  position: relative;
  font-size: 1.75rem;
  line-height: 1;
  z-index: 1;
  transition: transform var(--vp-transition-bounce);
}

.feature-card:hover .feature-icon {
  transform: scale(1.15) rotate(5deg);
}

/* Feature Title */
.feature-title {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: var(--vp-c-text-1);
  margin: 0;
  letter-spacing: var(--tracking-tight);
}

/* Feature Description */
.feature-desc {
  font-size: 0.9375rem;
  color: var(--vp-c-text-2);
  line-height: var(--line-height-relaxed);
  flex: 1;
}

/* Feature Link */
.feature-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--vp-c-brand);
  font-weight: var(--font-weight-semibold);
  font-size: 0.875rem;
  margin-top: auto;
  transition: gap var(--vp-transition-fast);
}

.feature-link .arrow {
  transition: transform var(--vp-transition-fast);
}

.feature-card:hover .feature-link {
  gap: 0.75rem;
}

.feature-card:hover .feature-link .arrow {
  transform: translateX(4px);
}

/* Bottom CTA */
.features-cta {
  text-align: center;
  margin-top: 4rem;
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.6s forwards;
  opacity: 0;
}

.cta-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  color: var(--vp-c-brand);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--vp-radius-lg);
  transition: all var(--vp-transition-base);
}

.cta-link:hover {
  background: var(--vp-c-brand-tint);
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
}

.cta-link svg {
  transition: transform var(--vp-transition-fast);
}

.cta-link:hover svg {
  transform: translateX(4px);
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

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(10deg); }
}

/* Tablet */
@media (max-width: 960px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .feature-card {
    padding: 1.5rem;
  }
}

/* Mobile (768px) */
@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
  
  .features-section {
    padding: 4rem 1.5rem;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .section-desc {
    font-size: 1rem;
  }
  
  .feature-icon-wrapper {
    width: 48px;
    height: 48px;
  }
  
  .feature-icon {
    font-size: 1.5rem;
  }
  
  .feature-title {
    font-size: 1.125rem;
  }
  
  .feature-desc {
    font-size: 0.875rem;
  }
}

/* Small Mobile (640px) */
@media (max-width: 640px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .features-section {
    padding: 3rem 1rem;
  }
  
  .section-header {
    margin-bottom: 2.5rem;
  }
  
  .header-badge {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .section-title {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  .section-desc {
    font-size: 0.9375rem;
  }
  
  .feature-card {
    padding: 1.25rem;
    gap: 1rem;
    border-radius: var(--vp-radius-xl);
  }
  
  .feature-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: var(--vp-radius-lg);
  }
  
  .feature-icon {
    font-size: 1.375rem;
  }
  
  .feature-title {
    font-size: 1rem;
  }
  
  .feature-desc {
    font-size: 0.8125rem;
    line-height: var(--line-height-normal);
  }
  
  .feature-link {
    font-size: 0.8125rem;
  }
  
  .features-cta {
    margin-top: 2.5rem;
  }
  
  .cta-link {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
  }
}

/* Very Small Mobile (400px) */
@media (max-width: 400px) {
  .features-grid {
    gap: 0.75rem;
  }
  
  .feature-card {
    padding: 1rem;
  }
  
  .feature-icon-wrapper {
    width: 40px;
    height: 40px;
  }
  
  .feature-icon {
    font-size: 1.25rem;
  }
  
  .feature-title {
    font-size: 0.9375rem;
  }
  
  .feature-desc {
    font-size: 0.75rem;
  }
}
</style>
