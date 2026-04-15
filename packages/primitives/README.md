# @qore/primitives

Qore Framework UI 原语库 - 无样式、完全可访问的组件库

## 特性

- 🎨 **无样式 (Headless)** - 完全控制样式
- ♿ **完全可访问** - ARIA 支持，键盘导航
- 📘 **TypeScript 优先** - 完整的类型定义
- 🌐 **支持 SSR** - 服务端渲染友好
- 🎯 **受控/非受控** - 灵活的状态管理

## 安装

```bash
pnpm add @qore/primitives
```

## 组件列表

### 表单组件

- **Button** - 按钮
- **Input** - 输入框
- **Textarea** - 多行文本框
- **Select** - 下拉选择
- **Checkbox** - 复选框
- **RadioGroup** - 单选组
- **Switch** - 开关

### 反馈组件

- **Dialog** - 对话框
- **Toast** - 提示框
- **Tooltip** - 工具提示

### 导航组件

- **Tabs** - 标签页

## 快速开始

### Button 按钮

```tsx
import { Button } from '@qore/primitives'

// 基础用法
<Button variant="primary" size="md">
  点击我
</Button>

// 禁用状态
<Button disabled>禁用</Button>

// 加载状态
<Button loading>加载中...</Button>

// 变体
<Button variant="secondary">次要</Button>
<Button variant="ghost">幽灵</Button>
<Button variant="danger">危险</Button>
```

### Input 输入框

```tsx
import { Input } from '@qore/primitives'

// 非受控
<Input placeholder="请输入" />

// 受控
const [value, setValue] = signal('')
<Input value={value()} onChange={setValue} />

// 带标签
<Input label="邮箱" type="email" required />

// 错误状态
<Input error="此字段为必填项" />

// 带图标
<Input 
  leftIcon={<SearchIcon />}
  placeholder="搜索..."
/>
```

### Checkbox 复选框

```tsx
import { Checkbox } from '@qore/primitives'

// 非受控
<Checkbox label="接受条款" />

// 受控
const [checked, setChecked] = signal(false)
<Checkbox 
  checked={checked()} 
  onChange={setChecked}
  label="订阅通讯"
/>

// 不确定状态
<Checkbox indeterminate label="全选" />
```

### Dialog 对话框

```tsx
import { Dialog, Button } from '@qore/primitives'

const [open, setOpen] = signal(false)

<>
  <Button onClick={() => setOpen(true)}>打开对话框</Button>
  
  <Dialog
    open={open()}
    onOpenChange={setOpen}
    title="确认"
    footer={
      <>
        <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
        <Button variant="primary">确认</Button>
      </>
    }
  >
    <p>确定要执行此操作吗？</p>
  </Dialog>
</>
```

### Toast 提示

```tsx
import { ToastProvider, success, error } from '@qore/primitives'

// 在应用根组件包裹
<ToastProvider position="top-right">
  <App />
</ToastProvider>

// 在任何地方使用
success('操作成功！')
error('操作失败')
warning('请注意')
info('提示信息')

// 带标题
success('保存成功', '文档已更新')

// 自定义时长
addToast({
  type: 'success',
  message: '操作成功',
  duration: 3000,
})
```

### Tabs 标签页

```tsx
import { Tabs, TabPanel } from '@qore/primitives'

const tabs = [
  { id: 'tab1', label: '概览' },
  { id: 'tab2', label: '设置' },
  { id: 'tab3', label: '消息' },
]

<Tabs tabs={tabs}>
  <TabPanel tabId="tab1">概览内容</TabPanel>
  <TabPanel tabId="tab2">设置内容</TabPanel>
  <TabPanel tabId="tab3">消息内容</TabPanel>
</Tabs>
```

## 组件 API

### Button

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  children?: ComponentChildren
}
```

### Input

```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | ...
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'outlined'
  disabled?: boolean
  readOnly?: boolean
  error?: boolean | string
  value?: string | number
  onChange?: (value: string) => void
  label?: string
  helperText?: string
}
```

### Dialog

```typescript
interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: ComponentChildren
  description?: ComponentChildren
  footer?: ComponentChildren
  closeable?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}
```

## 样式定制

Primitives 是无样式的，你需要提供自己的 CSS：

```css
/* 示例 Button 样式 */
.qore-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
}

.qore-button-primary {
  background: #0070f3;
  color: white;
}

.qore-button-primary:hover {
  background: #0060df;
}

.qore-button-secondary {
  background: #e0e0e0;
  color: #333;
}

/* 更多样式... */
```

## 可访问性

所有组件都遵循 WAI-ARIA 规范：

- ✅ 正确的 ARIA 属性
- ✅ 键盘导航支持
- ✅ 焦点管理
- ✅ 屏幕阅读器友好

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
