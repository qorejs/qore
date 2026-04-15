<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stars = ref(0)
const isVisible = ref(false)

const codeLines = [
  `<span class="keyword">import</span> { signal, computed } <span class="keyword">from</span> <span class="string">'qore'</span>`,
  ``,
  `<span class="comment">// AI 生成响应式组件</span>`,
  `<span class="keyword">const</span> App = <span class="function">component</span>(() => {`,
  `  <span class="keyword">const</span> count = <span class="function">signal</span>(<span class="number">0</span>)`,
  `  <span class="keyword">return</span> <span class="tag">&lt;button</span> onClick={() => count.<span class="function">set</span>(count() + <span class="number">1</span>)}<span class="tag">&gt;</span>`,
  `    Count: {count()}`,
  `  <span class="tag">&lt;/button&gt;</span>`,
  `})`,
]

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
    <!-- AI Neural Network Background -->
    <div class="hero-background">
      <div class="neural-network">
        <svg class="neural-svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.3" />
              <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:0.2" />
              <stop offset="100%" style="stop-color:#ec4899;stop-opacity:0.1" />
            </linearGradient>
          </defs>
          <circle class="neural-node" cx="100" cy="100" r="3" />
          <circle class="neural-node" cx="300" cy="150" r="3" />
          <circle class="neural-node" cx="500" cy="80" r="3" />
          <circle class="neural-node" cx="700" cy="200" r="3" />
          <circle class="neural-node" cx="900" cy="120" r="3" />
          <circle class="neural-node" cx="200" cy="300" r="3" />
          <circle class="neural-node" cx="400" cy="350" r="3" />
          <circle class="neural-node" cx="600" cy="280" r="3" />
          <circle class="neural-node" cx="800" cy="320" r="3" />
          <circle class="neural-node" cx="150" cy="500" r="3" />
          <circle class="neural-node" cx="350" cy="450" r="3" />
          <circle class="neural-node" cx="550" cy="480" r="3" />
          <circle class="neural-node" cx="750" cy="420" r="3" />
          <circle class="neural-node" cx="950" cy="500" r="3" />
          
          <line class="neural-line" x1="100" y1="100" x2="300" y2="150" />
          <line class="neural-line" x1="300" y1="150" x2="500" y2="80" />
          <line class="neural-line" x1="500" y1="80" x2="700" y2="200" />
          <line class="neural-line" x1="700" y1="200" x2="900" y2="120" />
          <line class="neural-line" x1="200" y1="300" x2="400" y2="350" />
          <line class="neural-line" x1="400" y1="350" x2="600" y2="280" />
          <line class="neural-line" x1="600" y1="280" x2="800" y2="320" />
          <line class="neural-line" x1="150" y1="500" x2="350" y2="450" />
          <line class="neural-line" x1="350" y1="450" x2="550" y2="480" />
          <line class="neural-line" x1="550" y1="480" x2="750" y2="420" />
          <line class="neural-line" x1="750" y1="420" x2="950" y2="500" />
        </svg>
      </div>
      <div class="cyber-grid"></div>
      <div class="floating-particles">
        <div class="particle" v-for="i in 20" :key="i" :style="`--i: ${i}`"></div>
      </div>
    </div>
    
    <div class="hero-content">
      <!-- AI Badge -->
      <div class="hero-badge" :class="{ 'badge-visible': isVisible }">
        <span class="badge-pulse"></span>
        <span class="badge-icon">🤖</span>
        <span class="badge-text">AI-Native Framework</span>
      </div>
      
      <!-- Main Title -->
      <h1 class="hero-title" :class="{ 'title-visible': isVisible }">
        <div class="title-container">
          <span class="gradient-text glitch" data-text="Qore">Qore</span>
          <span class="ai-cursor">_</span>
        </div>
        <span class="subtitle">
          <span class="subtitle-line">The Core of</span>
          <span class="subtitle-line highlight">AI Era UI</span>
        </span>
      </h1>
      
      <!-- Tagline -->
      <p class="hero-tagline" :class="{ 'tagline-visible': isVisible }">
        <span class="tagline-text">细粒度响应式</span>
        <span class="tagline-separator">⚡</span>
        <span class="tagline-text">流式渲染</span>
        <span class="tagline-separator">🚀</span>
        <span class="tagline-text highlight">为 AI 应用而生</span>
      </p>
      
      <!-- Action Buttons -->
      <div class="hero-actions" :class="{ 'actions-visible': isVisible }">
        <a href="/qore/guide/getting-started.html" class="btn btn-primary btn-cyber">
          <span class="btn-cyber-border"></span>
          <span class="btn-icon">🚀</span>
          <span>快速开始</span>
        </a>
        <a href="/qore/examples/basic.html" class="btn btn-hologram">
          <span class="btn-icon">💡</span>
          <span>查看示例</span>
        </a>
        <a href="https://github.com/qorejs/qore" class="btn btn-ghost btn-neon" target="_blank">
          <span class="btn-icon">⭐</span>
          <span>{{ stars }}+ Stars</span>
        </a>
      </div>
      
      <!-- Stats -->
      <div class="hero-stats" :class="{ 'stats-visible': isVisible }">
        <div class="stat-card" v-for="(stat, i) in stats" :key="i">
          <div class="stat-hologram"></div>
          <span class="stat-icon">{{ stat.icon }}</span>
          <div class="stat-info">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- AI Code Terminal -->
    <div class="hero-code" :class="{ 'code-visible': isVisible }">
      <div class="ai-terminal">
        <div class="terminal-header">
          <div class="terminal-controls">
            <span class="terminal-dot red"></span>
            <span class="terminal-dot yellow"></span>
            <span class="terminal-dot green"></span>
          </div>
          <div class="terminal-title">
            <span class="terminal-icon">🤖</span>
            <span>AI Code Generation</span>
          </div>
          <div class="terminal-status">
            <span class="status-dot"></span>
            <span>Live</span>
          </div>
        </div>
        <div class="terminal-body">
          <div class="code-lines">
            <div class="code-line" v-for="(line, i) in codeLines" :key="i" :style="`--delay: ${i * 0.2}s`">
              <span class="line-number">{{ i + 1 }}</span>
              <span class="line-content" v-html="line"></span>
            </div>
          </div>
          <div class="typing-cursor">_</div>
        </div>
        <div class="terminal-glow"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  padding: 6rem 2rem 4rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  overflow: hidden;
}

/* AI Neural Network Background */
.hero-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.neural-network {
  position: absolute;
  inset: 0;
  opacity: 0.5;
}

.neural-svg {
  width: 100%;
  height: 100%;
}

.neural-node {
  fill: #6366f1;
  animation: neuralPulse 3s ease-in-out infinite;
}

.neural-node:nth-child(odd) {
  animation-delay: 0.5s;
}

.neural-line {
  stroke: url(#neuralGradient);
  stroke-width: 1;
  opacity: 0.3;
  animation: neuralFlow 4s ease-in-out infinite;
}

.cyber-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 20s linear infinite;
}

.floating-particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  left: calc(var(--i) * 5%);
  top: calc(var(--i) * 7%);
  animation: float 8s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.3s);
  opacity: 0.6;
}

/* Hero Content */
.hero-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2rem;
}

/* AI Badge */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #a5b4fc;
  backdrop-filter: blur(10px);
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease;
}

.badge-visible {
  opacity: 1;
  transform: translateY(0);
}

.badge-pulse {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50px;
  z-index: -1;
  animation: pulse 2s ease-in-out infinite;
}

.badge-icon {
  font-size: 1.25rem;
}

/* Hero Title */
.hero-title {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease 0.2s;
}

.title-visible {
  opacity: 1;
  transform: translateY(0);
}

.title-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.gradient-text {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
}

.glitch {
  position: relative;
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #0f0f1a;
}

.glitch::before {
  animation: glitch-1 0.3s infinite;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
  transform: translate(-2px, -2px);
  opacity: 0.8;
}

.glitch::after {
  animation: glitch-2 0.3s infinite;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
  transform: translate(2px, 2px);
  opacity: 0.8;
}

.ai-cursor {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 800;
  color: #6366f1;
  animation: blink 1s step-end infinite;
}

.subtitle {
  display: flex;
  flex-direction: column;
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 600;
  color: #94a3b8;
}

.subtitle-line {
  opacity: 0;
  transform: translateX(-20px);
  animation: slideIn 0.6s ease forwards;
}

.subtitle-line:nth-child(1) {
  animation-delay: 0.4s;
}

.subtitle-line:nth-child(2) {
  animation-delay: 0.6s;
}

.subtitle-line.highlight {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Tagline */
.hero-tagline {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.125rem;
  color: #64748b;
  opacity: 0;
  animation: fadeIn 0.6s ease 0.8s forwards;
}

.tagline-text {
  padding: 0.5rem 1rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.tagline-text.highlight {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border-color: rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
}

.tagline-separator {
  opacity: 0.5;
}

/* Action Buttons */
.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  opacity: 0;
  animation: fadeIn 0.6s ease 1s forwards;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-cyber {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: 2px solid transparent;
}

.btn-cyber-border {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  animation: borderRotate 3s linear infinite;
}

.btn-cyber:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
}

.btn-hologram {
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
  backdrop-filter: blur(10px);
}

.btn-hologram:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.5);
  transform: translateY(-2px);
}

.btn-neon {
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.btn-neon-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(99, 102, 241, 0.2), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-neon:hover .btn-neon-glow {
  opacity: 1;
}

.btn-icon {
  font-size: 1.25rem;
}

/* Stats */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  opacity: 0;
  animation: fadeIn 0.6s ease 1.2s forwards;
}

.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 10px 40px rgba(99, 102, 241, 0.2);
}

.stat-hologram {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent);
  border-radius: 16px;
  animation: hologramShimmer 3s linear infinite;
}

.stat-icon {
  font-size: 2rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
}

/* AI Code Terminal */
.hero-code {
  position: relative;
  z-index: 10;
  opacity: 0;
  animation: fadeIn 0.8s ease 1.4s forwards;
}

.ai-terminal {
  position: relative;
  background: rgba(15, 15, 26, 0.9);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: rgba(99, 102, 241, 0.1);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.terminal-controls {
  display: flex;
  gap: 0.5rem;
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-dot.red {
  background: #ef4444;
}

.terminal-dot.yellow {
  background: #f59e0b;
}

.terminal-dot.green {
  background: #10b981;
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #94a3b8;
}

.terminal-icon {
  font-size: 1rem;
}

.terminal-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #10b981;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.terminal-body {
  position: relative;
  padding: 1.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.7;
}

.code-lines {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.code-line {
  display: flex;
  gap: 1rem;
  opacity: 0;
  animation: typeIn 0.5s ease forwards;
  animation-delay: calc(var(--delay) + 1.6s);
}

.line-number {
  color: #475569;
  user-select: none;
  min-width: 2rem;
  text-align: right;
}

.line-content {
  color: #e2e8f0;
}

.line-content .keyword {
  color: #c084fc;
}

.line-content .function {
  color: #60a5fa;
}

.line-content .string {
  color: #34d399;
}

.line-content .number {
  color: #f472b6;
}

.line-content .comment {
  color: #64748b;
}

.line-content .tag {
  color: #f472b6;
}

.typing-cursor {
  position: absolute;
  bottom: 1.5rem;
  left: 3.5rem;
  color: #6366f1;
  animation: blink 1s step-end infinite;
}

.terminal-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
  animation: glowMove 3s ease-in-out infinite;
}

/* Animations */
@keyframes neuralPulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.5);
  }
}

@keyframes neuralFlow {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes gridMove {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 50px 50px;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-20px) translateX(10px);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

@keyframes glitch-1 {
  0%, 100% {
    transform: translate(-2px, -2px);
  }
  50% {
    transform: translate(2px, 2px);
  }
}

@keyframes glitch-2 {
  0%, 100% {
    transform: translate(2px, 2px);
  }
  50% {
    transform: translate(-2px, -2px);
  }
}

@keyframes borderRotate {
  0% {
    border-color: rgba(255, 255, 255, 0.3);
  }
  50% {
    border-color: rgba(99, 102, 241, 0.6);
  }
  100% {
    border-color: rgba(255, 255, 255, 0.3);
  }
}

@keyframes hologramShimmer {
  0% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 0.3;
  }
}

@keyframes typeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes glowMove {
  0%, 100% {
    opacity: 0.5;
    transform: translateX(-10%);
  }
  50% {
    opacity: 1;
    transform: translateX(10%);
  }
}

/* Responsive */
@media (max-width: 960px) {
  .hero-section {
    grid-template-columns: 1fr;
    padding: 4rem 1.5rem;
  }
  
  .hero-code {
    order: -1;
  }
  
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero-section {
    padding: 3rem 1rem;
  }
  
  .hero-actions {
    flex-direction: column;
  }
  
  .btn {
    justify-content: center;
  }
  
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}
</style>
