import { stream } from '../src/index.js';
import type { QoreEventStream, QoreStream, StreamInput } from '../src/index.js';

export type AgentStatus = 'queued' | 'thinking' | 'calling_tool' | 'streaming' | 'done';

export type AgentEvent =
  | { type: 'status'; value: AgentStatus; label: string }
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: string }
  | { type: 'tool_result'; name: string; output: string }
  | { type: 'diff'; patch: string }
  | { type: 'artifact'; title: string; content: string };

export interface AgentEventDemo {
  events: QoreEventStream<AgentEvent>;
  markdown: QoreStream<Extract<AgentEvent, { type: 'text' }>, string>;
  statuses: QoreStream<Extract<AgentEvent, { type: 'status' }>, Array<Extract<AgentEvent, { type: 'status' }>>>;
  toolCalls: QoreStream<Extract<AgentEvent, { type: 'tool_call' }>, Array<Extract<AgentEvent, { type: 'tool_call' }>>>;
  toolResults: QoreStream<Extract<AgentEvent, { type: 'tool_result' }>, Array<Extract<AgentEvent, { type: 'tool_result' }>>>;
  diff: QoreStream<Extract<AgentEvent, { type: 'diff' }>, string>;
  artifacts: QoreStream<Extract<AgentEvent, { type: 'artifact' }>, Array<Extract<AgentEvent, { type: 'artifact' }>>>;
}

export const agentEventTimeline: AgentEvent[] = [
  { type: 'status', value: 'queued', label: 'Queued request' },
  { type: 'status', value: 'thinking', label: 'Planning a response' },
  { type: 'tool_call', name: 'search_docs', input: 'Qore stream.events selectors' },
  { type: 'tool_result', name: 'search_docs', output: 'Found runtime, API, and benchmark notes.' },
  { type: 'status', value: 'streaming', label: 'Streaming answer' },
  { type: 'text', text: '### Qore Agent Runtime\n' },
  { type: 'text', text: 'One event stream can feed a timeline, markdown pane, tool inspector, and diff viewer.\n' },
  { type: 'diff', patch: '+ const events = stream.events(agent.run(task))\n' },
  { type: 'diff', patch: '+ const text = events.select(\'text\', reducer)\n' },
  { type: 'artifact', title: 'Runtime trace', content: 'status -> tool_call -> tool_result -> text -> diff' },
  { type: 'status', value: 'done', label: 'Completed' }
];

export function createAgentEventDemo(
  source: StreamInput<AgentEvent, AgentEvent[]> = agentEventTimeline
): AgentEventDemo {
  const events = stream.events<AgentEvent>(source);
  const markdown = events.select('text', {
    seed: '',
    reduce: (currentValue, event) => currentValue + event.text
  });
  const statuses = events.select('status');
  const toolCalls = events.select('tool_call');
  const toolResults = events.select('tool_result');
  const diff = events.select('diff', {
    seed: '',
    reduce: (currentValue, event) => currentValue + event.patch
  });
  const artifacts = events.select('artifact');

  return {
    events,
    markdown,
    statuses,
    toolCalls,
    toolResults,
    diff,
    artifacts
  };
}
