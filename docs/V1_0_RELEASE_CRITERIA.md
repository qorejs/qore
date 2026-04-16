# Qore v1.0 发布标准定义

**文档版本**: 1.0.0  
**创建日期**: 2026-04-16  
**负责人**: 老六（测试专家）  
**状态**: 待执行

---

## 📋 概述

本文档详细定义 Qore v1.0 的发布标准，确保发布质量可控、验收标准清晰。所有标准必须在 v1.0.0 正式发布前达成。

---

## ✅ 发布标准分类

### 1. 代码质量标准

#### 1.1 测试覆盖率

| 包 | 最低要求 | 目标值 | 当前状态 | 验证命令 |
|---|---------|--------|----------|----------|
| @qorejs/qore (core) | 85% | 90% | ~85% | `cd packages/core && pnpm test:coverage` |
| @qore/devtools | 75% | 80% | ~70% | `cd packages/devtools && pnpm test:coverage` |
| @qore/primitives | 75% | 80% | ~75% | `cd packages/primitives && pnpm test:coverage` |
| create-qore | 70% | 75% | ~60% | `cd packages/create-qore && pnpm test:coverage` |
| **整体** | **80%** | **85%** | **~75%** | `pnpm test:coverage` |

**验收标准**:
- [ ] 所有包覆盖率达标
- [ ] 无覆盖率下降的提交
- [ ] 关键路径 100% 覆盖

#### 1.2 测试通过率

| 测试类型 | 要求 | 当前状态 | 验证命令 |
|---------|------|----------|----------|
| 单元测试 | 100% | ✅ | `pnpm test` |
| 集成测试 | 100% | ⚠️ 有超时 | `pnpm test:integration` |
| E2E 测试 | N/A (v1.1+) | ⏳ 计划中 | - |

**验收标准**:
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过（修复超时问题）
- [ ] 无 flaky 测试

#### 1.3 CI/CD 标准

| 指标 | 要求 | 验证方式 |
|------|------|----------|
| CI 通过率 | 100% | GitHub Actions |
| 构建时间 | <10 分钟 | Actions 日志 |
| 部署成功率 | 100% | 部署记录 |
| 回滚能力 | 支持 | 发布流程文档 |

**验收标准**:
- [ ] CI 连续 5 次构建成功
- [ ] 无 CI 警告
- [ ] 构建产物验证通过

---

### 2. 功能完整性标准

#### 2.1 核心功能清单

必须包含以下 5 大核心模块，缺一不可：

| 模块 | 功能点 | 状态 | 验收标准 |
|------|--------|------|----------|
| **Signal** | signal, computed, effect, batch | ✅ | 所有 API 可用，测试通过 |
| **Renderer** | h(), render(), fine-grained updates | ✅ | 渲染正确，性能达标 |
| **Component** | 函数组件，props, children, lifecycle | ✅ | 组件系统完整 |
| **Streaming** | stream(), StreamingRenderer | ✅ | AI 流式响应支持 |
| **SSR** | renderToString, renderToStream, hydration | ✅ | SSR 完整流程可用 |

**验收标准**:
- [ ] 5 大核心模块全部完成
- [ ] 每个模块有完整测试
- [ ] 每个模块有文档和示例

#### 2.2 辅助功能清单

| 功能 | 优先级 | 状态 | 验收标准 |
|------|--------|------|----------|
| Virtual Lists | P0 | ✅ | 虚拟列表可用 |
| DevTools | P0 | ✅ | 调试工具可用 |
| UI Components | P0 | ✅ | 基础组件可用 |
| CLI Scaffold | P0 | ✅ | 项目创建可用 |
| Error Boundaries | P0 | ✅ | 错误处理可用 |
| Suspense/Lazy | P0 | ✅ | 异步加载可用 |

**验收标准**:
- [ ] P0 功能全部完成
- [ ] P1 功能完成 80% 以上
- [ ] P2 功能可延后

---

### 3. 文档完整性标准

#### 3.1 必需文档

| 文档 | 要求 | 状态 | 位置 |
|------|------|------|------|
| README.md | 完整介绍、快速开始、API 概览 | ✅ | /README.md |
| API 文档 | 所有公开 API 详细说明 | ⏳ | /docs/api/ |
| 使用指南 | 核心功能使用教程 | ⏳ | /docs/guide/ |
| 示例代码 | ≥10 个完整示例 | ⏳ | /examples/ |
| 迁移指南 | 从 React/Vue/Solid 迁移 | ⏳ | /docs/migration/ |
| FAQ | 常见问题解答 | ⏳ | /docs/faq.md |
| CHANGELOG.md | 版本变更日志 | ✅ | /CHANGELOG.md |
| CONTRIBUTING.md | 贡献指南 | ✅ | /CONTRIBUTING.md |
| PUBLISHING.md | 发布指南 | ✅ | /PUBLISHING.md |

**验收标准**:
- [ ] 所有必需文档存在
- [ ] 文档内容准确、完整
- [ ] 示例代码可运行

#### 3.2 文档质量检查

| 检查项 | 标准 | 验证方式 |
|--------|------|----------|
| 代码示例 | 所有示例可运行 | 手动验证 |
| API 签名 | 与实际代码一致 | 自动检查 |
| 链接有效性 | 无死链 | 链接检查器 |
| 拼写语法 | 无明显错误 | 人工审核 |
| 中文翻译 | 关键文档有中译 | 人工审核 |

---

### 4. npm 发布标准

#### 4.1 包配置

| 要求 | 验证方式 |
|------|----------|
| package.json 配置正确 | 验证 fields |
| TypeScript 类型定义完整 | `tsc --noEmit` |
| ESM/CJS 双格式支持 | 两种导入方式测试 |
| Tree-shaking 支持 | sideEffects: false |
| .npmignore 配置正确 | 验证发布内容 |
| 子路径导出 | 验证 ./ssr, ./virtual-list |

**验收命令**:
```bash
# 验证构建
pnpm build

# 验证类型
pnpm type-check

# 本地打包验证
npm pack
# 检查生成的 .tgz 文件内容

# 本地安装测试
npm install ./qore-1.0.0.tgz
```

#### 4.2 包体积要求

| 包 | 体积限制 (gzipped) | 验证命令 |
|---|-------------------|----------|
| @qorejs/qore (core) | <5kb | `gzip -c dist/index.js | wc -c` |
| @qore/devtools | <15kb | 同上 |
| @qore/primitives | <20kb | 同上 |
| create-qore | <10kb | 同上 |

**验收标准**:
- [ ] 所有包体积达标
- [ ] 无不必要的依赖
- [ ] 依赖版本锁定

#### 4.3 安装便捷性

| 测试场景 | 验证命令 | 预期结果 |
|---------|----------|----------|
| npm 安装 | `npm install @qorejs/qore` | 成功 |
| pnpm 安装 | `pnpm add @qorejs/qore` | 成功 |
| yarn 安装 | `yarn add @qorejs/qore` | 成功 |
| 脚手架创建 | `npx create-qore my-app` | 成功 |
| TypeScript 项目 | 类型提示正常 | 正常 |

---

### 5. 性能标准

#### 5.1 基准测试

| 指标 | 目标值 | 当前值 | 验证方式 |
|------|--------|--------|----------|
| 组件渲染 (ops/sec) | >50,000 | ~50,000 | benchmarks/core |
| Signal 创建 (ops/sec) | >1,000,000 | 待测 | benchmarks/signal |
| 内存占用 (per signal) | <150b | ~100b | benchmarks/memory |
| 包体积 (core, gzipped) | <5kb | ~5kb | bundlephobia |
| TTFB (SSR) | <50ms | 待测 | benchmarks/ssr |

**验收标准**:
- [ ] 所有基准测试通过
- [ ] 无性能回归
- [ ] 性能数据公开

#### 5.2 性能对比

与主流框架对比（相对值）：

| 框架 | 渲染性能 | 包体积 | 学习曲线 |
|------|---------|--------|----------|
| Qore v1.0 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| React | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Vue | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Solid | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

### 6. 安全标准

| 检查项 | 要求 | 验证方式 |
|--------|------|----------|
| 依赖安全 | 无已知漏洞 | `npm audit` |
| 代码安全 | 无敏感信息泄露 | 代码审查 |
| XSS 防护 | 默认转义 | 安全测试 |
| CSRF 防护 | SSR 场景考虑 | 安全审查 |

**验收标准**:
- [ ] npm audit 无高危漏洞
- [ ] 安全审查通过
- [ ] 无硬编码密钥

---

## 📊 验收检查清单

### 发布前检查 (Pre-Release Checklist)

```markdown
## 代码质量
- [ ] 所有测试通过 (pnpm test)
- [ ] 测试覆盖率达标 (pnpm test:coverage)
- [ ] CI 连续 5 次成功
- [ ] 无 ESLint 错误
- [ ] TypeScript 类型检查通过

## 功能完整性
- [ ] 5 大核心模块验收通过
- [ ] P0 功能全部完成
- [ ] 已知 Bug 全部修复
- [ ] 性能基准测试通过

## 文档
- [ ] README.md 完整
- [ ] API 文档完整
- [ ] 示例代码可运行
- [ ] 迁移指南完成
- [ ] FAQ 完成

## npm 发布
- [ ] 包配置正确
- [ ] 包体积达标
- [ ] 本地安装测试通过
- [ ] TypeScript 类型完整
- [ ] .npmignore 配置正确

## 安全
- [ ] npm audit 通过
- [ ] 安全审查完成
- [ ] 无敏感信息

## 最终验证
- [ ] RC 版本测试通过
- [ ] 团队评审通过
- [ ] 负责人批准
```

---

## 🚀 发布流程

### 1. 发布前准备 (T-7 天)

```bash
# 1. 代码冻结
git checkout -b release/v1.0.0

# 2. 运行完整测试
pnpm test
pnpm test:coverage
pnpm bench

# 3. 构建验证
pnpm build

# 4. 文档检查
# 人工检查所有文档
```

### 2. RC 发布 (T-3 天)

```bash
# 1. 发布 RC 版本
npm publish --tag rc

# 2. 社区测试
# 邀请核心用户测试

# 3. 收集反馈
# 处理关键问题
```

### 3. 正式发布 (T-0)

```bash
# 1. 更新版本号
# packages/*/package.json

# 2. 更新 CHANGELOG
# 添加 v1.0.0 发布说明

# 3. 发布到 npm
npm publish

# 4. 创建 GitHub Release
# https://github.com/qorejs/qore/releases

# 5. 更新官网
# 部署最新文档
```

### 4. 发布后验证 (T+1 天)

```bash
# 1. 验证 npm 包
npm view @qorejs/qore version

# 2. 安装测试
npm install @qorejs/qore

# 3. 监控反馈
# GitHub Issues, Discord, Twitter
```

---

## 📈 质量门禁

### 自动门禁 (CI/CD)

```yaml
# GitHub Actions 配置
name: Release Gate

on:
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Test
        run: pnpm test
        # 必须 100% 通过
      
      - name: Coverage
        run: pnpm test:coverage
        # 必须 ≥80%
      
      - name: Build
        run: pnpm build
        # 必须成功
      
      - name: Type Check
        run: pnpm type-check
        # 必须通过
      
      - name: Audit
        run: npm audit
        # 无高危漏洞
```

### 人工门禁

| 门禁点 | 负责人 | 检查项 |
|--------|--------|--------|
| 代码审查 | 十万伏特 | 架构、性能、安全 |
| 测试审查 | 老六 | 覆盖率、测试质量 |
| 文档审查 | 盖娅 | 完整性、准确性 |
| 产品审查 | 乔布斯 | 功能完整性、用户体验 |
| 最终批准 | XIN | 综合评估、发布决策 |

---

## 📝 版本记录

| 版本 | 发布日期 | 状态 | 备注 |
|------|----------|------|------|
| v1.0.0-rc.1 | TBD | 计划中 | 首个候选版本 |
| v1.0.0-rc.2 | TBD | 计划中 | 如有必要 |
| v1.0.0 | 2026-05-01 | 计划中 | 正式发布 |

---

**文档创建时间**: 2026-04-16 14:35  
**文档位置**: `/Users/xinxintao/.openclaw/workspace/qore/docs/V1_0_RELEASE_CRITERIA.md`  
**执行负责人**: 老六（测试专家）
