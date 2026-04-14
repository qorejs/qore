# Qore 技术评估报告

**评估人**: 大牛 (Qore 技术负责人)  
**日期**: 2026-04-14  
**评估对象**: `/Users/xinxintao/.openclaw/workspace/qore/packages/core/`

---

## 当前架构评分：**5/10**

### 评分理由

| 维度 | 得分 | 说明 |
|------|------|------|
| 核心体积 | 2/10 | 5.5kb (gzip) ❌ 目标 3kb |
| 渲染性能 | 6/10 | 有增量 patch，但 diff 逻辑过重 |
| API 简洁 | 5/10 | 有冗余封装 (div/span 等 helper) |
| AI 契合 | 8/10 | Stream 设计优秀，patch 更新到位 |
| 代码质量 | 7/10 | 结构清晰，测试覆盖 |
| 架构设计 | 5/10 | 模块分离过度，有重复逻辑 |

---

## 必须砍掉的功能

### 1. `useAsyncData` (suspense.ts)
**原因**: 
- React Query 模式，与框架定位不符
- 增加 800+ 行代码
- 不是核心需求，用户可自行实现
- 引入 staleTime、缓存等复杂逻辑

### 2. `lazy()` 组件懒加载 (suspense.ts)
**原因**:
- 依赖动态 import，增加运行时复杂度
- 与 Suspense 核心功能重复
- 不是 AI 场景的刚需

### 3. 内置组件 helpers (component.ts)
**原因**:
```typescript
// 当前代码 - 浪费空间
export const div = component('div');
export const span = component('span');
// ... 9 个组件

// 用户直接用 h() 即可
h('div', { className: 'foo' }, 'content')
```
- 增加 200+ 行代码
- 没有实际价值，只是语法糖
- 与"1-2 行代码"目标背道而驰

### 4. 独立的 Diff 模块 (diff.ts)
**原因**:
- 与 Renderer 的 patchChildren 逻辑重复
- 增加 API 复杂度 (用户需要理解 diff + patch 两层)
- 应该内联到 Renderer 中

### 5. Source Maps (生产环境)
**原因**:
- vite.config.ts 中 `sourcemap: true`
- 开发时可有，生产构建必须关闭
- 当前 dist/index.js.map 58kb，严重拖慢加载

### 6. `batch()` 函数 (reactive.ts)
**原因**:
- 当前实现只是 `return fn()`，无实际批处理逻辑
- 误导性 API，应该移除或正确实现

---

## 必须保留的功能

### 1. Signal 响应式系统 (reactive.ts) ✅
**原因**:
- 框架的核心竞争力
- 细粒度更新的基础
- 代码精简 (约 150 行)
- 性能优秀

### 2. Stream 流式组件 (stream.ts) ✅
**原因**:
- **AI-Native 的核心体现**
- `createStream` + `patch` 增量更新设计优秀
- 支持 AI 打字机效果、Markdown 流式渲染
- 与 React 相比的差异化优势

### 3. Renderer 增量 Patch (renderer.ts) ✅
**原因**:
- 支持局部更新，避免全量重渲染
- 性能优于 React 的 Fiber 架构 (简单场景)
- 需要简化，但核心逻辑必须保留

### 4. Suspense 基础功能 (suspense.ts) ✅
**原因**:
- `createSuspense` 处理异步加载
- AI 场景常用 (流式数据 + 加载状态)
- 但需要大幅简化 (砍掉 lazy/useAsyncData)

### 5. 基础 VNode 类型 (renderer.ts) ✅
**原因**:
- `h()`、`text()` 是核心 API
- 类型定义清晰
- 无法进一步简化

---

## 重构建议

### 1. 合并 Diff + Renderer
**当前问题**: diff.ts 和 renderer.ts 有重复的 children 比对逻辑

**建议**:
```typescript
// 将 diff 逻辑内联到 Renderer.patchNode 中
// 对外只暴露 renderer.patch(vnode)
// 用户不需要知道 diff 的存在
```

### 2. 简化组件系统
**当前问题**: createComponent 引入 state 管理，增加复杂度

**建议**:
```typescript
// 砍掉 createComponent，直接用函数 + Signal
const Counter = () => {
  const count = signal(0);
  return h('button', { onClick: () => count.set(count.get() + 1) }, count.get());
};
```

### 3. Stream 与 Suspense 整合
**当前问题**: 两个模块独立，但 AI 场景经常同时使用

**建议**:
```typescript
// 统一为 AsyncStream 组件
const AIResponse = createSuspenseStream(async (writer) => {
  const response = await fetchAI();
  writer.write(response);
});
```

### 4. 构建优化
**vite.config.ts 修改**:
```typescript
build: {
  minify: 'terser',  // 启用压缩
  sourcemap: false,  // 生产环境关闭
  target: 'esnext',  // 现代浏览器
}
```

### 5. Tree-shaking 优化
**当前问题**: index.ts 导出所有内容，无法 tree-shake

**建议**:
```typescript
// 改为按需导入
// @qore/core/signals
// @qore/core/stream
// @qore/core/suspense
```

---

## 性能优化路径

### 目标分解

| 模块 | 当前 (gzip) | 目标 | 优化手段 |
|------|-----------|------|---------|
| reactive.ts | ~1.2kb | 0.8kb | 移除 batch，简化 Effect |
| renderer.ts | ~2.5kb | 1.2kb | 合并 diff，简化 patchChildren |
| stream.ts | ~1.5kb | 0.8kb | 移除 markdown/code helper |
| suspense.ts | ~1.0kb | 0.4kb | 移除 lazy/useAsyncData |
| component.ts | ~0.5kb | 0kb | **完全移除** |
| **总计** | **~5.5kb** | **< 3kb** | |

### 具体路径

#### 第一阶段：快速瘦身 (预计降至 4kb)
1. ✅ 移除 component.ts 所有内置组件 helpers
2. ✅ 移除 suspense.ts 中的 lazy() 和 useAsyncData()
3. ✅ 关闭生产环境 sourcemap
4. ✅ 启用 minify

#### 第二阶段：架构重构 (预计降至 3kb)
1. 合并 diff.ts 到 renderer.ts
2. 简化 Stream 的 markdown/code 解析器 (移到 examples)
3. 优化 reactive 的 Effect 队列逻辑
4. 移除类型导出中的冗余部分

#### 第三阶段：极限优化 (预计降至 2.5kb)
1. 使用更紧凑的变量命名 (构建时)
2. 内联高频小函数
3. 移除所有 console.log 和调试代码
4. 优化 VNode 结构 (减少属性)

---

## 代码审核标准

### 所有 PR 必须满足

1. **体积检查**: 新增代码后 gzip 体积不能超过 3kb
2. **性能基准**: benchmarks/index.ts 所有测试必须通过
3. **API 简洁**: 新功能不能超过 2 行代码完成常见用例
4. **AI 契合**: 必须对 AI 场景有明确价值

### 直接否决的情况

❌ 引入新的依赖  
❌ 增加超过 100 行核心代码  
❌ 复制 React/Vue 的模式而无创新  
❌ 破坏向后兼容性而无迁移方案  
❌ 没有测试覆盖  

---

## 立即行动计划

```bash
# 1. 构建当前版本，确认基准
cd /Users/xinxintao/.openclaw/workspace/qore/packages/core
pnpm build
gzip -c dist/index.js | wc -c  # 记录当前大小

# 2. 执行重构 (按优先级)
# Phase 1: 移除冗余代码
# Phase 2: 合并模块
# Phase 3: 构建优化

# 3. 运行测试确保功能正常
pnpm test

# 4. 运行基准测试
pnpm bench
```

---

## 总结

**当前状态**: 方向正确，但执行过度

**核心问题**: 
- 想要太多功能，偏离"轻量级"定位
- 过度工程化 (diff 独立模块、组件 helpers)
- 体积超标 83% (5.5kb vs 3kb)

**优势**:
- Stream 设计是亮点，真正 AI-Native
- Signal 响应式系统简洁高效
- 代码质量高，测试完善

**下一步**: 
1. 立即执行第一阶段瘦身
2. 重新评估每个功能的必要性
3. 以 3kb 为硬性约束进行开发

---

**审核状态**: 🔴 **需要重构**  
**优先级**: P0 - 立即执行  
**预计完成**: 3 天内完成第一阶段
