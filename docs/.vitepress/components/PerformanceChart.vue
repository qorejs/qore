<script setup lang="ts">
import { ref, onMounted } from 'vue'

const metrics = [
  {
    name: 'Bundle Size',
    unit: 'KB',
    icon: '📦',
    data: [
      { framework: 'Qore', value: 5, color: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
      { framework: 'Solid', value: 8, color: '#2c4f7c' },
      { framework: 'Vue', value: 35, color: '#42b883' },
      { framework: 'React', value: 45, color: '#61dafb' }
    ]
  },
  {
    name: 'Render Time',
    unit: 'ms',
    icon: '⚡',
    data: [
      { framework: 'Qore', value: 0.3, color: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
      { framework: 'Solid', value: 0.5, color: '#2c4f7c' },
      { framework: 'Vue', value: 2.8, color: '#42b883' },
      { framework: 'React', value: 3.2, color: '#61dafb' }
    ]
  },
  {
    name: 'Memory Usage',
    unit: 'MB',
    icon: '💾',
    data: [
      { framework: 'Qore', value: 2, color: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
      { framework: 'Solid', value: 4, color: '#2c4f7c' },
      { framework: 'Vue', value: 12, color: '#42b883' },
      { framework: 'React', value: 15, color: '#61dafb' }
    ]
  },
  {
    name: 'TTFB',
    unit: 'ms',
    icon: '🎯',
    data: [
      { framework: 'Qore', value: 5, color: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
      { framework: 'Solid', value: 12, color: '#2c4f7c' },
      { framework: 'Vue', value: 25, color: '#42b883' },
      { framework: 'React', value: 30, color: '#61dafb' }
    ]
  }
]

const maxValue = (data: typeof metrics[0]['data']) => {
  return Math.max(...data.map(d => d.value)) * 1.2
}

const animatedBars = ref<Record<string, boolean>>({})

onMounted(() => {
  // Animate bars on mount
  metrics.forEach((metric, metricIndex) => {
    metric.data.forEach((item, itemIndex) => {
      setTimeout(() => {
        animatedBars.value[`${metricIndex}-${itemIndex}`] = true
      }, (metricIndex * 4 + itemIndex) * 100 + 300)
    })
  })
})
</script>

<template>
  <section class="performance-section">
    <!-- Background Decoration -->
    <div class="section-background">
      <div class="bg-dot-pattern"></div>
    </div>
    
    <div class="container">
      <!-- Section Header -->
      <div class="section-header">
        <div class="header-badge">
          <span class="badge-icon">📊</span>
          <span>Benchmark Results</span>
        </div>
        <h2 class="section-title">性能对比</h2>
        <p class="section-desc">测试环境：渲染 10,000 个节点，MacBook Pro M2</p>
      </div>
      
      <!-- Charts Grid -->
      <div class="charts-grid">
        <div 
          v-for="(metric, metricIndex) in metrics" 
          :key="metric.name" 
          class="chart-card"
          :class="{ 'card-visible': true }"
          :style="{ transitionDelay: `${metricIndex * 150}ms` }"
        >
          <!-- Card Header -->
          <div class="chart-header">
            <div class="chart-icon">{{ metric.icon }}</div>
            <h3 class="chart-title">{{ metric.name }}</h3>
          </div>
          
          <!-- Chart Bars -->
          <div class="chart">
            <div 
              v-for="(item, itemIndex) in metric.data" 
              :key="item.framework"
              class="bar-container"
            >
              <div class="bar-label">
                <span class="framework-name">{{ item.framework }}</span>
              </div>
              <div class="bar-wrapper">
                <div 
                  class="bar"
                  :class="{ 'bar-animated': animatedBars[`${metricIndex}-${itemIndex}`] }"
                  :style="{ 
                    width: animatedBars[`${metricIndex}-${itemIndex}`] ? `${(item.value / maxValue(metric.data)) * 100}%` : '0',
                    background: item.color
                  }"
                >
                  <span class="bar-value">{{ item.value }}{{ metric.unit }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Card Glow -->
          <div class="card-glow"></div>
        </div>
      </div>
      
      <!-- Benchmark Note -->
      <div class="benchmark-note">
        <div class="note-content">
          <span class="note-icon">📊</span>
          <p>数据来源：官方基准测试，完整报告请查看 <a href="/performance">性能文档</a></p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.performance-section {
  position: relative;
  padding: 6rem 2rem;
  background: var(--vp-c-bg-soft);
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
  max-width: 1400px;
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

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

/* Chart Card */
.chart-card {
  position: relative;
  background: var(--vp-c-bg);
  padding: 2rem;
  border-radius: var(--vp-radius-2xl);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all var(--vp-transition-base);
}

.chart-card.card-visible {
  animation: fadeInUp 0.6s var(--vp-animation-enter) forwards;
}

.chart-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--vp-gradient-subtle);
  opacity: 0;
  transition: opacity var(--vp-transition-base);
}

.chart-card:hover::before {
  opacity: 1;
}

.chart-card:hover {
  transform: translateY(-6px);
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
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--vp-transition-slow);
  pointer-events: none;
}

.chart-card:hover .card-glow {
  opacity: 1;
}

/* Chart Header */
.chart-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.chart-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-gradient-subtle);
  border-radius: var(--vp-radius-lg);
  font-size: 1.25rem;
}

.chart-title {
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
  margin: 0;
  color: var(--vp-c-text-1);
  letter-spacing: var(--tracking-tight);
}

/* Chart */
.chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bar-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bar-label {
  width: 80px;
  flex-shrink: 0;
}

.framework-name {
  font-size: 0.8125rem;
  font-weight: var(--font-weight-medium);
  color: var(--vp-c-text-2);
}

.bar-wrapper {
  flex: 1;
  height: 40px;
  background: var(--vp-c-bg-alt);
  border-radius: var(--vp-radius-lg);
  overflow: hidden;
  position: relative;
}

.bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.75rem;
  border-radius: var(--vp-radius-lg);
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 60px;
  position: relative;
  overflow: hidden;
}

.bar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(255, 255, 255, 0.1), transparent);
}

.bar-value {
  position: relative;
  font-size: 0.8125rem;
  font-weight: var(--font-weight-semibold);
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  z-index: 1;
}

/* Benchmark Note */
.benchmark-note {
  margin-top: 3rem;
  display: flex;
  justify-content: center;
}

.note-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 2rem;
  background: var(--vp-c-bg);
  border-radius: var(--vp-radius-xl);
  border: 1px solid var(--vp-c-divider);
}

.note-icon {
  font-size: 1.25rem;
}

.note-content p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  line-height: var(--line-height-normal);
}

.note-content a {
  color: var(--vp-c-brand);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  transition: color var(--vp-transition-fast);
}

.note-content a:hover {
  color: var(--vp-c-brand-dark);
  text-decoration: underline;
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
  .charts-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .chart-card {
    padding: 1.5rem;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .performance-section {
    padding: 4rem 1.5rem;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .section-desc {
    font-size: 1rem;
  }
  
  .chart-card {
    padding: 1.25rem;
  }
  
  .chart-header {
    margin-bottom: 1.25rem;
  }
  
  .chart-icon {
    width: 36px;
    height: 36px;
    font-size: 1.125rem;
  }
  
  .chart-title {
    font-size: 1rem;
  }
  
  .chart {
    gap: 0.875rem;
  }
  
  .bar-container {
    gap: 0.75rem;
  }
  
  .bar-label {
    width: 70px;
  }
  
  .framework-name {
    font-size: 0.75rem;
  }
  
  .bar-wrapper {
    height: 36px;
  }
  
  .bar {
    min-width: 50px;
    padding-right: 0.5rem;
  }
  
  .bar-value {
    font-size: 0.75rem;
  }
  
  .benchmark-note {
    margin-top: 2.5rem;
  }
  
  .note-content {
    padding: 1rem 1.5rem;
  }
  
  .note-content p {
    font-size: 0.8125rem;
  }
}

/* Small Mobile */
@media (max-width: 640px) {
  .performance-section {
    padding: 3rem 1rem;
  }
  
  .section-header {
    margin-bottom: 2.5rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .section-desc {
    font-size: 0.875rem;
  }
  
  .header-badge {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .charts-grid {
    gap: 1rem;
  }
  
  .chart-card {
    padding: 1rem;
    border-radius: var(--vp-radius-xl);
  }
  
  .chart-header {
    margin-bottom: 1rem;
  }
  
  .chart-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .chart-title {
    font-size: 0.9375rem;
  }
  
  .chart {
    gap: 0.75rem;
  }
  
  .bar-container {
    gap: 0.5rem;
  }
  
  .bar-label {
    width: 60px;
  }
  
  .framework-name {
    font-size: 0.6875rem;
  }
  
  .bar-wrapper {
    height: 32px;
  }
  
  .bar {
    min-width: 45px;
    padding-right: 0.375rem;
  }
  
  .bar-value {
    font-size: 0.6875rem;
  }
  
  .benchmark-note {
    margin-top: 2rem;
  }
  
  .note-content {
    padding: 0.875rem 1.25rem;
  }
  
  .note-content p {
    font-size: 0.75rem;
  }
}

/* Very Small Mobile */
@media (max-width: 400px) {
  .bar-label {
    width: 50px;
  }
  
  .framework-name {
    font-size: 0.625rem;
  }
  
  .bar-wrapper {
    height: 28px;
  }
  
  .bar-value {
    font-size: 0.625rem;
  }
}
</style>
