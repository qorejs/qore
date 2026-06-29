import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAgentEventDemo, type AgentEvent } from '../examples/agent-event-stream.js';

const delayedAgentEvents: AgentEvent[] = [
  { type: 'status', value: 'queued', label: 'Queued request' },
  { type: 'tool_call', name: 'search_docs', input: 'stream selectors' },
  { type: 'tool_result', name: 'search_docs', output: 'selectors replay event history' },
  { type: 'text', text: 'Streaming ' },
  { type: 'text', text: 'interfaces' },
  { type: 'diff', patch: '+stream.events\n' },
  { type: 'retry', attempt: 1, reason: 'late tool result' },
  { type: 'artifact', title: 'Trace', content: 'tool -> text -> diff' },
  { type: 'error', message: 'Recovered timeout', recoverable: true },
  { type: 'status', value: 'done', label: 'Completed' }
];

test('agent event demo projects one stream into UI-ready surfaces', async () => {
  const demo = createAgentEventDemo(delayedAgentEvents);

  await Promise.all([
    demo.events.ready,
    demo.markdown.ready,
    demo.statuses.ready,
    demo.toolCalls.ready,
    demo.toolResults.ready,
    demo.diff.ready,
    demo.artifacts.ready,
    demo.retries.ready,
    demo.errors.ready
  ]);

  assert.deepEqual(demo.events().map((event) => event.type), [
    'status',
    'tool_call',
    'tool_result',
    'text',
    'text',
    'diff',
    'retry',
    'artifact',
    'error',
    'status'
  ]);
  assert.equal(demo.markdown(), 'Streaming interfaces');
  assert.equal(demo.diff(), '+stream.events\n');
  assert.deepEqual(demo.statuses().map((event) => event.value), ['queued', 'done']);
  assert.deepEqual(demo.toolCalls().map((event) => event.name), ['search_docs']);
  assert.deepEqual(demo.toolResults().map((event) => event.output), ['selectors replay event history']);
  assert.deepEqual(demo.artifacts().map((event) => event.title), ['Trace']);
  assert.deepEqual(demo.retries().map((event) => event.reason), ['late tool result']);
  assert.deepEqual(demo.errors().map((event) => event.recoverable), [true]);
  assert.equal(demo.events.name, 'agent-events');
  assert.equal(demo.markdown.name, 'agent-markdown');
});

test('agent event demo keeps selectors live while events are still arriving', async () => {
  const demo = createAgentEventDemo(async ({ push }) => {
    for (const event of delayedAgentEvents) {
      await push(event);
    }
  });

  await demo.markdown.ready;

  assert.equal(demo.markdown(), 'Streaming interfaces');
  assert.equal(demo.events.completed(), true);
  assert.equal(demo.markdown.completed(), true);
});
