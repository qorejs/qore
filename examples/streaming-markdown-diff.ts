import { stream } from '../src/index.js';
import type { QoreEventStream, QoreStream, StreamInput } from '../src/index.js';

export type MarkdownDiffEvent =
  | { type: 'status'; label: string }
  | { type: 'markdown'; text: string }
  | { type: 'diff'; patch: string }
  | { type: 'artifact'; title: string; body: string };

type EventOf<TType extends MarkdownDiffEvent['type']> = Extract<MarkdownDiffEvent, { type: TType }>;

export interface StreamingMarkdownDiffDemo {
  events: QoreEventStream<MarkdownDiffEvent>;
  markdown: QoreStream<EventOf<'markdown'>, string>;
  diff: QoreStream<EventOf<'diff'>, string>;
  status: QoreStream<EventOf<'status'>, Array<EventOf<'status'>>>;
  artifacts: QoreStream<EventOf<'artifact'>, Array<EventOf<'artifact'>>>;
}

export const markdownDiffTimeline: MarkdownDiffEvent[] = [
  { type: 'status', label: 'planning sections' },
  { type: 'markdown', text: '## Streaming Markdown\n' },
  { type: 'markdown', text: 'Qore keeps generated prose reactive while it is still arriving.\n' },
  { type: 'diff', patch: '+ const answer = stream(provider.chat(prompt))\n' },
  { type: 'diff', patch: '+ return text(() => answer())\n' },
  { type: 'artifact', title: 'Rendered preview', body: 'Markdown and diff are selected from the same event stream.' },
  { type: 'status', label: 'ready' }
];

export function createStreamingMarkdownDiffDemo(
  source: StreamInput<MarkdownDiffEvent, MarkdownDiffEvent[]> = markdownDiffTimeline
): StreamingMarkdownDiffDemo {
  const events = stream.events<MarkdownDiffEvent>(source, {
    name: 'markdown-diff-events',
    maxItems: 200
  });
  const markdown = events.select('markdown', {
    name: 'markdown-preview',
    seed: '',
    reduce: (currentValue, event) => currentValue + event.text
  });
  const diff = events.select('diff', {
    name: 'code-diff',
    seed: '',
    reduce: (currentValue, event) => currentValue + event.patch
  });
  const status = events.select('status', {
    name: 'status-window',
    maxItems: 8
  });
  const artifacts = events.select('artifact', {
    name: 'artifact-window',
    maxItems: 5
  });

  return {
    events,
    markdown,
    diff,
    status,
    artifacts
  };
}
