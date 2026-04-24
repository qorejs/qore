# Qore

Qore 的灵魂只有四个字: `流式响应`。

Qore 不把数据当快照看待, 而是把数据视为一条持续推进的河流。AI token 一段一段地到来, UI 就应该一段一段地响应, 不需要用户手动拼字符串、维护临时 loading 状态, 或者把 partial render 当成例外情况处理。

## 核心定义

`stream` 是数据流动的方式, `signal` 是 UI 响应变化的方式。

在 Qore 里, 这两者是同一个 primitive 的两面:

```js
import { h, stream, text } from '@qorejs/qore';

const answer = stream(openAI.chat('hello'));

return h('div', {}, text(() => answer()));
```

这里的 `answer` 既是:

- 一个只读 `signal`, `answer()` 拿到当前累积值
- 一个 `AsyncIterable`, 可以继续 `for await ... of`
- 一个带生命周期的流状态, 自带 `status()`, `streaming()`, `error()`, `chunks()`

这就是 Qore 最核心的判断:

> 数据天生就是流动的, UI 天生就是响应的, 这两件事天然是一对。

## 为什么是 Qore

- React 把流式数据当特殊情况, 需要额外的心智负担去补
- SolidJS 的 signal 很强, 但没有原生的 stream primitive
- Vue 的 ref 很顺手, 但 stream 依旧是外置概念
- Qore 直接把 `stream = signal` 变成核心 API

## 最小示例

```js
import { h, stream, text } from '@qorejs/qore';

const response = stream(async function* () {
  yield '流';
  yield '式';
  yield '响应';
}());

const view = h('div', { className: 'answer' }, text(() => response()));
```

只会更新那一个 text node, 不会 whole tree 重绘。

## Demo

仓库里现在带了一个可以直接拿来展示的 landing page 和 focused demo:

- [index.html](/Users/xinxintao/workspace/qore/index.html)
- [examples/streaming-response.html](/Users/xinxintao/workspace/qore/examples/streaming-response.html)
- [examples/showcase.js](/Users/xinxintao/workspace/qore/examples/showcase.js)
- [examples/qore-chat.js](/Users/xinxintao/workspace/qore/examples/qore-chat.js)
- [examples/react-chat.jsx](/Users/xinxintao/workspace/qore/examples/react-chat.jsx)

展示内容包括:

- 首页式叙事
- 流式输出
- 多轮对话
- 安全的 Markdown 渲染
- 基础代码高亮
- 打字机式 token 推进
- Qore / React 代码表面对照

`examples/react-chat.jsx` 现在是基于当前 `useChat` 心智模型的对照稿, 用来比较代码表面积; 真正的性能 benchmark 还没有接入。

如果你想本地打开它:

```bash
cd /Users/xinxintao/workspace/qore
python3 -m http.server 4173
```

然后先访问 [http://localhost:4173/](http://localhost:4173/), 再点进 focused demo 看更纯粹的聊天版本。

## API 形状

### `stream(source, options?)`

默认把 chunk 累积成文本 signal:

```js
const answer = stream(openAI.chat('hello'));

answer();           // 当前文本
answer.status();    // idle | pending | streaming | completed | error | aborted
answer.streaming(); // boolean
answer.chunks();    // 原始 chunk 列表
await answer.ready; // 等待结束
```

如果你需要结构化流:

```js
const events = stream.list(eventSource);
const latest = stream.latest(modelEvents);
```

如果你需要控速:

```js
const answer = stream.paced(openAI.chat('hello'), 16);
```

或者更明确地声明 backpressure:

```js
const answer = stream.withBackpressure(openAI.chat('hello'), {
  interval: 16
});
```

这里的 `interval` 表示 chunk 进入 signal / UI 之间的最小间隔。对 `AsyncIterable` source 会自动生效; 对手写 producer, 只要 `await push(chunk)` 就会尊重这个节奏。

### `signal`, `computed`, `effect`

Qore 依旧保留细粒度响应系统, 但现在它最重要的职责是承接流:

```js
import { computed, signal, stream } from '@qorejs/qore';

const answer = stream(openAI.chat('hello'));
const length = computed(() => answer().length);
```

### `response`

`response` 还在, 但它是更底层的状态机 escape hatch, 适合复杂聚合或自定义 reducer。

如果你的问题是“把流直接接进 UI”, 优先使用 `stream(...)`。

## 框架边界

Qore 核心包不内置 Button、Dialog、Tabs 这类 UI primitives。

核心包只做三件事:

- 让流进入状态
- 让状态进入 UI
- 让整个过程保持细粒度响应

一切不服务于 `流式响应` 的东西, 都应该放到实验层或者外围仓库。

## 测试

```bash
npm test
```

当前测试覆盖了:

- signal / computed / effect
- stream = signal 的核心行为
- response 与 async iterable 的兼容

## 下一步

- 继续把 backpressure 从 pacing 扩展到更完整的 buffer / overflow 策略
- 围绕服务端流式渲染收敛 hydration 模型
- 为真实 LLM provider 做 adapter, 把对象 chunk 收敛成文本流或结构化流
