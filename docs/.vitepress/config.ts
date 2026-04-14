import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Qore',
  description: 'AI Native Frontend Framework - 高性能、轻量级、面向未来',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/signal' },
      { text: '示例', link: '/examples/basic' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/core-concepts' },
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: '组件系统', link: '/guide/components' },
            { text: 'AI Native 特性', link: '/guide/ai-native' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'Signal', link: '/api/signal' },
            { text: 'Computed', link: '/api/computed' },
            { text: 'Effect', link: '/api/effect' },
            { text: 'Batch', link: '/api/batch' },
            { text: 'Component', link: '/api/component' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '基础示例', link: '/examples/basic' },
            { text: '计数器', link: '/examples/counter' },
            { text: 'Todo 列表', link: '/examples/todo' },
            { text: 'AI 集成', link: '/examples/ai-integration' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/qore-framework/qore' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Qore Framework',
    },
  },

  markdown: {
    theme: 'github-dark',
    lineNumbers: true,
  },
})
