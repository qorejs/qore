# Renderer API

Qore 的渲染器 API 提供高效的 DOM 操作和组件渲染能力。

## h - 创建虚拟节点

```typescript
function h(
  type: string | Component,
  props?: object,
  children?: Children[]
): VNode
```

**参数：**
- `type` - 标签名或组件函数
- `props` - 属性对象
- `children` - 子节点

**示例：**

```typescript
import { h } from '@qore/core';

// HTML 元素
const div = h('div', { class: 'container' }, [
  h('h1', {}, 'Hello World'),
  h('p', {}, 'Content')
]);

// 组件
const Button = (props) => h('button', { class: 'btn' }, props.label);
const button = h(Button, { label: 'Click me' });
```

---

## render - 渲染到 DOM

```typescript
function render(
  container: Element,
  component: Component
): void
```

**参数：**
- `container` - 目标 DOM 元素
- `component` - 要渲染的组件

**示例：**

```typescript
import { render, h } from '@qore/core';

const App = () => h('div', {}, 'Hello World');

const container = document.getElementById('app');
render(container, App);
```

---

## hydrate - 激活 SSR 内容

```typescript
function hydrate(
  container: Element,
  component: Component
): void
```

**参数：**
- `container` - 包含 SSR HTML 的元素
- `component` - 组件函数

**示例：**

```typescript
import { hydrate, h } from '@qore/core';

const App = () => h('div', {}, 'Hello World');

const container = document.getElementById('app');
hydrate(container, App); // 激活服务端渲染的内容
```

---

## text - 创建文本节点

```typescript
function text(value: string | number | Signal): VNode
```

**示例：**

```typescript
import { text, signal } from '@qore/core';

const count = signal(0);

// 动态文本节点
const textNode = text(count);

// 静态文本
const staticText = text('Hello');
```

---

## show - 条件渲染

```typescript
function show(
  condition: boolean | Signal<boolean> | (() => boolean),
  component: Component
): VNode | null
```

**示例：**

```typescript
import { show, signal } from '@qore/core';

const isVisible = signal(true);

const Conditional = () => {
  return h('div', {}, [
    show(isVisible, () => h('p', {}, 'Visible!')),
    show(() => !isVisible(), () => h('p', {}, 'Hidden!'))
  ]);
};
```

---

## For - 列表渲染

```typescript
function For<T>(
  items: Signal<T[]> | T[],
  renderItem: (item: T, index: number) => VNode
): VNode[]
```

**示例：**

```typescript
import { For, signal } from '@qore/core';

const items = signal(['A', 'B', 'C']);

const List = () => {
  return h('ul', {}, [
    ...For(items, (item) =>
      h('li', { key: item }, item)
    )
  ]);
};
```

**带索引：**

```typescript
For(items, (item, index) =>
  h('li', { key: index }, `${index}: ${item}`)
)
```

---

## Fragment - 片段

```typescript
function Fragment(props: { children: Children[] }): Children[]
```

**示例：**

```typescript
import { Fragment, h } from '@qore/core';

const List = () => {
  return h(Fragment, {}, [
    h('li', {}, 'Item 1'),
    h('li', {}, 'Item 2'),
    h('li', {}, 'Item 3')
  ]);
};

// 或简写
const List = () => [
  h('li', {}, 'Item 1'),
  h('li', {}, 'Item 2'),
  h('li', {}, 'Item 3')
];
```

---

## Portal - 传送门

```typescript
function Portal(
  props: {
    target: Element | string,
    children: Children[]
  }
): VNode
```

**示例：**

```typescript
import { Portal, h } from '@qore/core';

const Modal = () => {
  return h(Portal, { target: '#modal-root' }, [
    h('div', { class: 'modal' }, [
      h('div', { class: 'content' }, 'Modal content')
    ])
  ]);
};
```

---

## 性能优化

### 批处理更新

```typescript
import { batch, h, render } from '@qore/core';

const App = () => {
  const count = signal(0);
  const name = signal('Qore');
  
  const handleClick = () => {
    batch(() => {
      count(count() + 1);
      name('Updated');
    });
  };
  
  return h('button', { onclick: handleClick }, `${name()}: ${count()}`);
};
```

### 避免不必要的重新渲染

```typescript
// ❌ 不推荐 - 每次都会创建新对象
const Component = () => {
  return h('div', {
    style: { color: 'red' },
    onClick: () => console.log('click')
  });
};

// ✅ 推荐 - 复用对象
const style = { color: 'red' };
const handleClick = () => console.log('click');

const Component = () => {
  return h('div', { style, onClick: handleClick });
};
```

---

## 相关资源

- [组件系统指南](/guide/components)
- [核心概念](/guide/core-concepts)
- [示例代码](/examples/basic)
