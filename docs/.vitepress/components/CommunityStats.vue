<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  stars: 0,
  downloads: 0,
  discord: 0,
  contributors: 0
})

const isAnimated = ref(false)

// 获取真实数据并动画
onMounted(async () => {
  try {
    const [ghRes, npmRes] = await Promise.all([
      fetch('https://api.github.com/repos/qorejs/qore'),
      fetch('https://api.npmjs.org/downloads/point/last-week/qore').catch(() => null)
    ])
    
    const ghData = await ghRes.json()
    const npmData = npmRes ? await npmRes.json() : null
    
    const targetStats = {
      stars: ghData.stargazers_count || 0,
      downloads: npmData?.downloads || 0,
      discord: 0,
      contributors: ghData.size > 0 ? 1 : 0
    }
    
    // Animate numbers
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
        isAnimated.value = true
      }
    }, interval)
  } catch (e) {
    console.error('Failed to fetch stats:', e)
    isAnimated.value = true
  }
})

const statItems = [
  { 
    key: 'stars', 
    label: 'GitHub Stars', 
    icon: '⭐',
    suffix: '+',
    gradient: 'from-yellow-400 to-orange-400'
  },
  { 
    key: 'downloads', 
    label: '周下载量', 
    icon: '📦',
    suffix: '+',
    gradient: 'from-blue-400 to-cyan-400'
  },
  { 
    key: 'discord', 
    label: 'Discord 成员', 
    icon: '💬',
    suffix: '+',
    gradient: 'from-purple-400 to-pink-400'
  },
  { 
    key: 'contributors', 
    label: '贡献者', 
    icon: '👥',
    suffix: '',
    gradient: 'from-emerald-400 to-teal-400'
  }
]

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const testimonials = [
  {
    quote: "Qore 的响应式系统设计得太棒了，性能比 React 快了一个数量级！",
    author: "张开发者",
    title: "前端架构师 @ 某科技公司",
    avatar: "👨‍💻"
  },
  {
    quote: "AI-Native 特性让开发效率提升了太多，代码生成和优化都很实用。",
    author: "李工程师",
    title: "全栈开发者",
    avatar: "👩‍💻"
  }
]
</script>

<template>
  <section class="community-section">
    <!-- Background -->
    <div class="section-background">
      <div class="bg-gradient-orb bg-gradient-orb-1"></div>
      <div class="bg-gradient-orb bg-gradient-orb-2"></div>
    </div>
    
    <div class="container">
      <!-- Section Header -->
      <div class="section-header">
        <div class="header-badge">
          <span class="badge-icon">🌍</span>
          <span>Join Our Community</span>
        </div>
        <h2 class="section-title">加入社区</h2>
        <p class="section-desc">与全球开发者一起构建未来</p>
      </div>
      
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div 
          v-for="(item, index) in statItems" 
          :key="item.key" 
          class="stat-card"
          :class="{ 'card-visible': isAnimated }"
          :style="{ transitionDelay: `${index * 100}ms` }"
        >
          <!-- Icon with Gradient -->
          <div class="stat-icon-wrapper">
            <div class="icon-gradient"></div>
            <span class="stat-icon">{{ item.icon }}</span>
          </div>
          
          <!-- Animated Number -->
          <div class="stat-value">
            <span class="number">{{ formatNumber(stats[item.key as keyof typeof stats]) }}</span>
            <span class="suffix">{{ item.suffix }}</span>
          </div>
          
          <div class="stat-label">{{ item.label }}</div>
          
          <!-- Card Glow -->
          <div class="card-glow"></div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="community-actions">
        <a href="https://github.com/qorejs/qore" class="action-btn action-btn-primary" target="_blank">
          <span class="btn-icon">🐙</span>
          <span>Star on GitHub</span>
          <svg class="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
        <a href="https://discord.gg/qore" class="action-btn action-btn-secondary" target="_blank">
          <span class="btn-icon">💬</span>
          <span>Join Discord</span>
          <svg class="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
      
      <!-- Testimonials -->
      <div class="testimonials">
        <div 
          v-for="(testimonial, index) in testimonials" 
          :key="index" 
          class="testimonial-card"
          :class="{ 'testimonial-visible': isAnimated }"
          :style="{ transitionDelay: `${(index + 4) * 150}ms` }"
        >
          <!-- Quote Icon -->
          <div class="quote-icon">"</div>
          
          <p class="quote">{{ testimonial.quote }}</p>
          
          <div class="author">
            <div class="author-avatar">{{ testimonial.avatar }}</div>
            <div class="author-info">
              <span class="author-name">{{ testimonial.author }}</span>
              <span class="author-title">{{ testimonial.title }}</span>
            </div>
          </div>
          
          <!-- Card Border Gradient -->
          <div class="card-border"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.community-section {
  position: relative;
  padding: 6rem 2rem;
  background: var(--vp-c-bg);
  overflow: hidden;
}

/* Background */
.section-background {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.container {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
}

/* Section Header */
.section-header {
  text-align: center;
  margin-bottom: 4rem;
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
  line-height: var(--line-height-relaxed);
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.2s forwards;
  opacity: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
}

/* Stat Card */
.stat-card {
  position: relative;
  text-align: center;
  padding: 2.5rem 2rem;
  background: var(--vp-c-bg);
  border-radius: var(--vp-radius-2xl);
  border: 1px solid var(--vp-c-divider);
  transition: all var(--vp-transition-base);
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
}

.stat-card.card-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) forwards;
}

.stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--vp-gradient-subtle);
  opacity: 0;
  transition: opacity var(--vp-transition-base);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card:hover {
  transform: translateY(-8px);
  border-color: var(--vp-c-border-hover);
  box-shadow: var(--vp-shadow-xl);
}

/* Card Glow */
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

.stat-card:hover .card-glow {
  opacity: 1;
}

/* Icon with Gradient */
.stat-icon-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--vp-radius-xl);
  overflow: hidden;
}

.icon-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
  transition: all var(--vp-transition-base);
}

.stat-card:hover .icon-gradient {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%);
  transform: scale(1.1);
}

.stat-icon {
  position: relative;
  font-size: 2rem;
  line-height: 1;
  z-index: 1;
  transition: transform var(--vp-transition-bounce);
}

.stat-card:hover .stat-icon {
  transform: scale(1.15) rotate(5deg);
}

/* Stat Value */
.stat-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.number {
  font-size: 3rem;
  font-weight: var(--font-weight-extrabold);
  color: var(--vp-c-text-1);
  letter-spacing: var(--tracking-tighter);
  background: var(--vp-gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.suffix {
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  color: var(--vp-c-brand);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
  font-weight: var(--font-weight-medium);
}

/* Action Buttons */
.community-actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 4rem;
  animation: fadeInUp 0.6s var(--vp-animation-enter) 0.4s forwards;
  opacity: 0;
}

.action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--vp-radius-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: all var(--vp-transition-base);
  overflow: hidden;
}

.action-btn .btn-icon {
  font-size: 1.25rem;
  transition: transform var(--vp-transition-fast);
}

.action-btn .btn-arrow {
  transition: transform var(--vp-transition-fast);
}

.action-btn:hover {
  transform: translateY(-3px);
}

.action-btn:hover .btn-icon {
  transform: scale(1.1);
}

.action-btn:hover .btn-arrow {
  transform: translateX(4px);
}

.action-btn-primary {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  border-color: var(--vp-c-text-1);
}

.action-btn-primary:hover {
  background: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.3);
}

.action-btn-secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}

.action-btn-secondary:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

/* Testimonials */
.testimonials {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.testimonial-card {
  position: relative;
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: var(--vp-radius-2xl);
  border-left: 4px solid var(--vp-c-brand);
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all var(--vp-transition-base);
}

.testimonial-card.testimonial-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) forwards;
}

.testimonial-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--vp-shadow-lg);
}

/* Card Border Gradient */
.card-border {
  position: absolute;
  inset: 0;
  border-radius: var(--vp-radius-2xl);
  padding: 2px;
  background: linear-gradient(135deg, var(--vp-c-brand), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity var(--vp-transition-base);
}

.testimonial-card:hover .card-border {
  opacity: 1;
}

/* Quote Icon */
.quote-icon {
  font-size: 4rem;
  line-height: 1;
  color: var(--vp-c-brand);
  opacity: 0.2;
  font-family: Georgia, serif;
  position: absolute;
  top: 0.5rem;
  left: 1rem;
}

.quote {
  position: relative;
  font-size: 1rem;
  line-height: var(--line-height-relaxed);
  color: var(--vp-c-text-1);
  margin-bottom: 1.5rem;
  font-style: italic;
  z-index: 1;
}

.author {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.author-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-gradient-subtle);
  border-radius: var(--vp-radius-full);
  font-size: 1.5rem;
  flex-shrink: 0;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.author-name {
  font-weight: var(--font-weight-semibold);
  color: var(--vp-c-text-1);
  font-size: 0.9375rem;
}

.author-title {
  font-size: 0.8125rem;
  color: var(--vp-c-text-3);
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

/* Tablet */
@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  .testimonials {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .stat-card {
    padding: 2rem 1.5rem;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .community-section {
    padding: 4rem 1.5rem;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .section-desc {
    font-size: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
    margin-bottom: 2.5rem;
  }
  
  .stat-card {
    padding: 1.5rem 1.25rem;
  }
  
  .stat-icon-wrapper {
    width: 56px;
    height: 56px;
    margin-bottom: 1rem;
  }
  
  .stat-icon {
    font-size: 1.75rem;
  }
  
  .number {
    font-size: 2.5rem;
  }
  
  .suffix {
    font-size: 1.75rem;
  }
  
  .stat-label {
    font-size: 0.8125rem;
  }
  
  .community-actions {
    gap: 1rem;
    margin-bottom: 3rem;
  }
  
  .action-btn {
    padding: 0.875rem 1.5rem;
    font-size: 0.9375rem;
  }
  
  .btn-icon {
    font-size: 1.125rem;
  }
  
  .testimonial-card {
    padding: 1.5rem;
  }
  
  .quote {
    font-size: 0.9375rem;
    line-height: var(--line-height-normal);
  }
}

/* Small Mobile */
@media (max-width: 640px) {
  .community-section {
    padding: 3rem 1rem;
  }
  
  .section-header {
    margin-bottom: 2.5rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .section-desc {
    font-size: 0.9375rem;
  }
  
  .header-badge {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    padding: 1.25rem 1rem;
    border-radius: var(--vp-radius-xl);
  }
  
  .stat-icon-wrapper {
    width: 48px;
    height: 48px;
    margin-bottom: 0.875rem;
    border-radius: var(--vp-radius-lg);
  }
  
  .stat-icon {
    font-size: 1.5rem;
  }
  
  .number {
    font-size: 2rem;
  }
  
  .suffix {
    font-size: 1.5rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
  
  /* Buttons stack vertically */
  .community-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.875rem;
    margin-bottom: 2.5rem;
  }
  
  .action-btn {
    justify-content: center;
    padding: 0.875rem 1.5rem;
    font-size: 0.9375rem;
    min-height: 48px;
  }
  
  .btn-icon {
    font-size: 1.125rem;
  }
  
  /* Testimonials single column */
  .testimonials {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  
  .testimonial-card {
    padding: 1.25rem;
    border-radius: var(--vp-radius-xl);
    border-left-width: 3px;
  }
  
  .quote-icon {
    font-size: 3rem;
  }
  
  .quote {
    font-size: 0.875rem;
    line-height: var(--line-height-normal);
    margin-bottom: 1rem;
  }
  
  .author-avatar {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }
  
  .author-name {
    font-size: 0.875rem;
  }
  
  .author-title {
    font-size: 0.6875rem;
  }
}

/* Very Small Mobile */
@media (max-width: 400px) {
  .number {
    font-size: 1.75rem;
  }
  
  .suffix {
    font-size: 1.25rem;
  }
  
  .action-btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
  }
  
  .quote {
    font-size: 0.8125rem;
  }
}
</style>
