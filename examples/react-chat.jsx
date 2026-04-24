import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { renderMarkdown } from './render-markdown.js';

const presets = [
  '为什么 stream 应该直接是 signal？',
  '给我一个最小 AI 聊天界面',
  'Qore 为什么不是又一个 UI 库？'
];

export function Chat() {
  const [input, setInput] = useState(presets[0]);
  const feedRef = useRef(null);
  const { messages, sendMessage, status, stop } = useChat();

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, status]);

  const cards = useMemo(() => messages.map((message, index) => {
    const content = (message.parts ?? [])
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');

    return {
      id: message.id,
      role: message.role,
      live: status === 'streaming' && index === messages.length - 1 && message.role === 'assistant',
      html: renderMarkdown(content)
    };
  }), [messages, status]);

  const submit = async (event) => {
    event.preventDefault();

    const text = input.trim();
    if (!text) {
      return;
    }

    setInput('');
    await sendMessage({ text });
  };

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">React / Vercel AI SDK</p>
        <h1>Stream is still managed around the UI</h1>
      </section>
      <section className="panel">
        <div className="composer">
          <span>Presets</span>
          <div className="pill-row">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`pill-button ${input === preset ? 'active' : ''}`}
                onClick={() => setInput(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <div className="feed" ref={feedRef}>
          {cards.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="meta">
                <strong>{message.role === 'assistant' ? 'Assistant' : 'You'}</strong>
                <span className="state">{message.live ? 'typing...' : 'done'}</span>
              </div>
              <div className="markdown" dangerouslySetInnerHTML={{ __html: message.html }} />
            </article>
          ))}
        </div>
        <form className="composer" onSubmit={submit}>
          <span>Prompt</span>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask something..." />
          <div className="pill-row">
            <button type="submit">Send</button>
            {status === 'streaming' ? (
              <button type="button" className="ghost-link" onClick={stop}>
                Stop
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}
