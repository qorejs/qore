import { createApp, computed, effect, fragment, h, list, show, signal, stream, text } from '../src/index.js';
import { renderMarkdown } from './render-markdown.js';

// Reuse tiny helpers so the landing page can demonstrate streaming without external services.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeHtml = (value = '') => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lineCount = (value) => value.trim().split('\n').length;
const chunkText = (value) => value.match(/```|`[^`]*`|\*\*[^*]+\*\*|\n|[^\s]{1,5}\s?/g) ?? [value];

// Offer curated prompts so a new visitor can see the core story with one click.
const presets = [
  '为什么 stream 应该直接是 signal？',
  '给我一个最小 AI 聊天界面',
  'Qore 为什么不是又一个 UI 库？',
  'backpressure 为什么值得做成一等能力？'
];

const qoreCode = `const answer = stream(openAI.chat(prompt));

return h('article', { className: 'reply' },
  text(() => answer())
);`;

const reactCode = `const [input, setInput] = useState('');
const { messages, sendMessage, status } = useChat();

const submit = async (event) => {
  event.preventDefault();
  await sendMessage({ text: input });
  setInput('');
};

return (
  <form onSubmit={submit}>
    <input value={input} onChange={(e) => setInput(e.target.value)} />
    {messages.map(renderMessage)}
    {status === 'streaming' ? <Typing /> : null}
  </form>
);`;

// Generate the narrative body shown in the landing page demo.
function answerText(prompt, run) {
  const libraryPitch = prompt.includes('UI 库')
    ? 'Qore 不想成为 Button、Dialog、Tabs 的集合。它只关心一件事：让正在生成的数据直接驱动界面。'
    : prompt.includes('backpressure')
      ? '当流是真正的一等 primitive 时，控速才不是补丁，而是系统能力。数据太快、UI 太慢、网络抖动，都可以在同一条流里治理。'
      : prompt.includes('最小')
        ? '如果聊天界面的核心只是“把 token 继续推给文本节点”，那代码就不该先长成状态管理教程。'
        : 'stream 是数据流动的方式，signal 是 UI 响应变化的方式。把它们拆开，开发者就得自己做桥。';

  return `### Stream = Signal\n**Qore** 的主张不是“AI 原生”，而是更具体的 **流式响应**。\n\n\`\`\`js\nconst answer = stream(openAI.chat(${JSON.stringify(prompt)}));\nreturn h('article', {}, text(() => answer()));\n\`\`\`\n\n${libraryPitch}\n\n第 ${run} 次演示里，Qore 只是在推进一个 signal；UI 只是在响应那条流。`;
}

// Yield the landing page answer in small chunks to make the stream tangible.
async function* answerFor(prompt, run) {
  for (const chunk of chunkText(answerText(prompt, run))) {
    yield chunk;
    await sleep(34);
  }
}

// Highlight keywords in the static comparison snippets.
function renderCode(code) {
  return escapeHtml(code).replace(/\b(const|return|await|stream|text|useState|useChat|sendMessage)\b/g, '<span class="kw">$1</span>');
}

// Normalize message bodies because some entries are plain strings and others are live streams.
function currentMessageBody(body) {
  return typeof body === 'function' ? body() : body;
}

// Surface whether a message body is still streaming so the UI can label it correctly.
function currentMessageLive(body) {
  return typeof body === 'function' && typeof body.streaming === 'function' && body.streaming();
}

// Reusable metric tile for the right-hand runtime summary rail.
function Metric({ label, value, note }) {
  return h('div', { className: 'metric' },
    h('span', { className: 'metric-label' }, label),
    h('span', { className: 'metric-value' }, text(value)),
    note ? h('span', { className: 'metric-note' }, text(note)) : null
  );
}

// Reusable code card so the compare section stays declarative.
function SnippetCard({ title, eyebrow, code, note }) {
  return h('article', { className: 'code-card' },
    h('div', { className: 'snippet-head' },
      h('strong', null, title),
      h('span', null, eyebrow)
    ),
    h('div', { className: 'snippet' },
      h('pre', { innerHTML: renderCode(code) })
    ),
    h('p', null, note)
  );
}

// Build the landing page as a reactive narrative around one live streaming response.
createApp(() => {
  const draft = signal(presets[0]);
  const selectedPrompt = signal(presets[0]);
  const selectedCode = signal('qore');
  const runCount = signal(0);
  const signalPushes = signal(0);
  const messages = signal([
    {
      role: 'assistant',
      body: '### Qore\n欢迎来到 `流式响应` 的主场。点一个 prompt，看看同一条 stream 怎么自然地穿过状态层和 UI。'
    }
  ]);
  const activeResponse = signal(null);
  let feedElement;

  // Count how many times the current stream actually pushes into the signal layer.
  effect(() => {
    const response = activeResponse();
    signalPushes(0);
    if (!response) {
      return undefined;
    }

    return response.subscribe(() => {
      signalPushes.update((count) => count + 1);
    }, { immediate: false });
  });

  // Keep the transcript pinned to the bottom as new streamed content arrives.
  effect(() => {
    messages();
    const response = activeResponse();
    if (response) {
      response.chunkCount();
    }

    requestAnimationFrame(() => {
      if (feedElement) {
        feedElement.scrollTop = feedElement.scrollHeight;
      }
    });
  });

  // Derive a few view-facing metrics from the currently active response.
  const status = computed(() => {
    const response = activeResponse();
    return response ? response.status() : 'idle';
  });

  const chunks = computed(() => {
    const response = activeResponse();
    return response ? response.chunkCount() : 0;
  });

  const characters = computed(() => {
    const response = activeResponse();
    return response ? response().length : 0;
  });

  const latestTokens = computed(() => {
    const response = activeResponse();
    return response ? response.chunks().slice(-18) : [];
  });

  const currentPrompt = computed(() => selectedPrompt());

  // Start a new showcase run from either the selected preset or the current draft.
  const runPrompt = (prompt = draft().trim() || presets[0]) => {
    const textValue = prompt.trim();
    if (!textValue) {
      return;
    }

    selectedPrompt(textValue);
    draft(textValue);
    runCount.update((count) => count + 1);
    const run = stream(answerFor(textValue, runCount.peek()));
    activeResponse(run);

    messages.update((items) => [
      ...items,
      { role: 'user', body: textValue },
      { role: 'assistant', body: run }
    ]);
  };

  return {
    onMount: () => runPrompt(selectedPrompt.peek()),
    // Organize the page as hero, live proof, compare view, and manifesto.
    view: () => h('main', { className: 'site' },
      h('header', { className: 'nav' },
        h('a', { className: 'brand', href: '#top' },
          h('span', { className: 'brand-mark' }, 'Q'),
          h('span', { className: 'brand-copy' },
            h('strong', null, 'Qore'),
            h('span', null, 'Streaming Response Framework')
          )
        ),
        h('nav', { className: 'nav-links' },
          h('a', { className: 'nav-link', href: '#playground' }, 'Playground'),
          h('a', { className: 'nav-link', href: '#compare' }, 'Compare'),
          h('a', { className: 'nav-link', href: './examples/streaming-response.html' }, 'Focused Demo')
        )
      ),
      h('section', { className: 'hero', id: 'top' },
        h('div', { className: 'hero-copy' },
          h('p', { className: 'eyebrow' }, 'Qore / Stream = Signal'),
          h('h1', null,
            '前端不该等待',
            h('br'),
            h('span', { className: 'accent' }, '河流变成快照。')
          ),
          h('p', { className: 'lede' }, 'Qore 让 stream 成为 signal。token 一到，状态就推进；状态一变，UI 就细粒度响应。没有手动拼字符串，没有把 streaming 当特殊情况补进框架。'),
          h('div', { className: 'cta-row' },
            h('a', { className: 'solid-link', href: '#playground' }, 'Run The Stream'),
            h('a', { className: 'ghost-link', href: './README.md' }, 'Read The README')
          )
        ),
        h('div', { className: 'hero-stack' },
          h('article', { className: 'hero-card' },
            h('h2', null, '一句话心智模型'),
            h('p', null, 'stream 是数据流动的方式，signal 是 UI 响应变化的方式。在 Qore 里，它们是同一个 primitive 的两面。'),
            h('code', { className: 'api-line' },
              h('span', { className: 'kw' }, 'const'),
              ' answer = stream(openAI.chat(prompt))'
            )
          ),
          h('article', { className: 'hero-card' },
            h('h2', null, '为什么会打到人'),
            h('div', { className: 'chip-row' },
              h('span', { className: () => ['chip', { live: status() === 'streaming' }] }, text(() => `status: ${status()}`)),
              h('span', { className: 'chip' }, text(() => `${chunks()} chunks`)),
              h('span', { className: 'chip' }, text(() => `${characters()} chars`)),
              h('span', { className: 'chip' }, 'single primitive')
            )
          )
        )
      ),
      h('section', { className: 'section', id: 'playground' },
        h('div', { className: 'section-head' },
          h('span', { className: 'section-kicker' }, 'Live Theater'),
          h('h2', null, '让首页自己证明 Qore 的主张'),
          h('p', null, '左边是正在流动的对话，右边是同一条流的运行时痕迹。别人不需要先读文档，10 秒内就能看懂 Qore 在解决什么。')
        ),
        h('div', { className: 'playground' },
          h('section', { className: 'panel' },
            h('div', {
              className: 'feed',
              ref: (node) => {
                feedElement = node;
              }
            },
              // The assistant body itself may be a stream, so rendering stays fully reactive.
              list(messages, (message) => h('article', { className: `message ${message.role}` },
                h('div', { className: 'meta' },
                  h('strong', null, message.role === 'assistant' ? 'Qore' : 'You'),
                  h('span', { className: 'state' }, text(() => currentMessageLive(message.body) ? 'streaming' : message.role === 'assistant' ? 'ready' : 'sent'))
                ),
                h('div', { className: 'markdown', innerHTML: () => renderMarkdown(currentMessageBody(message.body)) })
              ))
            ),
            h('div', { className: 'composer' },
              h('div', { className: 'pill-row' },
                presets.map((prompt) => h('button', {
                  className: () => ['pill-button', { active: selectedPrompt() === prompt }],
                  onclick: () => {
                    selectedPrompt(prompt);
                    draft(prompt);
                    runPrompt(prompt);
                  }
                }, prompt))
              ),
              h('label', null,
                h('span', null, 'Prompt'),
                h('input', {
                  value: draft,
                  oninput: (event) => draft(event.target.value),
                  onkeydown: (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      runPrompt();
                    }
                  },
                  placeholder: '问一个需要流式回答的问题...'
                })
              ),
              h('button', { onclick: () => runPrompt() }, 'Push Stream')
            )
          ),
          h('aside', { className: 'rail' },
            h('div', { className: 'metrics' },
              Metric({ label: 'status', value: () => status(), note: () => status() === 'streaming' ? '流还在推进' : '当前可再次触发' }),
              Metric({ label: 'chunks', value: () => String(chunks()), note: 'token / chunk 推进次数' }),
              Metric({ label: 'characters', value: () => String(characters()), note: '累积后的当前文本' }),
              Metric({ label: 'signal pushes', value: () => String(signalPushes()), note: '这一轮真正推进的响应次数' })
            ),
            h('article', { className: 'trace-card' },
              h('h3', null, '运行时轨迹'),
              h('p', null, text(() => `当前 prompt: ${currentPrompt()}`)),
              h('div', { className: 'trace-list' },
                // Explain the full handoff from provider chunks to text-node updates.
                h('div', { className: () => ['trace-step', { active: status() !== 'idle' }] },
                  h('span', { className: 'trace-index' }, '1'),
                  h('div', null,
                    h('strong', null, 'Provider emits tokens'),
                    h('span', { className: 'muted' }, '数据先以流的形式到来，而不是等完整快照。')
                  )
                ),
                h('div', { className: () => ['trace-step', { active: status() === 'streaming' || status() === 'completed' }] },
                  h('span', { className: 'trace-index' }, '2'),
                  h('div', null,
                    h('strong', null, 'stream becomes signal'),
                    h('span', { className: 'muted' }, '同一条 primitive 同时拥有 AsyncIterable 和 signal 的能力。')
                  )
                ),
                h('div', { className: () => ['trace-step', { active: chunks() > 0 }] },
                  h('span', { className: 'trace-index' }, '3'),
                  h('div', null,
                    h('strong', null, 'text node updates'),
                    h('span', { className: 'muted' }, 'UI 只绑定到一个 getter：text(() => answer())。')
                  )
                )
              ),
              h('div', { className: 'token-river' },
                show(() => latestTokens().length > 0,
                  // Surface recent chunks as a visual "river" beside the transcript.
                  () => list(() => latestTokens(), (token) => h('span', { className: 'token' }, typeof token === 'string' ? token.trim() || '↵' : JSON.stringify(token))),
                  () => h('span', { className: 'muted' }, '触发一次流，最近的 chunk 会在这里留下痕迹。')
                )
              )
            ),
            h('article', { className: 'trace-card' },
              h('h3', null, '一个心智模型，两个世界'),
              h('p', null, 'Qore 的核心不是“多一个功能”，而是“少一个裂缝”。流的世界和响应式 UI 的世界，在这里终于是同一个世界。')
            )
          )
        )
      ),
      h('section', { className: 'section', id: 'compare' },
        h('div', { className: 'section-head' },
          h('span', { className: 'section-kicker' }, 'Code Surface'),
          h('h2', null, '同一个聊天界面，Qore 和 React 分别长什么样'),
          h('p', null, '这里不是为了贬低 React，而是为了把 Qore 的切口说清楚：React 把 stream 视作要管理的外部状态，Qore 直接把 stream 变成 UI 可读取的信号。')
        ),
        h('div', { className: 'tabs' },
          h('button', {
            className: () => ['tab-button', { active: selectedCode() === 'qore' }],
            onclick: () => selectedCode('qore')
          }, 'Qore'),
          h('button', {
            className: () => ['tab-button', { active: selectedCode() === 'react' }],
            onclick: () => selectedCode('react')
          }, 'React')
        ),
        h('div', { className: 'compare-grid' },
          show(() => selectedCode() === 'qore',
            () => fragment(
              SnippetCard({
                title: 'Qore',
                eyebrow: `${lineCount(qoreCode)} lines`,
                code: qoreCode,
                note: 'stream 直接是 signal。读当前值、追踪状态、驱动文本节点，都在同一个对象上发生。'
              }),
              h('article', { className: 'code-card' },
                h('h3', null, '为什么这会更短'),
                h('div', { className: 'code-legend' },
                  h('span', { className: 'legend-chip' }, '不单独拼接字符串'),
                  h('span', { className: 'legend-chip' }, '不维护额外 loading state'),
                  h('span', { className: 'legend-chip' }, '不把 partial render 当例外')
                ),
                h('p', null, '这不是语法糖胜利，而是 primitive 选对之后，很多外围动作会自然消失。')
              )
            ),
            () => fragment(
              SnippetCard({
                title: 'React + Vercel AI SDK',
                eyebrow: `${lineCount(reactCode)} lines`,
                code: reactCode,
                note: '这份对照稿使用当前 useChat 心智模型：input 自管，sendMessage 触发请求，status 单独追踪。'
              }),
              h('article', { className: 'code-card' },
                h('h3', null, '诚实地说'),
                h('p', null, '真正的渲染性能 benchmark 还没有接进仓库。我现在展示的是代码表面积和心智模型差异，不是假装已经跑过的实验数据。')
              )
            )
          )
        )
      ),
      h('section', { className: 'section' },
        h('div', { className: 'section-head' },
          h('span', { className: 'section-kicker' }, 'Manifesto'),
          h('h2', null, '让人记住 Qore 的，不该是组件数量，而是判断力'),
          h('p', null, '如果核心叙事站稳，backpressure、hydration、model loader 都不再是散落的 feature，而是“流式响应”这条主线的自然延伸。')
        ),
        h('div', { className: 'manifesto-grid' },
          h('article', { className: 'manifesto-card' },
            h('h3', null, '一个原语'),
            h('p', null, '把 stream 和 signal 合到一起，让“数据在流动”这件事直接成为 UI 世界的一等事实。')
          ),
          h('article', { className: 'manifesto-card' },
            h('h3', null, '一次减法'),
            h('p', null, '核心包不装作一切都要做。与流式响应无关的 primitives、widgets、样式系统，都应该退到外围。')
          ),
          h('article', { className: 'manifesto-card' },
            h('h3', null, '一个未来'),
            h('p', null, '当数据天然是河流，backpressure、服务端渐进激活、模型流式装载就都成了同一门语言的不同章节。')
          )
        ),
        h('article', { className: 'quote' },
          h('p', null,
            h('strong', null, 'Qore 的灵魂只有四个字：流式响应。'),
            ' 不是“AI 原生”这种泛词，而是更具体的判断：让数据像水流一样进入你的 UI，而不是一截一截地搬。'
          )
        )
      ),
      h('section', { className: 'section' },
        h('div', { className: 'footer-grid' },
          h('article', { className: 'footer-note' },
            h('h2', null, '下一步还能继续打磨'),
            h('p', null, '现在这个仓库已经有了一个能被记住的中心：stream = signal。接下来最值得做的，是把真实 provider adapter 和真正的 benchmark harness 接进来。'),
            h('div', { className: 'footer-links' },
              h('a', { className: 'ghost-link', href: './README.md' }, 'Read README'),
              h('a', { className: 'ghost-link', href: './examples/streaming-response.html' }, 'Open Focused Demo'),
              h('a', { className: 'ghost-link', href: './examples/react-chat.jsx' }, 'View React Compare')
            )
          ),
          h('article', { className: 'footer-note' },
            h('h2', null, '仓库里的重点文件'),
            h('p', null, '运行时在 `src/stream.js`、`src/signal.js`、`src/dom.js`。展示层在 `index.html`、`examples/showcase.js` 和 `examples/streaming-response.html`。'),
            h('p', null, '如果有人只看一个例子，就让他先看首页，再点进 focused demo。先被概念打中，再去看细节。')
          )
        )
      )
    )
  };
}).mount('#app');
