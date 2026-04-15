# Contributing to Qore

首先，感谢你愿意为 Qore 贡献代码！这是一个社区驱动的项目，每一个贡献都至关重要。

## 📖 目录

- [行为准则](#行为准则)
- [开发环境设置](#开发环境设置)
- [提交流程](#提交流程)
- [代码规范](#代码规范)
- [测试要求](#测试要求)
- [发布流程](#发布流程)

---

## 行为准则

- 尊重他人，保持友善
- 对事不对人，聚焦技术讨论
- 欢迎新手，耐心解答
- 遵守开源协议（MIT）

---

## 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Git

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/qorejs/qore.git
cd qore

# 安装依赖
pnpm install
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单个包的测试
cd packages/core && pnpm test
```

### 本地开发

```bash
# 开发模式（监听变化）
pnpm dev

# 构建所有包
pnpm build
```

---

## 提交流程

### 1. Fork 仓库

点击 GitHub 右上角的 "Fork" 按钮。

### 2. 创建分支

```bash
git checkout -b feat/your-feature-name
# 或
git checkout -b fix/issue-123
```

**分支命名规范**：
- `feat/xxx` - 新功能
- `fix/xxx` - Bug 修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 代码重构
- `test/xxx` - 测试相关
- `chore/xxx` - 工具/配置

### 3. 提交代码

```bash
git add .
git commit -m "feat: add your feature description"
```

**Commit 信息规范**：
- 使用现在时态（"add" 不是 "added"）
- 首字母小写
- 简洁明了

### 4. 推送并创建 PR

```bash
git push origin feat/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

---

## 代码规范

### TypeScript

- 使用 TypeScript 编写所有代码
- 定义明确的类型接口
- 避免使用 `any`
- 导出公共 API 要有 JSDoc 注释

### 代码风格

```typescript
// ✅ 好的示例
export function signal<T>(initial: T): Signal<T> {
  const node = new SignalNode(initial);
  return node.get;
}

// ❌ 避免
const s = (x) => x; // 类型不明确，命名随意
```

### 文件组织

```
packages/core/
├── src/
│   ├── index.ts      # 导出公共 API
│   ├── signal.ts     # Signal 实现
│   ├── render.ts     # 渲染器
│   └── stream.ts     # 流式渲染
├── tests/            # 测试文件
└── package.json
```

---

## 测试要求

### 编写测试

- 新功能必须附带测试
- 测试覆盖率 >= 80%
- 使用 Vitest 测试框架

```typescript
// tests/signal.test.ts
import { describe, it, expect } from 'vitest';
import { signal, effect } from '../src/signal';

describe('signal', () => {
  it('should create a signal', () => {
    const count = signal(0);
    expect(count()).toBe(0);
  });

  it('should update value', () => {
    const count = signal(0);
    count(1);
    expect(count()).toBe(1);
  });
});
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage
```

---

## 发布流程

### 版本号规范

遵循语义化版本（SemVer）：

- **MAJOR** (1.0.0): 不兼容的 API 变更
- **MINOR** (0.6.0): 向后兼容的新功能
- **PATCH** (0.5.1): 向后兼容的 bug 修复

### 发布步骤

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. 创建 GitHub Release
4. GitHub Actions 自动发布到 npm

详见 [PUBLISHING.md](./PUBLISHING.md)

---

## 问题反馈

### Bug 报告

请包含：
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（Node.js 版本、浏览器等）

### 功能建议

请说明：
- 使用场景
- 期望的 API 设计
- 类似实现的参考

---

## 常见问题

### Q: 如何开始第一个贡献？

A: 查看 [Good First Issues](https://github.com/qorejs/qore/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

### Q: 测试不通过怎么办？

A: 在 PR 中说明情况，我们会一起排查。

### Q: 多久能合并 PR？

A: 通常 1-3 个工作日，复杂功能可能需要更久。

---

## 致谢

感谢所有贡献者！🎉

<a href="https://github.com/qorejs/qore/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=qorejs/qore" />
</a>

---

**最后更新**: 2026-04-15
