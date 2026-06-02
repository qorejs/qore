import {
  assertCanUseDOM,
  createAnthropic,
  batch,
  canUseDOM,
  computed,
  createApp,
  createRoot,
  createSSEResponse,
  createDeepSeek,
  createLineAdapter,
  createOpenAI,
  createOllama,
  createOpenRouter,
  createSSEAdapter,
  collectProviderMetadata,
  effect,
  extractAnthropicMetadata,
  extractOllamaMetadata,
  extractOpenAIMetadata,
  extractOpenRouterMetadata,
  from,
  h,
  list,
  mapStream,
  mergeProviderMetadata,
  onCleanup,
  renderResponse,
  response,
  scanStream,
  signal,
  stream,
  text,
  type AppContext,
  type AnthropicAdapter,
  type AnthropicChatInput,
  type AnthropicEvent,
  type AnthropicMessage,
  type AnthropicOptions,
  type AnthropicRequest,
  type BackpressureOptions,
  type OpenAIAdapter,
  type OpenAIChatInput,
  type OpenAIEvent,
  type OpenAIMessage,
  type OpenAIOptions,
  type OpenAIRequest,
  type EffectOptions,
  type EffectScheduler,
  type DeepSeekAdapter,
  type DeepSeekChatInput,
  type DeepSeekEvent,
  type DeepSeekMessage,
  type DeepSeekOptions,
  type DeepSeekRequest,
  type LineAdapter,
  type LineEvent,
  type OllamaAdapter,
  type OllamaChatInput,
  type OllamaEvent,
  type OllamaMessage,
  type OllamaOptions,
  type OllamaRequest,
  type OpenRouterAdapter,
  type OpenRouterChatInput,
  type OpenRouterEvent,
  type OpenRouterMessage,
  type OpenRouterOptions,
  type OpenRouterRequest,
  type ProviderRequestOptions,
  type ProviderRetryOptions,
  type ProviderStreamMetadata,
  type ProviderUsage,
  type QoreEventStream,
  type QoreChild,
  type QoreDocumentFragment,
  type QoreElement,
  type QoreNode,
  type QoreStream,
  type QoreText,
  type ResponseRenderState,
  type ResponseState,
  type SSEFrame,
  type SSEAdapter,
  type SSEEvent,
  type StreamController,
  type StreamEventOf
} from '@qorejs/qore';

type Assert<T extends true> = T;
type Extends<A, B> = A extends B ? true : false;
type Equal<A, B> = (
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false
);

const counter = signal(0);
counter.update((value) => value + 1);
void assertCanUseDOM;

const doubled = computed(() => counter() * 2);
const stop = effect(() => {
  void doubled();
});
stop();

const disposeRoot = createRoot((dispose) => {
  onCleanup(() => {});
  return dispose;
});
disposeRoot();

const microtaskEffectOptions: EffectOptions = { scheduler: 'microtask' };
const customScheduler: EffectScheduler = (run) => queueMicrotask(run);
const stopScheduled = effect(() => {
  void counter();
}, microtaskEffectOptions);
stopScheduled();

batch(() => {
  counter(2);
});

const textStream = stream<string>(async ({ push }) => {
  await push('Qore');
});
const inferredText = stream(['a', 'b']);
const inferredList = stream.list([{ step: 1 }]);
const latest = stream.latest<number>([1, 2, 3]);
const merged = stream.merge([[1, 2], [3, 4]]);
const concatenated = stream.concat([[1, 2], [3, 4]]);
const piped = stream.pipe(['a'], [
  (value) => [value.toUpperCase()],
  (value) => [value]
]);
const raced = stream.race([[1, 2], [3, 4]]);
const retried = stream.retryable((attempt) => [`retry-${attempt}`], { maxRetries: 1, backoff: 0 });
const switched = stream.switchMap(['a', 'b'], (value) => [value, value.toUpperCase()]);
type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string }
  | { type: 'status'; value: 'running' | 'done' }
  | { type: 'diff'; patch: string };
const events = stream.events<AgentEvent>([
  { type: 'text', text: 'hello' },
  { type: 'tool_call', name: 'search' },
  { type: 'status', value: 'done' },
  { type: 'diff', patch: '+hello' }
]);
const selectedText = events.select('text', {
  seed: '',
  reduce: (currentValue, event) => currentValue + event.text
});
const mapped = mapStream([1, 2, 3], async (value) => value.toString());
const scanned = scanStream([1, 2, 3], (total, value) => total + value, 0);
const replayed = from(['a', 'b', 'c']);

type _TextStream = Assert<Extends<typeof textStream, QoreStream<string, string>>>;
type _InferredTextStream = Assert<Equal<typeof inferredText, QoreStream<string, string>>>;
type _InferredListStream = Assert<Equal<typeof inferredList, QoreStream<{ step: number }, Array<{ step: number }>>>>;
type _LatestStream = Assert<Equal<typeof latest, QoreStream<number, number | null>>>;
type _MergedStream = Assert<Equal<typeof merged, QoreStream<number, string>>>;
type _ConcatenatedStream = Assert<Equal<typeof concatenated, QoreStream<number, string>>>;
type _PipedStream = Assert<Equal<typeof piped, QoreStream<string, string>>>;
type _RacedStream = Assert<Equal<typeof raced, QoreStream<number, string>>>;
type _RetriedStream = Assert<Equal<typeof retried, QoreStream<string, string>>>;
type _SwitchedStream = Assert<Equal<typeof switched, QoreStream<string, string>>>;
type _EventStream = Assert<Equal<typeof events, QoreEventStream<AgentEvent>>>;
type _SelectedText = Assert<Equal<typeof selectedText, QoreStream<{ type: 'text'; text: string }, string>>>;
type _StreamEventOf = Assert<Equal<StreamEventOf<AgentEvent, 'tool_call'>, { type: 'tool_call'; name: string }>>;
type _MappedStream = Assert<Equal<typeof mapped, QoreStream<string, string>>>;
type _ScannedStream = Assert<Extends<typeof scanned, QoreStream<number, number>>>;

const backpressure: BackpressureOptions = {
  interval: 16,
  buffer: 4,
  overflow: 'wait'
};

const transcript = response.list<{ role: 'user' | 'assistant'; body: string }>();
const transcriptState: ResponseState<
  { role: 'user' | 'assistant'; body: string },
  Array<{ role: 'user' | 'assistant'; body: string }>
> = transcript;

const requestOptions: ProviderRequestOptions = {
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
const providerUsage: ProviderUsage = {
  inputTokens: 1,
  outputTokens: 2,
  totalTokens: 3
};
const providerMetadata: ProviderStreamMetadata = {
  provider: 'OpenAI',
  usage: providerUsage
};
const serverFrame: SSEFrame<string> = {
  event: 'token',
  data: 'hello'
};
const serverResponse = createSSEResponse(['hello']);
const mergedProviderMetadata = mergeProviderMetadata(providerMetadata, {
  finishReason: 'stop'
});
const collectedProviderMetadata = collectProviderMetadata('OpenAI', [
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

type TokenEvent = {
  type: 'token';
  text: string;
};

const provider = createSSEAdapter<{ prompt: string }, string, TokenEvent>({
  url: 'https://example.com/stream',
  buildRequest(request) {
    return {
      method: 'POST',
      body: JSON.stringify(request)
    };
  },
  buildChatRequest(input) {
    return {
      prompt: input
    };
  },
  eventToText(event) {
    return event.data.type === 'token' ? event.data.text : undefined;
  }
});
const lineProvider = createLineAdapter<{ prompt: string }, string, TokenEvent>({
  url: 'https://example.com/lines',
  buildChatRequest(input) {
    return {
      prompt: input
    };
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

const providerSurface: SSEAdapter<{ prompt: string }, string, TokenEvent> = provider;
const lineProviderSurface: LineAdapter<{ prompt: string }, string, TokenEvent> = lineProvider;
const anthropicSurface: AnthropicAdapter = anthropic;
const anthropicOptions: AnthropicOptions = {
  apiKey: 'demo-key'
};
const anthropicRequest: AnthropicRequest = {
  messages: [{ role: 'user', content: 'hello' }]
};
const anthropicChatInput: AnthropicChatInput = 'hello';
const anthropicMessage: AnthropicMessage = {
  role: 'user',
  content: 'hello'
};
const anthropicEvent: AnthropicEvent = {
  type: 'content_block_delta',
  delta: {
    type: 'text_delta',
    text: 'hello'
  }
};
const openaiSurface: OpenAIAdapter = openai;
const openaiOptions: OpenAIOptions = {
  apiKey: 'demo-key'
};
const openaiRequest: OpenAIRequest = {
  input: [{ role: 'user', content: 'hello' }]
};
const openaiChatInput: OpenAIChatInput = 'hello';
const openaiMessage: OpenAIMessage = {
  role: 'user',
  content: 'hello'
};
const openaiEvent: OpenAIEvent = {
  type: 'response.output_text.delta',
  delta: 'hello'
};
const ollamaSurface: OllamaAdapter = ollama;
const deepseekSurface: DeepSeekAdapter = deepseek;
const deepseekOptions: DeepSeekOptions = {
  apiKey: 'demo-key'
};
const deepseekRequest: DeepSeekRequest = {
  messages: [{ role: 'user', content: 'hello' }]
};
const deepseekChatInput: DeepSeekChatInput = 'hello';
const deepseekMessage: DeepSeekMessage = {
  role: 'user',
  content: 'hello'
};
const deepseekEvent: DeepSeekEvent = {
  choices: [{ delta: { content: 'hello' } }]
};
const ollamaOptions: OllamaOptions = {
  model: 'llama3.2'
};
const ollamaRequest: OllamaRequest = {
  messages: [{ role: 'user', content: 'hello' }]
};
const ollamaChatInput: OllamaChatInput = 'hello';
const ollamaMessage: OllamaMessage = {
  role: 'user',
  content: 'hello'
};
const ollamaEvent: OllamaEvent = {
  message: { content: 'hello' },
  done: false
};
const openrouterSurface: OpenRouterAdapter = openrouter;
const openrouterOptions: OpenRouterOptions = {
  apiKey: 'demo-key'
};
const openrouterRequest: OpenRouterRequest = {
  messages: [{ role: 'user', content: 'hello' }]
};
const openrouterChatInput: OpenRouterChatInput = 'hello';
const openrouterMessage: OpenRouterMessage = {
  role: 'user',
  content: 'hello'
};
const openrouterEvent: OpenRouterEvent = {
  choices: [{ delta: { content: 'hello' } }]
};
const sampleEvent: SSEEvent<TokenEvent> = {
  event: 'message',
  id: null,
  retry: null,
  data: {
    type: 'token',
    text: 'hello'
  }
};
const sampleLineEvent: LineEvent<TokenEvent> = {
  line: 1,
  raw: '{"type":"token","text":"hello"}',
  data: {
    type: 'token',
    text: 'hello'
  }
};

const app = createApp((context: AppContext<{ title: string }>) => {
  const reply = stream<string>(async ({ push }: StreamController<string, string>) => {
    await push(context.props.title);
  });

  const child: QoreChild = h('section', {},
    h('h1', {}, context.props.title),
    renderResponse(transcript, {
      default: (
        state: ResponseRenderState<
          { role: 'user' | 'assistant'; body: string },
          Array<{ role: 'user' | 'assistant'; body: string }>
        >
      ) => list(
        () => state.chunks,
        (message: { role: 'user' | 'assistant'; body: string }) => h('p', {}, message.body)
      )
    }),
    text(() => reply())
  );

  return {
    view: child
  };
});

const domNode: Node = h('div', {}, 'node');
const qoreNode: QoreNode = domNode;
const qoreElement: QoreElement = h('main', {}, text('element'));
const qoreText: QoreText = text('text node');
const qoreFragment: QoreDocumentFragment = list(() => ['a'], (value) => h('span', {}, value));

void app;
void canUseDOM;
void customScheduler;
void domNode;
void qoreNode;
void qoreElement;
void qoreText;
void qoreFragment;
void latest;
void selectedText;
void mapped;
void replayed;
void transcriptState;
void requestOptions;
void retryOptions;
void providerMetadata;
void mergedProviderMetadata;
void collectedProviderMetadata;
void openRouterMetadata;
void anthropicMetadata;
void ollamaMetadata;
void serverFrame;
void serverResponse;
void providerSurface;
void lineProviderSurface;
void anthropicSurface;
void anthropicOptions;
void anthropicRequest;
void anthropicChatInput;
void anthropicMessage;
void anthropicEvent;
void openaiSurface;
void openaiOptions;
void openaiRequest;
void openaiChatInput;
void openaiMessage;
void openaiEvent;
void ollamaSurface;
void deepseekSurface;
void deepseekOptions;
void deepseekRequest;
void deepseekChatInput;
void deepseekMessage;
void deepseekEvent;
void ollamaOptions;
void ollamaRequest;
void ollamaChatInput;
void ollamaMessage;
void ollamaEvent;
void openrouterSurface;
void openrouterOptions;
void openrouterRequest;
void openrouterChatInput;
void openrouterMessage;
void openrouterEvent;
void sampleEvent;
void sampleLineEvent;
void backpressure;

// @ts-expect-error Computed signals are read-only.
doubled(1);

// @ts-expect-error Only supported overflow strategies are allowed.
const invalidBackpressure: BackpressureOptions = { overflow: 'explode' };

// @ts-expect-error Provider headers must stay string-valued.
const invalidRequestOptions: ProviderRequestOptions = { headers: { Authorization: 123 } };

// @ts-expect-error Stream status is owned by the runtime and exposed read-only.
textStream.status('completed');

// @ts-expect-error Stream chunks are owned by the runtime and exposed read-only.
textStream.chunks([]);

// @ts-expect-error Read-only stream state does not expose mutable signal helpers.
textStream.error.set(null);

void invalidBackpressure;
void invalidRequestOptions;
