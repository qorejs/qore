import { createSSEAdapter, createSSEResponse, stream } from '../src/index.js';
import type { QoreEventStream, QoreStream } from '../src/index.js';

export type ServerAgentEvent =
  | { type: 'status'; label: string }
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: string }
  | { type: 'tool_result'; name: string; output: string };

export interface ChatRequest {
  prompt: string;
}

export async function* runServerAgent(request: ChatRequest): AsyncIterable<ServerAgentEvent> {
  yield { type: 'status', label: `received: ${request.prompt}` };
  yield { type: 'tool_call', name: 'search_docs', input: 'stream = signal' };
  yield { type: 'tool_result', name: 'search_docs', output: 'QoreStream is both signal and async iterable.' };
  yield { type: 'text', text: 'Provider stays server-side. ' };
  yield { type: 'text', text: 'Browser consumes your SSE endpoint as a QoreStream.' };
  yield { type: 'status', label: 'done' };
}

export function createAgentEndpointResponse(request: ChatRequest): Response {
  return createSSEResponse(runServerAgent(request), {
    event: 'agent',
    encode(event, index) {
      return {
        event: 'agent',
        id: String(index + 1),
        data: JSON.stringify(event)
      };
    }
  });
}

export function createBrowserAgentClient(fetchImpl = globalThis.fetch) {
  return createSSEAdapter<ChatRequest, string, ServerAgentEvent>({
    name: 'BrowserAgentEndpoint',
    url: '/api/agent',
    fetch: fetchImpl,
    buildRequest(request) {
      return {
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(request)
      };
    },
    buildChatRequest(prompt) {
      return {
        prompt
      };
    },
    eventToText(event) {
      return event.data.type === 'text' ? event.data.text : undefined;
    }
  });
}

export function createBrowserAgentStreams(
  prompt: string,
  fetchImpl = globalThis.fetch
): {
  events: QoreEventStream<ServerAgentEvent>;
  answer: QoreStream<string, string>;
} {
  const agent = createBrowserAgentClient(fetchImpl);
  const events = stream.events<ServerAgentEvent>(async ({ push }) => {
    for await (const event of agent.stream({ prompt })) {
      await push(event.data);
    }
  }, {
    name: 'browser-agent-events',
    maxItems: 200
  });
  const answer = stream(agent.chat(prompt), { name: 'browser-agent-answer' });

  return { events, answer };
}
