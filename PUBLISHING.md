# NPM 发布指南

## 📦 发布流程

### 方法 1: GitHub Release 自动发布（推荐）

1. **创建 Release**
   - 访问 https://github.com/qorejs/qore/releases
   - 点击 "Create a new release"
   - 选择 tag (如 `v0.5.0`)
   - 填写发布说明
   - 点击 "Publish release"

2. **自动触发**
   - GitHub Actions 会自动构建并发布
   - 发布到 npm: https://www.npmjs.com/package/qore

---

### 方法 2: 手动触发工作流

1. **访问 Actions**
   - https://github.com/qorejs/qore/actions/workflows/publish-npm.yml

2. **运行工作流**
   - 点击 "Run workflow"
   - 选择要发布的包：
     - `core` - 核心框架
     - `devtools` - 开发者工具
     - `primitives` - UI 组件库
   - 输入版本号 (如 `0.6.0`)
   - 点击 "Run workflow"

---

## 🔐 配置 NPM Token

### 在 GitHub 添加密钥

1. 访问 https://github.com/qorejs/qore/settings/secrets/actions
2. 点击 "New repository secret"
3. 添加：
   - **Name**: `NPM_TOKEN`
   - **Value**: 你的 npm token

### 获取 npm token

```bash
# 本地登录 npm
npm login

# 获取 token
cat ~/.npmrc
# 或访问 https://www.npmjs.com/settings/YOUR_USERNAME/tokens
```

---

## 📋 发布前检查清单

- [ ] 所有测试通过 (`pnpm test`)
- [ ] 构建成功 (`pnpm build`)
- [ ] 版本号已更新
- [ ] CHANGELOG.md 已更新
- [ ] README.md 已更新
- [ ] TypeScript 类型定义正确

---

## 🚀 发布后验证

```bash
# 验证发布
npm view qore version
npm view qore dist-tags

# 安装测试
npm install qore@latest
```

---

## 📝 版本规范

遵循语义化版本 (SemVer):

- **MAJOR** (1.0.0): 不兼容的 API 变更
- **MINOR** (0.6.0): 向后兼容的新功能
- **PATCH** (0.5.1): 向后兼容的 bug 修复

### 当前版本

| 包 | 版本 |
|---|------|
| `qore` | 0.5.0 |
| `@qore/devtools` | 0.6.0 |
| `@qore/primitives` | 0.6.0 |
| `create-qore` | 0.6.0 |

---

## ⚠️ 注意事项

1. **不要重复发布同一版本** - 会失败
2. **发布前本地测试** - 避免发布后发现问题
3. **使用预发布版本** - 测试用 `npm publish --tag beta`
4. **保持包干净** - 只包含必要的文件

---

**发布完成后**:
- 更新官网文档
- 更新 GitHub Releases
- 通知社区
