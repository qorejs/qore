# Qore 文档站点

这是 Qore 框架的官方文档站点，使用 VitePress 构建。

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm docs:dev
```

访问 http://localhost:5173 查看文档。

## 构建

```bash
pnpm docs:build
```

构建输出在 `docs/.vitepress/dist` 目录。

## 部署

### 部署到 Vercel

#### 方法一：Vercel Dashboard（推荐）

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 导入 GitHub 仓库 `qorejs/qore`
4. 配置构建设置：
   - **Framework Preset**: VitePress
   - **Root Directory**: `.`
   - **Build Command**: `pnpm docs:build`
   - **Output Directory**: `docs/.vitepress/dist`
   - **Install Command**: `pnpm install`
5. 点击 "Deploy"

#### 方法二：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd /Users/xinxintao/.openclaw/workspace/qore
vercel --prod
```

### 部署到 Netlify

1. 访问 [Netlify](https://netlify.com)
2. 连接 GitHub 仓库
3. 构建设置：
   - **Build command**: `pnpm docs:build`
   - **Publish directory**: `docs/.vitepress/dist`

### 部署到 GitHub Pages

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm docs:build
      
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.vitepress/dist
```

## 目录结构

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress 配置
├── index.md               # 首页
├── guide/                 # 指南
│   ├── getting-started.md
│   ├── core-concepts.md
│   ├── reactivity.md
│   ├── components.md
│   └── ai-native.md
├── api/                   # API 参考
│   ├── signal.md
│   ├── computed.md
│   ├── effect.md
│   ├── batch.md
│   └── component.md
└── examples/              # 示例
    ├── basic.md
    ├── counter.md
    ├── todo.md
    └── ai-integration.md
```

## 许可证

MIT
