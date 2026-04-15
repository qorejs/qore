# Qore 官网部署指南

本文档说明如何部署 Qore 官网到 GitHub Pages。

## 📋 前置要求

- Node.js 18+
- pnpm 9+
- GitHub 账号
- Qore 仓库的写入权限

## 🚀 快速部署

### 1. 启用 GitHub Pages

1. 访问 GitHub 仓库：https://github.com/qore-framework/qore
2. 进入 **Settings** → **Pages**
3. 在 **Build and deployment** 部分：
   - Source: 选择 **GitHub Actions**
4. 点击 **Save**

### 2. 配置 GitHub Actions

GitHub Actions 工作流已经配置好（`.github/workflows/deploy.yml`），会自动：

- 在推送到 `main` 分支时触发
- 构建 VitePress 文档
- 部署到 GitHub Pages

### 3. 触发部署

```bash
# 确保在 main 分支
git checkout main

# 推送更改（会自动触发部署）
git push origin main
```

### 4. 查看部署状态

1. 访问 GitHub 仓库的 **Actions** 标签
2. 查看 **Deploy to GitHub Pages** 工作流
3. 等待构建完成（通常 1-2 分钟）

### 5. 访问官网

部署完成后，官网将在以下地址可用：

```
https://qore-framework.github.io/qore/
```

## 🔧 本地测试

### 开发模式

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm docs:dev
```

访问 http://localhost:5173 查看实时预览。

### 生产构建

```bash
# 构建生产版本
pnpm docs:build

# 预览构建结果
pnpm docs:preview
```

构建输出在 `docs/.vitepress/dist` 目录。

## 📁 官网结构

```
docs/
├── .vitepress/          # VitePress 配置
│   ├── config.ts        # 主配置文件
│   └── dist/            # 构建输出
├── index.md             # 首页
├── guide/               # 使用指南
│   ├── getting-started.md
│   ├── core-concepts.md
│   ├── reactivity.md
│   ├── components.md
│   ├── ai-native.md
│   ├── streaming.md
│   └── ssr.md
├── api/                 # API 文档
│   ├── signal.md
│   ├── computed.md
│   ├── effect.md
│   ├── batch.md
│   ├── component.md
│   ├── renderer.md
│   └── streaming.md
├── examples/            # 示例代码
│   ├── basic.md
│   ├── counter.md
│   ├── todo.md
│   └── ai-integration.md
├── blog/                # 博客
│   ├── index.md
│   ├── v0.5.0-release.md
│   ├── fine-grained-reactivity.md
│   └── ai-native-development.md
└── DEPLOYMENT_GUIDE.md  # 本文件
```

## 🎨 自定义配置

### 修改导航

编辑 `docs/.vitepress/config.ts`：

```typescript
nav: [
  { text: '首页', link: '/' },
  { text: '指南', link: '/guide/getting-started' },
  { text: 'API', link: '/api/signal' },
  { text: '示例', link: '/examples/basic' },
  { text: '博客', link: '/blog/' },
]
```

### 修改侧边栏

```typescript
sidebar: {
  '/guide/': [
    {
      text: '指南',
      items: [
        { text: '快速开始', link: '/guide/getting-started' },
        // 添加更多页面...
      ],
    },
  ],
}
```

### 添加新页面

在对应目录创建 `.md` 文件：

```bash
# 创建新的指南页面
touch docs/guide/new-feature.md
```

在文件中添加 frontmatter：

```markdown
---
title: 新功能指南
description: 介绍 Qore 的新功能
---

# 新功能指南

内容...
```

## 🔍 故障排查

### 构建失败

**问题**: `pnpm docs:build` 失败

**解决**:
```bash
# 清理缓存
rm -rf node_modules docs/.vitepress/cache
pnpm install

# 重新构建
pnpm docs:build
```

### 部署后 404

**问题**: 访问官网显示 404

**解决**:
1. 检查 GitHub Pages 是否启用
2. 确认 `base` 配置正确：`base: '/qore/'`
3. 等待几分钟（CDN 缓存）

### 样式丢失

**问题**: 页面没有样式

**解决**:
1. 检查 `base` 配置是否正确
2. 清除浏览器缓存
3. 重新构建并部署

## 📊 部署历史

查看部署历史：

1. 访问 GitHub 仓库
2. 进入 **Settings** → **Pages**
3. 查看 **Deployments** 部分

## 🔗 相关链接

- [VitePress 文档](https://vitepress.dev/)
- [GitHub Pages 文档](https://pages.github.com/)
- [Qore 官网源码](https://github.com/qore-framework/qore/tree/main/docs)

---

**最后更新**: 2026-04-15
