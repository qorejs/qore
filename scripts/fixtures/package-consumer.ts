import {
  batch,
  computed,
  createApp,
  createOpenRouter,
  createSSEAdapter,
  effect,
  from,
  h,
  list,
  mapStream,
  renderResponse,
  response,
  scanStream,
  signal,
  stream,
  text,
  type AppContext,
  type BackpressureOptions,
  type EffectOptions,
  type EffectScheduler,
  type OpenRouterAdapter,
  type OpenRouterChatInput,
  type OpenRouterEvent,
  type OpenRouterMessage,
  type OpenRouterOptions,
  type OpenRouterRequest,
  type ProviderRequestOptions,
  type QoreChild,
  type QoreDocumentFragment,
  type QoreElement,
  type QoreNode,
  type QoreStream,
  type QoreText,
  type ResponseRenderState,
  type ResponseState,
  type SSEAdapter,
  type SSEEvent,
  type StreamController
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

const doubled = computed(() => counter() * 2);
const stop = effect(() => {
  void doubled();
});
stop();

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
const mapped = mapStream([1, 2, 3], async (value) => value.toString());
const scanned = scanStream([1, 2, 3], (total, value) => total + value, 0);
const replayed = from(['a', 'b', 'c']);

type _TextStream = Assert<Extends<typeof textStream, QoreStream<string, string>>>;
type _InferredTextStream = Assert<Equal<typeof inferredText, QoreStream<string, string>>>;
type _InferredListStream = Assert<Equal<typeof inferredList, QoreStream<{ step: number }, Array<{ step: number }>>>>;
type _LatestStream = Assert<Equal<typeof latest, QoreStream<number, number | null>>>;
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
  }
};

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
const openrouter = createOpenRouter({
  apiKey: 'demo-key',
  fetch: async () => new Response(null, { status: 200 })
});

const providerSurface: SSEAdapter<{ prompt: string }, string, TokenEvent> = provider;
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
void customScheduler;
void domNode;
void qoreNode;
void qoreElement;
void qoreText;
void qoreFragment;
void latest;
void mapped;
void replayed;
void transcriptState;
void requestOptions;
void providerSurface;
void openrouterSurface;
void openrouterOptions;
void openrouterRequest;
void openrouterChatInput;
void openrouterMessage;
void openrouterEvent;
void sampleEvent;
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
