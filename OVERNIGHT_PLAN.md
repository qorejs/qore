# Qore 明早交付计划

**制定时间**: 2026-04-14 23:55  
**交付时间**: 2026-04-15 08:00  
**状态**: 🚨 紧急任务

---

## 📊 当前状态评估

| 模块 | 状态 | 完成度 |
|------|------|--------|
| 核心框架 (@qore/core) | ✅ 完成 | 100% |
| 官网/落地页 | ❌ 未开始 | 0% |
| 文档站点 | ❌ 未开始 | 0% |
| 文档内容 | ⚠️ 部分 | 30% |
| 示例项目 | ⚠️ 部分 | 40% (2/5) |
| CLI 工具 | ❌ 未开始 | 0% |
| npm 包发布 | ❌ 未开始 | 0% |

---

## 团队分工

| 成员 | 任务 | 交付物 | 截止时间 |
|------|------|--------|----------|
| **Agent 1** | 官网 + 文档站点 | VitePress 站点部署到 Vercel | 03:00 |
| **Agent 2** | 文档编写 | 快速开始、API 参考、示例代码 | 05:00 |
| **Agent 3** | 示例项目 | 5 个完整示例 (Hello World, Counter, Todo, AI Chat, Dashboard) | 07:00 |
| **Agent 4** | CLI 工具 | create-qore 包 + 项目模板 | 07:00 |
| **Agent 5** | npm 发布 + 测试 | qore 和 create-qore 发布到 npm，全量测试 | 08:00 |

---

## 任务清单

### 🌐 官网 + 文档站点 (Agent 1)

- [ ] 创建 VitePress 文档站点结构
- [ ] 设计并实现落地页 (首页)
  - Hero 区域 (标语 + CTA)
  - 特性展示 (高性能、AI Native、轻量级)
  - 代码示例展示
  - 性能对比图表
  - Footer
- [ ] 配置文档导航结构
- [ ] 自定义主题样式 (Qore 品牌色)
- [ ] 部署到 Vercel/Netlify
- [ ] 配置自定义域名 (可选)

### 📚 文档编写 (Agent 2)

- [ ] **快速开始指南**
  - [ ] 安装说明
  - [ ] 第一个 Qore 应用
  - [ ] 核心概念介绍
  - [ ] 与 React/Vue 对比

- [ ] **API 完整参考**
  - [ ] signal() - 创建信号
  - [ ] computed() - 计算值
  - [ ] effect() - 副作用
  - [ ] batch() - 批处理
  - [ ] h() - 创建虚拟节点
  - [ ] render() - 渲染
  - [ ] text() - 文本绑定
  - [ ] show() - 条件渲染
  - [ ] For() - 列表渲染
  - [ ] stream() - AI 流式
  - [ ] streamText() - 打字机效果

- [ ] **示例代码**
  - [ ] 每个 API 至少一个示例
  - [ ] 可交互的代码沙盒链接

- [ ] **最佳实践**
  - [ ] 性能优化技巧
  - [ ] AI 流式最佳实践
  - [ ] 常见陷阱

### 📦 示例项目 (Agent 3)

- [ ] **Example 1: Hello World**
  - 最基础的 Qore 应用
  - 单文件 HTML + CDN 引入
  - 展示信号和渲染

- [ ] **Example 2: Counter**
  - 经典计数器
  - 展示 signal + computed + event handling
  - 包含样式

- [ ] **Example 3: Todo List**
  - 完整 Todo 应用
  - 展示列表渲染 (For)
  - 添加/删除/完成状态
  - 本地存储持久化

- [ ] **Example 4: AI Chat Stream**
  - AI 对话界面
  - 展示 stream() 流式渲染
  - Markdown 渲染支持
  - 模拟 AI 响应

- [ ] **Example 5: Dashboard**
  - 数据仪表板
  - 多个信号联动
  - 图表展示 (使用简单 SVG)
  - 实时数据更新

- [ ] 每个示例需要:
  - [ ] 独立 package.json
  - [ ] 可运行的 dev 脚本
  - [ ] README 说明
  - [ ] 截图/GIF

### 🛠️ CLI 工具 (Agent 4)

- [ ] **创建 create-qore 包**
  - [ ] 包结构 (packages/create-qore/)
  - [ ] package.json 配置
  - [ ] bin 入口文件

- [ ] **实现 CLI 功能**
  - [ ] 项目模板选择 (vanilla, ts, demo)
  - [ ] 交互式 prompts (使用 prompts 库)
  - [ ] 文件生成 (复制模板)
  - [ ] 依赖安装 (自动 pnpm/npm install)

- [ ] **项目模板**
  - [ ] vanilla 模板 (最简)
  - [ ] typescript 模板 (推荐)
  - [ ] demo 模板 (带示例)

- [ ] **npm 配置**
  - [ ] 配置 bin 字段
  - [ ] 测试 `npm create qore@latest`
  - [ ] 添加 --help 和 --version

### 📤 npm 包发布 (Agent 5)

- [ ] **qore 核心包**
  - [ ] 更新 packages/core/package.json
    - name 改为 `qorejs` (用户确认)
    - version 设为 1.0.0
    - 添加 keywords, repository, license
  - [ ] 构建生产版本
  - [ ] 发布到 npm (`npm publish --access public`)

- [ ] **create-qore CLI 包**
  - [ ] 完成 package.json
  - [ ] 发布到 npm

- [ ] **验证安装**
  - [ ] `npm install qore` 测试
  - [ ] `npm create qore@latest` 测试

### ✅ 测试验证 (Agent 5)

- [ ] **功能测试**
  - [ ] 所有 5 个示例能正常运行
  - [ ] CLI 能创建项目
  - [ ] 创建的項目能 dev 和 build

- [ ] **文档验证**
  - [ ] 所有文档页面无 404
  - [ ] 代码示例可复制运行
  - [ ] 链接无断裂

- [ ] **性能验证**
  - [ ] 运行 benchmarks
  - [ ] 确认性能指标达标

- [ ] **最终检查清单**
  - [ ] 官网可访问
  - [ ] 文档完整
  - [ ] npm 包可安装
  - [ ] CLI 可用
  - [ ] 示例可运行

---

## 时间节点

| 时间 | 里程碑 | 负责人 |
|------|--------|--------|
| **23:55 - 01:00** | 规划完成，团队就位 | 全体 |
| **01:00 - 03:00** | 官网 + 文档站点上线 | Agent 1 |
| **03:00 - 05:00** | 文档编写完成 | Agent 2 |
| **05:00 - 07:00** | 示例项目 + CLI 完成 | Agent 3, 4 |
| **07:00 - 08:00** | npm 发布 + 全量测试 | Agent 5 |
| **08:00** | 🎉 交付！ | 全体 |

---

## 风险预案

### 风险 1: Vercel 部署失败

**问题**: Vercel 部署遇到配置问题或审核延迟

**应对**:
1. 备用方案：使用 Netlify (配置更简单)
2. 再备用：GitHub Pages (静态站点直接部署)
3. 最低限度：提供本地运行的文档站点，附截图

### 风险 2: npm 发布失败

**问题**: npm 包名冲突或发布权限问题

**应对**:
1. 包名冲突：使用 `qorejs`（用户确认）
2. 权限问题：使用 scoped package `@qore/core` (已有)
3. 时间问题：先发布 beta 版本 (`1.0.0-beta.1`)

### 风险 3: 示例项目无法运行

**问题**: 依赖问题或代码 bug

**应对**:
1. 优先保证 Hello World 和 Counter 能运行
2. 复杂示例提供静态截图 + 代码
3. 提供 CodeSandbox/StackBlitz 在线运行链接

### 风险 4: CLI 工具开发延迟

**问题**: 交互式 CLI 开发耗时超出预期

**应对**:
1. 简化版本：只实现基础模板创建
2. 使用 `degit` 等现有工具复制模板
3. 提供手动安装说明作为备选

### 风险 5: 文档内容不足

**问题**: API 文档不完整或示例代码有误

**应对**:
1. 优先完成快速开始和核心 API
2. 次要 API 提供简短说明 + 链接到源码
3. 添加"文档持续完善中"的说明

### 风险 6: 时间不足

**问题**: 某个环节严重超时

**应对**:
1. 06:00 进行中期检查，调整优先级
2. 砍掉非核心功能 (如 Dashboard 示例)
3. 保证最小可用产品 (MVP):
   - ✅ 官网可访问
   - ✅ 快速开始文档
   - ✅ 3 个核心示例
   - ✅ npm 包可安装

---

## 交付标准

### 必须完成 (Must Have)

- [ ] 官网落地页可访问 (Vercel/Netlify)
- [ ] 快速开始文档完整
- [ ] 核心 API 文档 (signal, computed, render, stream)
- [ ] 3 个示例项目能运行 (Hello World, Counter, Todo)
- [ ] `npm install qore` 成功
- [ ] CLI 能创建基础项目

### 应该完成 (Should Have)

- [ ] 完整 API 参考文档
- [ ] 5 个示例项目
- [ ] CLI 支持多模板
- [ ] 性能对比页面

### 可以延后 (Nice to Have)

- [ ] 最佳实践文档
- [ ] 在线代码沙盒
- [ ] 自定义域名
- [ ] 博客/文章

---

## 沟通机制

- **进度同步**: 每小时在群内同步一次进度
- **问题上报**: 遇到阻塞问题立即上报
- **最终检查**: 07:30 全体进行最终验收

---

## 资源链接

- **项目根目录**: `/Users/xinxintao/.openclaw/workspace/qore`
- **核心包**: `packages/core/`
- **现有示例**: `examples/`
- **现有文档**: `docs/`

---

**🔥 明早 8 点，准时交付！🔥**
