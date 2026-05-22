import {
  assertCanUseDOM,
  createAnthropic,
  createDeepSeek,
  createLineAdapter,
  createOpenAI,
  createOllama,
  createRoot,
  createSSEAdapter,
  createOpenRouter,
  from,
  mapStream,
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
  type QoreStream,
  type ReadonlySignal,
  type SSEAdapter
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

const source = stream(['a', 'b']);
const listSource = stream.list([{ step: 1 }]);
const latestSource = stream.latest([1, 2, 3]);
const mergedSource = stream.merge([[1, 2], [3, 4]]);
const racedSource = stream.race([[1, 2], [3, 4]]);
const retriedSource = stream.retryable((attempt) => [`retry-${attempt}`], { maxRetries: 1, backoff: 0 });
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
  }
};

type _DefaultStream = Assert<Equal<typeof source, QoreStream<string, string>>>;
type _ListStream = Assert<Equal<typeof listSource, QoreStream<{ step: number }, Array<{ step: number }>>>>;
type _LatestStream = Assert<Equal<typeof latestSource, QoreStream<number, number | null>>>;
type _MergedStream = Assert<Equal<typeof mergedSource, QoreStream<number, string>>>;
type _RacedStream = Assert<Equal<typeof racedSource, QoreStream<number, string>>>;
type _RetriedStream = Assert<Equal<typeof retriedSource, QoreStream<string, string>>>;
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
