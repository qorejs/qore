# Qore

Qore 的灵魂只有四个字：`流式响应`。

它不是把数据当快照，而是把数据当河流。token 一段一段地到来，UI 就应该一段一段地响应，不需要手动拼字符串，不需要到处补 `loading`，也不需要把 partial render 当成特例处理。

## Installation

```bash
npm i @qorejs/qore
```

- Package name: `@qorejs/qore`
- Module format: `ESM`
- Supported runtime: `Node >= 18`

## Core Idea

`stream` 是数据流动的方式，`signal` 是 UI 响应变化的方式。

在 Qore 里，这两者是同一个 primitive 的两面：

```js
import { createOpenAI, h, stream, text } from '@qorejs/qore';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const answer = stream(openai.chat('hello'));

return h('div', {}, text(() => answer()));
```

这里的 `answer` 同时是：

- 一个只读 `signal`，`answer()` 拿到当前累积值
- 一个 `AsyncIterable`，可以继续 `for await...of`
- 一个带生命周期的流状态，支持 `status()`、`streaming()`、`error()`、`chunks()`

## Why Qore

- React 把 stream 当成特殊情况，需要额外心智去补
- SolidJS 的 signal 很强，但没有原生 stream primitive
- Vue 的 ref 很顺手，但 stream 依旧是外置概念
- Qore 直接把 `stream = signal` 做成核心 API

## Quick Start

```js
import { h, mount, stream, text } from '@qorejs/qore';

const answer = stream(async function* () {
  yield '流';
  yield '式';
  yield '响应';
}());

mount('#app', () => h('div', { className: 'answer' }, text(() => answer())));
```

上面这个例子只会更新那一个 text node，不会 whole tree 重绘。

## Providers

### `createOpenAI(options?)`

```js
import { createOpenAI, stream } from '@qorejs/qore';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5'
});

const answer = stream(openai.chat('Why should stream be signal?'));
```

### `createAnthropic(options?)`

```js
import { createAnthropic, stream } from '@qorejs/qore';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514'
});

const answer = stream(anthropic.chat('Why should stream be signal?'));
```

### `createSSEAdapter(options?)`

如果你的后端本来就已经在吐 SSE，Qore 也可以直接把它收编进同一个 story：

```js
import { createSSEAdapter, stream } from '@qorejs/qore';

const provider = createSSEAdapter({
  name: 'Local Chat',
  url: 'http://localhost:3000/api/chat',
  buildRequest(request) {
    return {
      method: 'POST',
      body: JSON.stringify(request)
    };
  },
  buildChatRequest(input) {
    return { prompt: input };
  },
  eventToText(event) {
    return event.data?.type === 'token' ? event.data.text : undefined;
  }
});

const answer = stream(provider.chat('hello'));
```

这让 `stream(provider.chat(...))` 不再绑定某一家 SDK，而是成为一个通用入口。

## API Shape

### `stream(source, options?)`

默认把 chunk 累积成文本 signal：

```js
const answer = stream(openai.chat('hello'));

answer();           // 当前文本
answer.status();    // idle | pending | streaming | completed | error | aborted
answer.streaming(); // boolean
answer.chunks();    // 原始 chunk 列表
await answer.ready; // 等待结束
```

如果你需要结构化流：

```js
const events = stream.list(eventSource);
const latest = stream.latest(modelEvents);
```

### Backpressure

```js
const answer = stream.withBackpressure(openai.chat('hello'), {
  interval: 16,
  buffer: 8,
  overflow: 'drop-oldest'
});
```

backpressure 现在不只是“睡一下”：

- `interval`：chunk 进入 signal / UI 之间的最小间隔
- `buffer`：在 UI 前面最多允许排队多少个 chunk
- `overflow`：缓冲区满了以后怎么办，可选 `wait` / `drop-oldest` / `drop-newest` / `error`

你还可以直接观察压力状态：

```js
answer.buffered(); // 当前还有多少 chunk 在排队
answer.dropped();  // 因 overflow 策略被丢掉了多少 chunk
```

### `signal`, `computed`, `effect`

```js
import { computed, signal, stream } from '@qorejs/qore';

const answer = stream(openai.chat('hello'));
const length = computed(() => answer().length);
```

### `response`

`response` 仍然保留，但它更像底层状态机 escape hatch，适合复杂 reducer 或自定义聚合。

如果你的目标是“把流直接接进 UI”，优先使用 `stream(...)`。

## Demos

仓库里带了完整 landing page 和 focused demo：

- [Landing Page Source](https://github.com/qorejs/qore/blob/main/index.html)
- [Homepage Logic](https://github.com/qorejs/qore/blob/main/examples/showcase.js)
- [Homepage Styles](https://github.com/qorejs/qore/blob/main/examples/showcase.css)
- [Focused Demo](https://github.com/qorejs/qore/blob/main/examples/streaming-response.html)
- [Focused Chat Logic](https://github.com/qorejs/qore/blob/main/examples/qore-chat.js)
- [React Compare](https://github.com/qorejs/qore/blob/main/examples/react-chat.jsx)

本地预览：

```bash
git clone git@github.com:qorejs/qore.git
cd qore
python3 -m http.server 4173
```

然后打开 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)。

## Package Boundary

Qore 核心包不内置 Button、Dialog、Tabs 这类 UI primitives。

核心包只做三件事：

- 让流进入状态
- 让状态进入 UI
- 让整个过程保持细粒度响应

一切不服务于 `流式响应` 的东西，都应该放到实验层或者外围仓库。

## Testing

```bash
npm test
```

当前测试覆盖了：

- signal / computed / effect
- stream = signal 的核心行为
- response 与 async iterable 的兼容
- OpenAI / Anthropic / generic SSE adapters

## Roadmap

- 围绕服务端流式渲染收敛 hydration 模型
- 做公开 benchmark，把 Qore 和 React/Vercel AI SDK 的差异变成可重复的数据
