import {
  assertCanUseDOM,
  createSSEResponse,
  createAnthropic,
  createDeepSeek,
  createLineAdapter,
  createOpenAI,
  createOllama,
  createRoot,
  createSSEAdapter,
  createOpenRouter,
  collectProviderMetadata,
  extractAnthropicMetadata,
  extractOllamaMetadata,
  extractOpenAIMetadata,
  extractOpenRouterMetadata,
  from,
  mapStream,
  mergeProviderMetadata,
  onCleanup,
  scanStream,
  stream,
  type AnthropicAdapter,
  type OpenAIAdapter,
  type DeepSeekAdapter,
  type LineAdapter,
  type OllamaAdapter,
  type OpenRouterAdapter,
  type ProviderRequestOptions,
  type ProviderRetryOptions,
  type ProviderStreamMetadata,
  type ProviderUsage,
  type QoreEventStream,
  type QoreStream,
  type ReadonlySignal,
  type SSEFrame,
  type SSEAdapter,
  type StreamEventOf
} from '../src/index.js';

type Assert<T extends true> = T;
type Extends<A, B> = A extends B ? true : false;
type Equal<A, B> = (
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false
);

type TokenEvent = {
  type: 'token';
  text: string;
};

type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string }
  | { type: 'status'; value: 'running' | 'done' }
  | { type: 'diff'; patch: string };

const source = stream(['a', 'b']);
const listSource = stream.list([{ step: 1 }]);
const latestSource = stream.latest([1, 2, 3]);
const mergedSource = stream.merge([[1, 2], [3, 4]]);
const concatenatedSource = stream.concat([[1, 2], [3, 4]]);
const pipedSource = stream.pipe(['a'], [
  (value) => [value.toUpperCase()],
  (value) => [value]
]);
const racedSource = stream.race([[1, 2], [3, 4]]);
const retriedSource = stream.retryable((attempt) => [`retry-${attempt}`], { maxRetries: 1, backoff: 0 });
const switchedSource = stream.switchMap(['a', 'b'], (value) => [value, value.toUpperCase()]);
const eventSource = stream.events<AgentEvent>([
  { type: 'text', text: 'hello' },
  { type: 'tool_call', name: 'search' },
  { type: 'status', value: 'done' },
  { type: 'diff', patch: '+hello' }
]);
const selectedTextEvents = eventSource.select('text');
const selectedTextValue = eventSource.select('text', {
  seed: '',
  reduce: (currentValue, event) => currentValue + event.text
});
const mappedSource = mapStream([1, 2], (value) => value.toString());
const scannedSource = scanStream([1, 2, 3], (total, value) => total + value, 0);
const replayed = from(['x', 'y']);

const adapter = createSSEAdapter<{ prompt: string }, string, TokenEvent>({
  url: 'https://example.com/stream',
  buildChatRequest(prompt) {
    return { prompt };
  },
  eventToText(event) {
    return event.data.type === 'token' ? event.data.text : undefined;
  }
});
const lineAdapter = createLineAdapter<{ prompt: string }, string, TokenEvent>({
  url: 'https://example.com/lines',
  buildChatRequest(prompt) {
    return { prompt };
  },
  lineToText(event) {
    return event.data.type === 'token' ? event.data.text : undefined;
  }
});
const ollama = createOllama({
  fetch: async () => new Response(null, { status: 200 })
});
const anthropic = createAnthropic({
  apiKey: 'demo-key',
  fetch: async () => new Response(null, { status: 200 })
});
const deepseek = createDeepSeek({
  apiKey: 'demo-key',
  fetch: async () => new Response(null, { status: 200 })
});
const openai = createOpenAI({
  apiKey: 'demo-key',
  fetch: async () => new Response(null, { status: 200 })
});
const openrouter = createOpenRouter({
  apiKey: 'demo-key',
  fetch: async () => new Response(null, { status: 200 })
});

const providerOptions: ProviderRequestOptions = {
  headers: {
    Authorization: 'Bearer demo'
  },
  retry: {
    maxAttempts: 2,
    backoff: 0
  }
};
const retryOptions: ProviderRetryOptions = {
  maxAttempts: 2,
  backoff: 'exponential',
  resume: true
};
const usage: ProviderUsage = {
  inputTokens: 1,
  outputTokens: 2,
  totalTokens: 3
};
const providerMetadata: ProviderStreamMetadata = {
  provider: 'OpenAI',
  usage
};
const serverFrame: SSEFrame<string> = {
  event: 'token',
  data: 'hello'
};
const serverResponse = createSSEResponse(['hello']);
const mergedMetadata = mergeProviderMetadata(providerMetadata, {
  finishReason: 'stop'
});
const collectedMetadata = collectProviderMetadata('OpenAI', [
  { type: 'response.created', response: { id: 'resp_1' } }
], extractOpenAIMetadata);
const openRouterMetadata = extractOpenRouterMetadata({
  id: 'chat_1',
  choices: [{ finish_reason: 'stop', delta: {} }]
});
const anthropicMetadata = extractAnthropicMetadata({
  type: 'message_delta',
  delta: { stop_reason: 'end_turn' }
});
const ollamaMetadata = extractOllamaMetadata({
  model: 'llama3.2',
  done_reason: 'stop'
});

type _DefaultStream = Assert<Equal<typeof source, QoreStream<string, string>>>;
type _ListStream = Assert<Equal<typeof listSource, QoreStream<{ step: number }, Array<{ step: number }>>>>;
type _LatestStream = Assert<Equal<typeof latestSource, QoreStream<number, number | null>>>;
type _MergedStream = Assert<Equal<typeof mergedSource, QoreStream<number, string>>>;
type _ConcatenatedStream = Assert<Equal<typeof concatenatedSource, QoreStream<number, string>>>;
type _PipedStream = Assert<Equal<typeof pipedSource, QoreStream<string, string>>>;
type _RacedStream = Assert<Equal<typeof racedSource, QoreStream<number, string>>>;
type _RetriedStream = Assert<Equal<typeof retriedSource, QoreStream<string, string>>>;
type _SwitchedStream = Assert<Equal<typeof switchedSource, QoreStream<string, string>>>;
type _EventStream = Assert<Equal<typeof eventSource, QoreEventStream<AgentEvent>>>;
type _SelectedTextEvents = Assert<Equal<typeof selectedTextEvents, QoreStream<{ type: 'text'; text: string }, Array<{ type: 'text'; text: string }>>>>;
type _SelectedTextValue = Assert<Equal<typeof selectedTextValue, QoreStream<{ type: 'text'; text: string }, string>>>;
type _StreamEventOf = Assert<Equal<StreamEventOf<AgentEvent, 'tool_call'>, { type: 'tool_call'; name: string }>>;
type _MappedStream = Assert<Equal<typeof mappedSource, QoreStream<string, string>>>;
type _ScannedStream = Assert<Extends<typeof scannedSource, QoreStream<number, number>>>;
type _ReplayStream = Assert<Extends<typeof replayed, QoreStream<string, string>>>;
type _ReadonlyStatus = Assert<Extends<typeof source.status, ReadonlySignal<string>>>;
type _Adapter = Assert<Extends<typeof adapter, SSEAdapter<{ prompt: string }, string, TokenEvent>>>;
type _LineAdapter = Assert<Extends<typeof lineAdapter, LineAdapter<{ prompt: string }, string, TokenEvent>>>;
type _AnthropicAdapter = Assert<Extends<typeof anthropic, AnthropicAdapter>>;
type _OpenAIAdapter = Assert<Extends<typeof openai, OpenAIAdapter>>;
type _OllamaAdapter = Assert<Extends<typeof ollama, OllamaAdapter>>;
type _DeepSeekAdapter = Assert<Extends<typeof deepseek, DeepSeekAdapter>>;
type _OpenRouterAdapter = Assert<Extends<typeof openrouter, OpenRouterAdapter>>;

void providerOptions;
void retryOptions;
void providerMetadata;
void mergedMetadata;
void collectedMetadata;
void openRouterMetadata;
void anthropicMetadata;
void ollamaMetadata;
void serverFrame;
void serverResponse;
void assertCanUseDOM;
void createRoot;
void onCleanup;

// @ts-expect-error Stream lifecycle state is exposed read-only.
source.status('completed');

// @ts-expect-error Stream lifecycle state does not expose mutable helpers.
source.error.set(null);

// @ts-expect-error Stream chunk history is exposed read-only.
source.chunks([]);

export {};
