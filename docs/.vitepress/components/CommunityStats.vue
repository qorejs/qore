<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  stars: 1250,
  downloads: 15000,
  discord: 800,
  contributors: 45
})

// 模拟动态增长效果
onMounted(() => {
  const targetStats = {
    stars: 1250,
    downloads: 15420,
    discord: 856,
    contributors: 48
  }
  
  const duration = 2000
  const steps = 60
  const interval = duration / steps
  
  let current = 0
  const timer = setInterval(() => {
    current++
    const progress = current / steps
    const ease = 1 - Math.pow(1 - progress, 3) // easeOutCubic
    
    stats.value = {
      stars: Math.round(targetStats.stars * ease),
      downloads: Math.round(targetStats.downloads * ease),
      discord: Math.round(targetStats.discord * ease),
      contributors: Math.round(targetStats.contributors * ease)
    }
    
    if (current >= steps) {
      clearInterval(timer)
      stats.value = targetStats
    }
  }, interval)
})

const statItems = [
  { 
    key: 'stars', 
    label: 'GitHub Stars', 
    icon: '⭐',
    suffix: '+'
  },
  { 
    key: 'downloads', 
    label: '周下载量', 
    icon: '📦',
    suffix: '+'
  },
  { 
    key: 'discord', 
    label: 'Discord 成员', 
    icon: '💬',
    suffix: '+'
  },
  { 
    key: 'contributors', 
    label: '贡献者', 
    icon: '👥',
    suffix: ''
  }
]

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}
</script>

<template>
  <section class="community-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">加入社区</h2>
        <p class="section-desc">与全球开发者一起构建未来</p>
      </div>
      
      <div class="stats-grid">
        <div v-for="item in statItems" :key="item.key" class="stat-card">
          <div class="stat-icon">{{ item.icon }}</div>
          <div class="stat-value">
            {{ formatNumber(stats[item.key as keyof typeof stats]) }}{{ item.suffix }}
          </div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </div>
      
      <div class="community-actions">
        <a href="https://github.com/qore-framework/qore" class="action-btn" target="_blank">
          <span class="btn-icon">🐙</span>
          <span>Star on GitHub</span>
        </a>
        <a href="https://discord.gg/qore" class="action-btn" target="_blank">
          <span class="btn-icon">💬</span>
          <span>Join Discord</span>
        </a>
        <a href="/guide/contributing" class="action-btn">
          <span class="btn-icon">🤝</span>
          <span>成为贡献者</span>
        </a>
      </div>
      
      <div class="testimonials">
        <div class="testimonial-card">
          <p class="quote">"Qore 的响应式系统设计得太棒了，性能比 React 快了一个数量级！"</p>
          <div class="author">
            <span class="author-name">张开发者</span>
            <span class="author-title">前端架构师 @ 某科技公司</span>
          </div>
        </div>
        <div class="testimonial-card">
          <p class="quote">"AI-Native 特性让开发效率提升了太多，代码生成和优化都很实用。"</p>
          <div class="author">
            <span class="author-name">李工程师</span>
            <span class="author-title">全栈开发者</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.community-section {
  padding: 6rem 2rem;
  background: var(--vp-c-bg);
}

.container {
  max-width: 1200px;
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
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
}

.stat-card {
  text-align: center;
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 1rem;
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand);
  box-shadow: 0 12px 32px var(--vp-c-brand-soft);
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--vp-c-brand);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.community-actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 4rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 1.25rem;
}

.testimonials {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.testimonial-card {
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 1rem;
  border-left: 4px solid var(--vp-c-brand);
}

.quote {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  margin-bottom: 1.5rem;
  font-style: italic;
}

.author {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.author-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.author-title {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .testimonials {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 2rem;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1.5rem;
  }
  
  .stat-value {
    font-size: 2rem;
  }
  
  .community-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-btn {
    justify-content: center;
  }
}
</style>
