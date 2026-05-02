import { createApp, computed, effect, h, list, show, signal, stream, text } from '../src/index.js';
import { renderMarkdown } from './render-markdown.js';

// Slice demo copy into small chunks so the homepage can visibly stream.
const chunkText = (value) => value.match(/```|`[^`]*`|\*\*[^*]+\*\*|\n|[^\s]{1,5}\s?/g) ?? [value];
const escapeHtml = (value = '') => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lineCount = (value) => value.trim().split('\n').length;

// Keep the homepage demo short, punchy, and immediately clickable.
const presets = [
  '为什么 stream 应该直接是 signal？',
  '给我一个最小 AI 聊天界面',
  '背压为什么值得做进核心层？',
  'Qore 为什么不做 UI 杂货铺？'
];

const qoreCode = `const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const reply = stream(openai.chat(prompt));

messages.update((items) => [
  ...items,
  { role: 'assistant', body: reply }
]);

return h('div', {}, text(() => reply()));`;

const reactCode = `const [input, setInput] = useState('');
const { messages, sendMessage, status } = useChat();

await sendMessage({ text: input });
setInput('');

return messages.map(renderMessage);`;

// Generate one compact markdown answer so the demo shows streaming, code, and structure at once.
function answerText(prompt, run) {
  const insight = prompt.includes('背压')
    ? '当 token 太快时，Qore 不把它当边缘 case，而是把节奏、排队和溢出策略放进同一个 stream primitive。'
    : prompt.includes('UI 杂货铺')
      ? 'Qore 不想做 Button 和 Dialog 的仓库。它只想让“正在生成的数据”直接长成 UI。'
      : prompt.includes('最小 AI 聊天')
        ? '聊天界面的核心其实很小：一条流进来，一个 signal 推进，一个文本节点更新。'
        : 'stream 负责流动，signal 负责响应。把它们合起来，AI UI 才不需要先拆成一地状态。';

  return `### Stream = Signal\n**Qore** 只抓一件事：流式响应。\n\n${insight}\n\n\`\`\`js\nconst openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });\nconst answer = stream(openai.chat(${JSON.stringify(prompt)}));\nreturn h('div', {}, text(() => answer()));\n\`\`\`\n\n第 ${run} 轮演示：同一条流，同时驱动聊天、Markdown 和纯文本镜像。`;
}

// Push the whole answer rapidly and let Qore's backpressure turn it into a paced UI experience.
function createAnswerStream(prompt, run) {
  return stream.withBackpressure(async ({ push }) => {
    for (const chunk of chunkText(answerText(prompt, run))) {
      push(chunk);
    }
  }, {
    interval: 28,
    buffer: 18,
    overflow: 'wait'
  });
}

// Apply lightweight highlighting to the static compare snippets.
function renderCode(code) {
  return escapeHtml(code)
    .replace(/\b(const|return|await|stream|text|createOpenAI|useState|useChat|sendMessage|messages)\b/g, '<span class="kw">$1</span>');
}

// Normalize message bodies because assistant entries can be plain text or live streams.
function currentMessageBody(body) {
  return typeof body === 'function' ? body() : body;
}

// Surface whether a message is still streaming so the transcript can label it.
function currentMessageLive(body) {
  return typeof body === 'function' && typeof body.streaming === 'function' && body.streaming();
}

// Small reusable stat tile for the runtime rail.
function Stat({ label, value, tone = 'default' }) {
  return h('article', { className: () => ['stat', { [`tone-${tone}`]: true }] },
    h('span', { className: 'stat-label' }, label),
    h('strong', { className: 'stat-value' }, text(value))
  );
}

// Reusable compare card so the home page stays terse.
function CompareCard({ title, badge, code, note }) {
  return h('article', { className: 'compare-card' },
    h('div', { className: 'compare-head' },
      h('strong', null, title),
      h('span', null, badge)
    ),
    h('div', { className: 'snippet' },
      h('pre', { innerHTML: renderCode(code) })
    ),
    h('p', { className: 'compare-note' }, note)
  );
}

createApp(() => {
  const draft = signal(presets[0]);
  const selectedPrompt = signal(presets[0]);
  const runCount = signal(0);
  const signalPushes = signal(0);
  const selectedCompare = signal('qore');
  const messages = signal([
    {
      role: 'assistant',
      body: '### Qore\n这里没有“等结果回来再渲染”。只有 stream 继续推进，UI 继续响应。'
    }
  ]);
  const activeResponse = signal(null);
  let feedElement = null;

  // Count actual signal updates so the homepage can prove the stream is alive.
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

  // Keep the demo transcript pinned to the latest streamed content.
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

  const buffered = computed(() => {
    const response = activeResponse();
    return response ? response.buffered() : 0;
  });

  const dropped = computed(() => {
    const response = activeResponse();
    return response ? response.dropped() : 0;
  });

  const currentAnswer = computed(() => {
    const response = activeResponse();
    return response ? response() : '点一个 prompt，右侧会同时看到 raw text、Markdown 和 token 轨迹。';
  });

  const currentMarkdown = computed(() => renderMarkdown(currentAnswer()));

  const latestTokens = computed(() => {
    const response = activeResponse();
    return response ? response.chunks().slice(-16) : [];
  });

  const runPrompt = (prompt = draft().trim() || presets[0]) => {
    const textValue = prompt.trim();

    if (!textValue) {
      return;
    }

    selectedPrompt(textValue);
    draft(textValue);
    runCount.update((count) => count + 1);

    const reply = createAnswerStream(textValue, runCount.peek());
    activeResponse(reply);

    messages.update((items) => [
      ...items,
      { role: 'user', body: textValue },
      { role: 'assistant', body: reply }
    ]);
  };

  return {
    onMount: () => runPrompt(selectedPrompt.peek()),
    // Keep the homepage compact: one headline, one proof, one compare, one closing push.
    view: () => h('main', { className: 'site' },
      h('header', { className: 'nav' },
        h('a', { className: 'brand', href: '#top' },
          h('span', { className: 'brand-mark' }, 'Q'),
          h('span', { className: 'brand-copy' },
            h('strong', null, 'Qore'),
            h('span', null, 'Streaming Response')
          )
        ),
        h('nav', { className: 'nav-links' },
          h('a', { className: 'nav-link', href: '#demo' }, 'Demo'),
          h('a', { className: 'nav-link', href: '#compare' }, 'Compare'),
          h('a', { className: 'nav-link', href: './examples/streaming-response.html' }, 'Focused Demo')
        )
      ),
      h('section', { className: 'hero', id: 'top' },
        h('div', { className: 'hero-copy' },
          h('p', { className: 'eyebrow' }, 'Qore / stream = signal'),
          h('h1', null,
            '让流',
            h('br'),
            h('span', { className: 'accent' }, '直接长成 UI')
          ),
          h('p', { className: 'lede' }, '一个面向流式 AI 的前端框架。少状态，少补丁，少解释；token 一来，界面就动。'),
          h('div', { className: 'hero-actions' },
            h('a', { className: 'solid-link', href: '#demo' }, 'Run Demo'),
            h('a', { className: 'ghost-link', href: './README.md' }, 'Read README')
          ),
          h('div', { className: 'feature-row' },
            h('span', { className: 'feature-pill' }, 'openai'),
            h('span', { className: 'feature-pill' }, 'anthropic'),
            h('span', { className: 'feature-pill' }, 'generic sse'),
            h('span', { className: 'feature-pill' }, 'backpressure')
          )
        ),
        h('aside', { className: 'hero-proof' },
          h('article', { className: 'hero-card hero-code' },
            h('span', { className: 'card-kicker' }, 'Small API'),
            h('pre', { className: 'api-line' },
              h('span', { className: 'kw' }, 'const'),
              ' openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })\n',
              h('span', { className: 'kw' }, 'const'),
              ' answer = stream(openai.chat(prompt))\n',
              h('span', { className: 'kw' }, 'return'),
              ' h(\'div\', {}, text(() => answer()))'
            )
          ),
          h('article', { className: 'hero-card hero-status' },
            h('span', { className: 'card-kicker' }, 'Live Proof'),
            h('div', { className: 'status-row' },
              h('span', { className: () => ['status-pill', `status-${status()}`] }, text(() => status())),
              h('span', { className: 'mini-pill' }, text(() => `${chunks()} chunks`)),
              h('span', { className: 'mini-pill' }, text(() => `${signalPushes()} pushes`))
            ),
            h('p', { className: 'hero-note' }, '同一个 shape，现在可以接 OpenAI、Anthropic，或者任何会吐 SSE 的后端。')
          )
        )
      ),
      h('section', { className: 'stage', id: 'demo' },
        h('div', { className: 'section-head compact' },
          h('span', { className: 'section-kicker' }, 'Demo'),
          h('h2', null, '麻雀虽小，五脏俱全'),
          h('p', null, '多轮、流式、Markdown、代码、背压，放进一个能一眼看懂的首页。')
        ),
        h('div', { className: 'stage-grid' },
          h('section', { className: 'panel chat-panel' },
            h('div', { className: 'panel-head' },
              h('div', null,
                h('span', { className: 'card-kicker' }, 'Live Chat'),
                h('strong', null, 'One stream, one transcript')
              ),
              h('span', { className: 'mini-pill subtle' }, text(() => `run ${runCount()}`))
            ),
            h('div', {
              className: 'feed',
              ref: (node) => {
                feedElement = node;
              }
            },
              list(messages, (message) => h('article', { className: () => ['message', message.role] },
                h('div', { className: 'message-meta' },
                  h('strong', null, message.role === 'assistant' ? 'Qore' : 'You'),
                  h('span', { className: 'message-state' }, text(() => currentMessageLive(message.body) ? 'streaming' : message.role === 'assistant' ? 'ready' : 'sent'))
                ),
                h('div', { className: 'markdown', innerHTML: () => renderMarkdown(currentMessageBody(message.body)) })
              ))
            ),
            h('div', { className: 'composer' },
              h('div', { className: 'preset-row' },
                presets.map((prompt) => h('button', {
                  className: () => ['preset', { active: selectedPrompt() === prompt }],
                  onclick: () => runPrompt(prompt)
                }, prompt))
              ),
              h('div', { className: 'composer-row' },
                h('input', {
                  value: draft,
                  oninput: (event) => draft(event.target.value),
                  onkeydown: (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      runPrompt();
                    }
                  },
                  placeholder: '问一个会流动的问题...'
                }),
                h('button', { onclick: () => runPrompt() }, 'Push')
              )
            )
          ),
          h('aside', { className: 'inspector' },
            h('div', { className: 'stats-grid' },
              Stat({ label: 'status', value: () => status(), tone: status() === 'streaming' ? 'live' : 'default' }),
              Stat({ label: 'chunks', value: () => String(chunks()) }),
              Stat({ label: 'buffered', value: () => String(buffered()), tone: buffered() > 0 ? 'warm' : 'default' }),
              Stat({ label: 'drops', value: () => String(dropped()) }),
              Stat({ label: 'chars', value: () => String(characters()) }),
              Stat({ label: 'pushes', value: () => String(signalPushes()) })
            ),
            h('article', { className: 'panel lens' },
              h('div', { className: 'panel-head' },
                h('div', null,
                  h('span', { className: 'card-kicker' }, 'Signal Lens'),
                  h('strong', null, 'One stream, three surfaces')
                ),
                h('span', { className: 'mini-pill subtle' }, 'same source')
              ),
              h('div', { className: 'lens-stack' },
                h('section', { className: 'lens-card' },
                  h('span', { className: 'lens-label' }, 'Raw text node'),
                  h('pre', { className: 'raw-preview' }, text(() => currentAnswer()))
                ),
                h('section', { className: 'lens-card' },
                  h('span', { className: 'lens-label' }, 'Rendered markdown'),
                  h('div', { className: 'markdown compact-markdown', innerHTML: () => currentMarkdown() })
                ),
                h('section', { className: 'lens-card' },
                  h('span', { className: 'lens-label' }, 'Recent tokens'),
                  h('div', { className: 'token-river' },
                    show(() => latestTokens().length > 0,
                      () => list(() => latestTokens(), (token) => h('span', { className: 'token' }, typeof token === 'string' ? token.trim() || '↵' : JSON.stringify(token))),
                      () => h('span', { className: 'placeholder' }, '触发一次流，token 会在这里排成一条河。')
                    )
                  )
                )
              )
            )
          )
        )
      ),
      h('section', { className: 'compare-strip', id: 'compare' },
        h('div', { className: 'section-head compact' },
          h('span', { className: 'section-kicker' }, 'Compare'),
          h('h2', null, '同一个问题，两种心智模型'),
          h('p', null, 'Qore 让 stream 直接进入 UI；React 仍然先管理聊天状态。')
        ),
        h('div', { className: 'compare-toggle' },
          h('button', {
            className: () => ['toggle', { active: selectedCompare() === 'qore' }],
            onclick: () => selectedCompare('qore')
          }, 'Qore'),
          h('button', {
            className: () => ['toggle', { active: selectedCompare() === 'react' }],
            onclick: () => selectedCompare('react')
          }, 'React')
        ),
        h('div', { className: 'compare-grid' },
          show(() => selectedCompare() === 'qore',
            () => CompareCard({
              title: 'Qore',
              badge: `${lineCount(qoreCode)} lines`,
              code: qoreCode,
              note: 'stream = signal。一个对象里同时拿当前值、状态和异步流。'
            }),
            () => CompareCard({
              title: 'React + AI SDK',
              badge: `${lineCount(reactCode)} lines`,
              code: reactCode,
              note: '依旧分成 input、messages、send、status 多个心智块。'
            })
          ),
          h('article', { className: 'mini-manifesto' },
            h('div', { className: 'mini-grid' },
              h('div', { className: 'mini-card' },
                h('span', { className: 'card-kicker' }, 'One primitive'),
                h('strong', null, 'stream = signal')
              ),
              h('div', { className: 'mini-card' },
                h('span', { className: 'card-kicker' }, 'Built in'),
                h('strong', null, 'backpressure')
              ),
              h('div', { className: 'mini-card' },
                h('span', { className: 'card-kicker' }, 'Focused'),
                h('strong', null, 'not a UI kit')
              )
            ),
            h('p', { className: 'closing-line' }, 'Qore 的官网不需要说很多。看一眼，点一下，流起来，就明白了。'),
            h('div', { className: 'footer-actions' },
              h('a', { className: 'ghost-link', href: './examples/streaming-response.html' }, 'Open Focused Demo'),
              h('a', { className: 'ghost-link', href: './examples/react-chat.jsx' }, 'View React Compare')
            )
          )
        )
      )
    )
  };
}).mount('#app');
