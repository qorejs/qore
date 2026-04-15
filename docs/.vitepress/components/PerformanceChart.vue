<script setup lang="ts">
const metrics = [
  {
    name: 'Bundle Size',
    unit: 'KB',
    data: [
      { framework: 'Qore', value: 5, color: 'var(--vp-c-brand)' },
      { framework: 'Solid', value: 8, color: '#2c4f7c' },
      { framework: 'Vue', value: 35, color: '#42b883' },
      { framework: 'React', value: 45, color: '#61dafb' }
    ]
  },
  {
    name: 'Render Time',
    unit: 'ms',
    data: [
      { framework: 'Qore', value: 0.3, color: 'var(--vp-c-brand)' },
      { framework: 'Solid', value: 0.5, color: '#2c4f7c' },
      { framework: 'Vue', value: 2.8, color: '#42b883' },
      { framework: 'React', value: 3.2, color: '#61dafb' }
    ]
  },
  {
    name: 'Memory Usage',
    unit: 'MB',
    data: [
      { framework: 'Qore', value: 2, color: 'var(--vp-c-brand)' },
      { framework: 'Solid', value: 4, color: '#2c4f7c' },
      { framework: 'Vue', value: 12, color: '#42b883' },
      { framework: 'React', value: 15, color: '#61dafb' }
    ]
  },
  {
    name: 'TTFB',
    unit: 'ms',
    data: [
      { framework: 'Qore', value: 5, color: 'var(--vp-c-brand)' },
      { framework: 'Solid', value: 12, color: '#2c4f7c' },
      { framework: 'Vue', value: 25, color: '#42b883' },
      { framework: 'React', value: 30, color: '#61dafb' }
    ]
  }
]

const maxValue = (data: typeof metrics[0]['data']) => {
  return Math.max(...data.map(d => d.value)) * 1.2
}
</script>

<template>
  <section class="performance-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">性能对比</h2>
        <p class="section-desc">测试环境：渲染 10,000 个节点，MacBook Pro M2</p>
      </div>
      
      <div class="charts-grid">
        <div v-for="metric in metrics" :key="metric.name" class="chart-card">
          <h3 class="chart-title">{{ metric.name }}</h3>
          <div class="chart">
            <div 
              v-for="item in metric.data" 
              :key="item.framework"
              class="bar-container"
            >
              <div class="bar-label">{{ item.framework }}</div>
              <div class="bar-wrapper">
                <div 
                  class="bar"
                  :style="{ 
                    width: `${(item.value / maxValue(metric.data)) * 100}%`,
                    background: item.color
                  }"
                >
                  <span class="bar-value">{{ item.value }}{{ metric.unit }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="benchmark-note">
        <p>📊 数据来源：官方基准测试，完整报告请查看 <a href="/performance">性能文档</a></p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.performance-section {
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
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.chart-card {
  background: var(--vp-c-bg);
  padding: 2rem;
  border-radius: 1rem;
  border: 1px solid var(--vp-c-divider);
}

.chart-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--vp-c-text-1);
}

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
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.bar-wrapper {
  flex: 1;
  height: 32px;
  background: var(--vp-c-bg-soft);
  border-radius: 0.5rem;
  overflow: hidden;
}

.bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.75rem;
  border-radius: 0.5rem;
  transition: width 0.5s ease;
  min-width: 60px;
}

.bar-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.benchmark-note {
  margin-top: 3rem;
  text-align: center;
  padding: 1.5rem;
  background: var(--vp-c-bg);
  border-radius: 0.75rem;
  border: 1px solid var(--vp-c-divider);
}

.benchmark-note p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.benchmark-note a {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.benchmark-note a:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 2rem;
  }
}

@media (max-width: 640px) {
  .bar-label {
    width: 60px;
    font-size: 0.8rem;
  }
  
  .bar-value {
    font-size: 0.7rem;
  }
}
</style>
