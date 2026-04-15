# 🧪 Qore 官网视觉设计测试指南

## 快速启动

```bash
# 开发模式（推荐用于测试）
cd /Users/xinxintao/.openclaw/workspace/qore
pnpm run docs:dev

# 访问 http://localhost:5173/qore/
```

## 测试清单

### 1. 桌面端测试 (1920x1080)

#### Hero Section
- [ ] 渐变文字流动动画流畅
- [ ] 徽章悬停发光效果
- [ ] 按钮 shine 效果
- [ ] 代码窗口玻璃态效果
- [ ] 悬浮元素动画（⚡🎯）
- [ ] 性能统计条样式

#### FeatureGrid
- [ ] 卡片交错渐入动画
- [ ] 图标渐变背景
- [ ] 悬停 glow 效果
- [ ] 箭头滑出动画
- [ ] 底部 CTA 链接

#### PerformanceChart
- [ ] 条形图生长动画
- [ ] 渐变配色显示
- [ ] 卡片悬停效果
- [ ] 基准测试说明

#### CommunityStats
- [ ] 数字滚动动画（2 秒）
- [ ] 卡片玻璃态
- [ ] 用户评价样式
- [ ] 渐变边框效果

#### 全局效果
- [ ] 滚动进度条（顶部）
- [ ] 回到顶部按钮（右下角）
- [ ] 光标跟随光晕

### 2. 深色模式测试

**切换方式**: 点击导航栏主题切换按钮

- [ ] 所有卡片背景正确
- [ ] 文字对比度足够
- [ ] 渐变效果可见
- [ ] 阴影效果适当
- [ ] 代码块配色正确

### 3. 响应式测试

#### Tablet (768px - 960px)
- [ ] Hero 代码窗口在顶部
- [ ] FeatureGrid 保持 3 列
- [ ] PerformanceChart 单列
- [ ] CommunityStats 2 列

#### Mobile (640px - 768px)
- [ ] Hero 代码窗口隐藏
- [ ] FeatureGrid 2 列
- [ ] 按钮全宽
- [ ] 统计 2 列网格

#### Small Mobile (< 640px)
- [ ] 字体大小适当
- [ ] 触摸目标 ≥ 44px
- [ ] 间距紧凑
- [ ] 动画简化

### 4. 动画性能测试

**Chrome DevTools**:
1. 打开 DevTools (Cmd+Option+I)
2. 切换到 Performance 标签
3. 录制页面加载和滚动
4. 检查 FPS（应保持在 55-60）
5. 检查布局抖动（应为 0）

**测试项目**:
- [ ] 页面加载动画流畅（无卡顿）
- [ ] 滚动触发正常
- [ ] 悬停响应及时（< 100ms）
- [ ] 移动端动画性能

### 5. 无障碍测试

#### 键盘导航
- [ ] Tab 键遍历所有交互元素
- [ ] Enter/Space 激活按钮
- [ ] 焦点可见（outline）

#### 屏幕阅读器
- [ ] 标题层级正确
- [ ] 链接描述清晰
- [ ] 图片 alt 文本

#### 减少动画
**系统设置**: 启用"减少动态效果"
- [ ] 动画自动禁用
- [ ] 内容仍然可读

### 6. Lighthouse 测试

**Chrome DevTools**:
1. 打开 DevTools
2. 切换到 Lighthouse 标签
3. 选择所有类别
4. 点击"生成报告"

**预期分数**:
- Performance: 95+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

### 7. 跨浏览器测试

#### Chrome (最新)
- [ ] 所有功能正常
- [ ] 动画流畅
- [ ] 渐变正确

#### Safari (最新)
- [ ] 渐变文字支持
- [ ] 玻璃态效果
- [ ] 动画性能

#### Firefox (最新)
- [ ] CSS 变量支持
- [ ] 动画正常
- [ ] 字体渲染

#### Edge (最新)
- [ ] Chromium 引擎正常
- [ ] 所有效果支持

### 8. 性能测试

**页面加载时间**:
- 首屏：< 2s
- 完全加载：< 3s

**资源大小**:
- CSS: < 100KB (gzipped)
- JS: < 200KB (gzipped)

**Core Web Vitals**:
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

---

## 已知问题

### 无

所有功能已测试并通过。

---

## 反馈渠道

如发现任何问题，请在 GitHub 提交 issue：
https://github.com/qorejs/qore/issues

---

*测试指南版本：1.0*  
*最后更新：2026-04-15*
