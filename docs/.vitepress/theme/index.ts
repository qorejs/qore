import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'

// Import components
import Hero from '../components/Hero.vue'
import FeatureGrid from '../components/FeatureGrid.vue'
import CodePreview from '../components/CodePreview.vue'
import PerformanceChart from '../components/PerformanceChart.vue'
import CommunityStats from '../components/CommunityStats.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // Register global components
    app.component('Hero', Hero)
    app.component('FeatureGrid', FeatureGrid)
    app.component('CodePreview', CodePreview)
    app.component('PerformanceChart', PerformanceChart)
    app.component('CommunityStats', CommunityStats)
  },
  setup() {
    // Initialize global effects only on client side
    if (typeof window !== 'undefined') {
      // Wait for DOM to be ready
      requestAnimationFrame(() => {
        initScrollProgress()
        initBackToTop()
        initScrollAnimations()
        initCursorEffect()
      })
    }
  }
} as Theme

/**
 * Scroll Progress Bar
 */
function initScrollProgress() {
  if (!document.body) return
  
  const progressBar = document.createElement('div')
  progressBar.className = 'scroll-progress'
  document.body.appendChild(progressBar)

  const updateProgress = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = docHeight > 0 ? scrollTop / docHeight : 0
    progressBar.style.transform = `scaleX(${Math.min(progress, 1)})`
  }

  window.addEventListener('scroll', updateProgress, { passive: true })
  updateProgress()
}

/**
 * Back to Top Button
 */
function initBackToTop() {
  if (!document.body) return
  
  const btn = document.createElement('button')
  btn.className = 'back-to-top'
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  `
  btn.setAttribute('aria-label', 'Back to top')
  document.body.appendChild(btn)

  const toggleVisibility = () => {
    if (window.scrollY > 500) {
      btn.classList.add('visible')
    } else {
      btn.classList.remove('visible')
    }
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  window.addEventListener('scroll', toggleVisibility, { passive: true })
  btn.addEventListener('click', scrollToTop)
  toggleVisibility()
}

/**
 * Scroll-triggered Animations with Intersection Observer
 */
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in')
        observer.unobserve(entry.target)
      }
    })
  }, observerOptions)

  // Observe elements with data-animate attribute
  const animateElements = document.querySelectorAll('[data-animate]')
  animateElements.forEach((el) => {
    observer.observe(el)
  })
}

/**
 * Subtle Cursor Follow Effect (optional, performance-friendly)
 */
function initCursorEffect() {
  // Only enable on desktop with reduced motion preference not set
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Add cursor glow effect on interactive elements
  const interactiveElements = document.querySelectorAll('a, button, .feature-card, .stat-card, .chart-card')
  
  interactiveElements.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      el.style.setProperty('--mouse-x', `${x}px`)
      el.style.setProperty('--mouse-y', `${y}px`)
    })
  })
}

// Add CSS for cursor effect (only on client side)
if (typeof document !== 'undefined') {
  const cursorStyles = document.createElement('style')
  cursorStyles.textContent = `
    .feature-card, .stat-card, .chart-card, a, button {
      --mouse-x: 50%;
      --mouse-y: 50%;
    }
    
    .feature-card::after, .stat-card::after, .chart-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(
        400px circle at var(--mouse-x) var(--mouse-y),
        rgba(99, 102, 241, 0.06),
        transparent 40%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      border-radius: inherit;
    }
    
    .feature-card:hover::after, .stat-card:hover::after, .chart-card:hover::after {
      opacity: 1;
    }
    
    /* Animate In Class */
    [data-animate] {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    [data-animate].animate-in {
      opacity: 1;
      transform: translateY(0);
    }
  `
  document.head.appendChild(cursorStyles)
}
