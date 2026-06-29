import { stream } from '../src/index.js';
import type { QoreEventStream, QoreStream, StreamInput } from '../src/index.js';

export type AgentStatus = 'queued' | 'thinking' | 'calling_tool' | 'streaming' | 'repairing' | 'done';

export type AgentEvent =
  | { type: 'status'; value: AgentStatus; label: string }
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: string }
  | { type: 'tool_result'; name: string; output: string }
  | { type: 'diff'; patch: string }
  | { type: 'artifact'; title: string; content: string }
  | { type: 'retry'; attempt: number; reason: string }
  | { type: 'error'; message: string; recoverable: boolean };

type EventOf<TType extends AgentEvent['type']> = Extract<AgentEvent, { type: TType }>;

export interface AgentEventDemo {
  events: QoreEventStream<AgentEvent>;
  markdown: QoreStream<EventOf<'text'>, string>;
  statuses: QoreStream<EventOf<'status'>, Array<EventOf<'status'>>>;
  toolCalls: QoreStream<EventOf<'tool_call'>, Array<EventOf<'tool_call'>>>;
  toolResults: QoreStream<EventOf<'tool_result'>, Array<EventOf<'tool_result'>>>;
  diff: QoreStream<EventOf<'diff'>, string>;
  artifacts: QoreStream<EventOf<'artifact'>, Array<EventOf<'artifact'>>>;
  retries: QoreStream<EventOf<'retry'>, Array<EventOf<'retry'>>>;
  errors: QoreStream<EventOf<'error'>, Array<EventOf<'error'>>>;
}


function collectEvents<TEvent>(name: string) {
  return {
    name,
    seed: [] as TEvent[],
    reduce: (currentValue: TEvent[], event: TEvent) => [...currentValue, event]
  };
}

export const agentEventTimeline: AgentEvent[] = [
  { type: 'status', value: 'queued', label: 'Queued request' },
  { type: 'status', value: 'thinking', label: 'Planning answer surfaces' },
  { type: 'tool_call', name: 'search_docs', input: 'Qore stream.events selectors' },
  { type: 'tool_result', name: 'search_docs', output: 'Found runtime, API, and benchmark notes.' },
  { type: 'status', value: 'streaming', label: 'Streaming markdown' },
  { type: 'text', text: '### Agent Event Stream\n' },
  { type: 'text', text: 'One stream feeds timeline, markdown, tools, diff, artifacts, and status.\n' },
  { type: 'diff', patch: '+ const events = stream.events(agent.run(task))\n' },
  { type: 'diff', patch: '+ const text = events.select(\'text\', reducer)\n' },
  { type: 'retry', attempt: 1, reason: 'tool result arrived late; continuing from event history' },
  { type: 'status', value: 'repairing', label: 'Repairing partial UI state' },
  { type: 'artifact', title: 'Runtime trace', content: 'status -> tool_call -> tool_result -> text -> diff -> artifact' },
  { type: 'error', message: 'Recovered transient tool timeout', recoverable: true },
  { type: 'status', value: 'done', label: 'Completed' }
];

export function createAgentEventDemo(
  source: StreamInput<AgentEvent, AgentEvent[]> = agentEventTimeline
): AgentEventDemo {
  const events = stream.events<AgentEvent>(source, { name: 'agent-events' });
  const markdown = events.select('text', {
    name: 'agent-markdown',
    seed: '',
    reduce: (currentValue, event) => currentValue + event.text
  });
  const statuses = events.select('status', collectEvents<EventOf<'status'>>('agent-status'));
  const toolCalls = events.select('tool_call', collectEvents<EventOf<'tool_call'>>('agent-tool-calls'));
  const toolResults = events.select('tool_result', collectEvents<EventOf<'tool_result'>>('agent-tool-results'));
  const diff = events.select('diff', {
    name: 'agent-diff',
    seed: '',
    reduce: (currentValue, event) => currentValue + event.patch
  });
  const artifacts = events.select('artifact', collectEvents<EventOf<'artifact'>>('agent-artifacts'));
  const retries = events.select('retry', collectEvents<EventOf<'retry'>>('agent-retries'));
  const errors = events.select('error', collectEvents<EventOf<'error'>>('agent-errors'));

  return {
    events,
    markdown,
    statuses,
    toolCalls,
    toolResults,
    diff,
    artifacts,
    retries,
    errors
  };
}
