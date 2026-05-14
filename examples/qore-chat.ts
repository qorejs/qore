import { createApp, h, list, signal, stream, text } from '../src/index.js';
import { renderMarkdown } from './render-markdown.js';
import type { QoreStream } from '../src/core/stream-types.js';

type ChatRole = 'assistant' | 'user';
type ChatBody = string | QoreStream<string, string>;

interface ChatMessage {
  role: ChatRole;
  body: ChatBody;
}

type InputLikeEvent = Event & {
  target: HTMLInputElement;
};

type KeyLikeEvent = KeyboardEvent & {
  target: HTMLInputElement;
};

// Sleep between emitted chunks so the focused demo visibly streams.
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
// Yield a synthetic answer token-by-token to demonstrate stream-driven UI updates.
async function* answerFor(prompt: string, turn: number): AsyncIterable<string> {
  const reply = `### Stream = Signal\n**Qore** 让数据像水一样流进 UI。\n\n\`\`\`js\nconst answer = stream(openAI.chat(${JSON.stringify(prompt)}));\nreturn h('div', {}, text(() => answer()));\n\`\`\`\n\n这是第 ${turn} 轮对话。这里没有“等加载结束再渲染”，只有 token 推进。`;
  for (const token of reply.match(/[^\n]{1,4}|\n/g) ?? []) {
    yield token;
    await sleep(28);
  }
}
// Mount a minimal chat experience that keeps message history as plain reactive state.
createApp(() => {
  const draft = signal('为什么 Qore 的灵魂是流式响应？');
  const messages = signal<ChatMessage[]>([
    { role: 'assistant', body: '### Qore\n问我一个问题, 我会用 **stream = signal** 的方式直接流进界面。' }
  ]);
  // Convert the current prompt into a live stream and append it to the conversation.
  const send = (): void => {
    const prompt = draft().trim();
    if (!prompt) return;
    draft('');
    const turn = Math.floor(messages.peek().length / 2) + 1;
    const answer = stream(answerFor(prompt, turn));
    messages.update((items) => [...items, { role: 'user', body: prompt }, { role: 'assistant', body: answer }]);
  };
  return {
    onMount: send,
    // Render the focused demo around one central idea: a message body can literally be a stream.
    view: () => h('main', { className: 'shell', 'data-testid': 'focused-demo' },
      h('div', { className: 'masthead' },
        h('a', { className: 'home-link', href: '../index.html', 'data-testid': 'focused-home-link' }, 'Back To Landing'),
        h('span', { className: 'demo-badge' }, 'Focused Demo')
      ),
      h('section', { className: 'hero' },
        h('p', { className: 'eyebrow' }, 'Qore / Streaming Response'),
        h('h1', null, '让数据像水流一样进入你的 UI'),
        h('p', { className: 'lede' }, 'stream 是数据流动的方式, signal 是 UI 响应变化的方式。在 Qore 里, 它们是同一个 primitive。')
      ),
      h('section', { className: 'panel' },
        h('div', { className: 'feed', 'data-testid': 'focused-feed' },
          list(messages, (message) => {
            // Assistant entries may still be streaming, so resolve body and status lazily.
            const body = (): string => typeof message.body === 'function' ? message.body() : message.body;
            const live = (): boolean => typeof message.body === 'function' && message.body.streaming();
            return h('article', { className: `message ${message.role}`, 'data-testid': `focused-message-${message.role}` },
              h('div', { className: 'meta' },
                h('strong', null, message.role === 'assistant' ? 'Qore' : 'You'),
                h('span', { className: 'state', 'data-testid': `focused-state-${message.role}` }, text(() => live() ? 'typing...' : message.role === 'assistant' ? 'done' : 'sent'))
              ),
              h('div', { className: 'markdown', innerHTML: () => renderMarkdown(body()) })
            );
          })
        ),
        h('label', { className: 'composer' },
          h('span', null, 'Prompt'),
          h('input', {
            'data-testid': 'focused-input',
            value: draft,
            oninput: (event: Event) => draft((event as InputLikeEvent).target.value),
            onkeydown: (event: KeyboardEvent) => {
              const keyboardEvent = event as KeyLikeEvent;
              if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
                keyboardEvent.preventDefault();
                send();
              }
            },
            placeholder: '问一个需要流式回答的问题...'
          }),
          h('button', { onclick: send, 'data-testid': 'focused-send' }, 'Send')
        )
      )
    )
  };
}).mount('#app');
