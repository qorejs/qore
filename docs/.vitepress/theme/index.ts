import DefaultTheme from 'vitepress/theme'
import './style.css'

// 导入自定义组件
import Hero from '../components/Hero.vue'
import FeatureGrid from '../components/FeatureGrid.vue'
import CodePreview from '../components/CodePreview.vue'
import PerformanceChart from '../components/PerformanceChart.vue'
import CommunityStats from '../components/CommunityStats.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 注册全局组件
    app.component('Hero', Hero)
    app.component('FeatureGrid', FeatureGrid)
    app.component('CodePreview', CodePreview)
    app.component('PerformanceChart', PerformanceChart)
    app.component('CommunityStats', CommunityStats)
  }
}
