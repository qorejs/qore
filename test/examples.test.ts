import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStreamingMarkdownDiffDemo } from '../examples/streaming-markdown-diff.js';
import {
  createAgentEndpointResponse,
  createBrowserAgentStreams,
  type ChatRequest
} from '../examples/server-sse-to-qore-client.js';

test('streaming markdown diff example projects one stream into preview surfaces', async () => {
  const demo = createStreamingMarkdownDiffDemo();

  await Promise.all([
    demo.events.ready,
    demo.markdown.ready,
    demo.diff.ready,
    demo.status.ready,
    demo.artifacts.ready
  ]);

  assert.match(demo.markdown(), /Streaming Markdown/);
  assert.match(demo.diff(), /stream\(provider\.chat/);
  assert.deepEqual(demo.status().map((event) => event.label), ['planning sections', 'ready']);
  assert.deepEqual(demo.artifacts().map((event) => event.title), ['Rendered preview']);
});

test('server SSE example keeps provider access behind an application endpoint', async () => {
  const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = JSON.parse(String(init?.body ?? '{}')) as ChatRequest;

    return createAgentEndpointResponse(request);
  };
  const { answer, events } = createBrowserAgentStreams('hello', fetchImpl);

  await Promise.all([answer.ready, events.ready]);

  assert.equal(answer(), 'Provider stays server-side. Browser consumes your SSE endpoint as a QoreStream.');
  assert.deepEqual(events().map((event) => event.type), [
    'status',
    'tool_call',
    'tool_result',
    'text',
    'text',
    'status'
  ]);
  assert.equal(events().at(0)?.type, 'status');
});
