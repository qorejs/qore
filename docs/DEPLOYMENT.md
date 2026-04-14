# 部署指南

## 部署到 Vercel

### 方法一：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署到生产环境
vercel --prod
```

### 方法二：Vercel Git 集成

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 [Vercel Dashboard](https://vercel.com/dashboard) 导入项目
3. 配置构建设置：
   - **Build Command**: `pnpm docs:build`
   - **Output Directory**: `docs/.vitepress/dist`
   - **Install Command**: `pnpm install`
4. 点击 Deploy

### 方法三：GitHub Actions

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

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
      
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
```

## 本地预览

```bash
# 构建
pnpm docs:build

# 预览
pnpm docs:preview
```

## 自定义域名

在 Vercel Dashboard 中配置自定义域名，或添加 `vercel.json`:

```json
{
  "buildCommand": "pnpm docs:build",
  "outputDirectory": "docs/.vitepress/dist",
  "framework": "vitepress"
}
```
