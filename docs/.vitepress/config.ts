import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Qore',
  description: 'AI Native Frontend Framework - 高性能、轻量级、面向未来',
  base: '/qore/',
  
  head: [
    ['link', { rel: 'icon', href: '/qore/favicon.ico' }],
    ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1' }],
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'zh-CN' }],
    ['meta', { property: 'og:title', content: 'Qore - AI Native Frontend Framework' }],
    ['meta', { property: 'og:description', content: '细粒度响应式 + 流式渲染，为 AI 应用而生' }],
  ],

  themeConfig: {
    logo: '/qore/logo.svg',
    
    // 优化导航栏 - 参考主流框架
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/signal' },
      { text: '示例', link: '/examples/basic' },
      { text: '博客', link: '/blog/' },
      { text: '社区', link: 'https://discord.gg/qore' },
    ],

    // 搜索配置
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    },

    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/core-concepts' },
          ],
        },
        {
          text: '核心特性',
          items: [
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: '组件系统', link: '/guide/components' },
            { text: '流式渲染', link: '/guide/streaming' },
            { text: '服务端渲染', link: '/guide/ssr' },
          ],
        },
        {
          text: 'AI Native',
          items: [
            { text: 'AI 特性概览', link: '/guide/ai-native' },
          ],
        },
      ],
      '/api/': [
        {
          text: '响应式 API',
          items: [
            { text: 'Signal', link: '/api/signal' },
            { text: 'Computed', link: '/api/computed' },
            { text: 'Effect', link: '/api/effect' },
            { text: 'Batch', link: '/api/batch' },
          ],
        },
        {
          text: '组件 API',
          items: [
            { text: 'Component', link: '/api/component' },
            { text: 'Renderer', link: '/api/renderer' },
          ],
        },
        {
          text: 'SSR & Streaming',
          items: [
            { text: 'Streaming', link: '/api/streaming' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '基础示例',
          items: [
            { text: '快速开始', link: '/examples/basic' },
            { text: '计数器', link: '/examples/counter' },
            { text: 'Todo 列表', link: '/examples/todo' },
            { text: 'AI 集成', link: '/examples/ai-integration' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/qore-framework/qore', ariaLabel: 'GitHub' },
      { icon: 'discord', link: 'https://discord.gg/qore', ariaLabel: 'Discord' },
      { icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>' }, link: 'https://x.com/qore_framework', ariaLabel: 'Twitter' },
    ],

    // 页脚优化
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Qore Framework',
    },
    
    // 文档编辑链接
    editLink: {
      pattern: 'https://github.com/qore-framework/qore/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面',
    },
    
    // 上一页/下一页
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    
    // 辅助功能
    outline: {
      label: '本页目录',
    },
    
    // 深色模式
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    
    // 侧边栏菜单
    sidebarMenuLabel: '菜单',
    
    // 返回顶部
    returnToTopLabel: '返回顶部',
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
    config: (md) => {
      // 自定义 markdown 配置
      md.use((md) => {
        // 可以在这里添加 markdown 插件
      })
    }
  },

  // 性能优化
  vite: {
    optimizeDeps: {
      include: ['vue'],
    },
  },

  // 忽略死链检查
  ignoreDeadLinks: true,
  
  // 多语言支持（预留）
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Qore',
      description: 'AI Native Frontend Framework - 高性能、轻量级、面向未来',
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      title: 'Qore',
      description: 'AI Native Frontend Framework - High Performance, Lightweight, Future-Oriented',
    },
  },
  
  // 最后更新时间
  lastUpdated: {
    text: '最后更新时间',
    formatOptions: {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Shanghai',
    },
  },
})
