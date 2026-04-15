# @qore/devtools

Qore Framework 开发者工具 - 浏览器开发者工具扩展

## 功能特性

- 🔍 **组件树查看器** - 实时查看应用组件结构
- 📊 **响应式状态监控** - 追踪 Signal/Computed/Effect 的变化
- ⚡ **性能分析** - 渲染时间、更新频率统计
- 📈 **时间轴调试** - 事件追踪和历史记录
- 🔥 **热重载支持** - 开发时自动刷新

## 安装

```bash
pnpm add -D @qore/devtools
```

## 快速开始

### 基础使用

```typescript
import { createApp } from '@qore/core'
import { enableDevtools } from '@qore/devtools'

const app = createApp({
  // ... app config
})

// 启用 devtools
const devtools = enableDevtools(app, {
  enableComponentTree: true,
  enableStateMonitoring: true,
  enablePerformance: true,
  enableTimeline: true,
})

// 在开发完成后断开连接
// devtools.disconnect()
```

### 配置选项

```typescript
interface DevtoolsOptions {
  enableComponentTree?: boolean    // 启用组件树查看
  enableStateMonitoring?: boolean  // 启用状态监控
  enablePerformance?: boolean      // 启用性能分析
  enableTimeline?: boolean         // 启用时间轴
  enableHotReload?: boolean        // 启用热重载
  panelPosition?: 'bottom' | 'right' | 'window'
  autoConnect?: boolean            // 自动连接 Chrome DevTools
}
```

### 访问 Devtools 状态

```typescript
// 获取当前状态快照
const state = devtools.getState()
console.log(state.components) // 组件列表
console.log(state.signals)    // 信号列表
console.log(state.performance) // 性能指标

// 订阅状态变化
const unsubscribe = devtools.subscribe((state) => {
  console.log('State updated:', state)
})

// 取消订阅
unsubscribe()
```

### 浏览器扩展集成

Devtools 会自动暴露全局钩子 `window.__QORE_DEVTOOLS__`：

```javascript
// 在浏览器控制台访问
window.__QORE_DEVTOOLS__.getState()
window.__QORE_DEVTOOLS__.subscribe(callback)
```

## Chrome DevTools 面板

### 安装扩展

1. 克隆仓库
2. 运行 `pnpm build`
3. 在 Chrome 中打开 `chrome://extensions/`
4. 启用"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择 `packages/devtools/extension` 目录

### 使用面板

1. 打开 Chrome DevTools (F12)
2. 找到 "Qore" 面板
3. 查看组件树、状态、性能等信息

## API 参考

### `enableDevtools(app, options?)`

启用 Qore Devtools。

**参数:**
- `app`: Qore App 实例
- `options`: 可选配置对象

**返回:** DevtoolsInstance

### `DevtoolsInstance`

```typescript
interface DevtoolsInstance {
  disconnect: () => void
  getState: () => DevtoolsState
  subscribe: (callback: (state: DevtoolsState) => void) => () => void
}
```

### `DevtoolsState`

```typescript
interface DevtoolsState {
  components: ComponentNode[]    // 组件树
  signals: SignalNode[]          // 响应式信号
  computed: ComputedNode[]       // 计算值
  effects: EffectNode[]          // 副作用
  performance: PerformanceMetrics // 性能指标
  events: TimelineEvent[]        // 事件时间轴
}
```

## 性能指标

Devtools 会追踪以下性能指标：

- **totalRenders**: 总渲染次数
- **averageRenderTime**: 平均渲染时间
- **slowestComponent**: 最慢的组件
- **slowestRenderTime**: 最慢渲染时间
- **updatesPerSecond**: 每秒更新次数

## 钩子集成

Devtools 通过钩子系统与 Qore Core 集成：

```typescript
// packages/core/src/devtools-hook.ts
export const devtoolsHook = {
  onSignalCreate: (signal) => {},
  onSignalUpdate: (signal, oldValue, newValue) => {},
  onComponentRender: (component, props) => {},
  onEffectRun: (effect, deps) => {},
}
```

## 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 测试
pnpm test

# 测试覆盖率
pnpm test:coverage
```

## 许可证

MIT
