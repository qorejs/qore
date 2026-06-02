# Qore

Qore 是一个面向 AI 原生界面的 reactive stream runtime。

它的核心原语是 `stream = signal`：异步流本身也是一条只读 signal，所以 token、tool event、状态、markdown 片段和 diff 都可以直接进入 UI 状态。

## 安装

```bash
npm i @qorejs/qore
```

## 最小示例

```js
import { h, mount, stream, text } from '@qorejs/qore';

const answer = stream(model.chat('hello'));

mount('#app', () =>
  h('main', {}, text(() => answer()))
);
```

`answer()` 返回当前累积内容。UI 会随着 stream 更新，且只更新读取这条 signal 的节点。

## 文档

主 README 以英文为主。中文文档入口在官网 `/zh/`。
