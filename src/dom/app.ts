import {
  dynamic,
  fragment,
  h,
  list,
  mount,
  renderResponse,
  show,
  text
} from './dom.js';
import { batch, computed, effect, signal, untrack } from '../core/signal.js';
import { response } from '../core/response.js';
import { from, mapStream, scanStream, stream } from '../core/stream.js';
import type { MountTarget, MountView, QoreChild, QoreElement } from './types.js';

export interface AppContext<Props extends Record<string, unknown>> {
  app: QoreApp<Props>;
  root: QoreElement;
  props: Props;
  signal: typeof signal;
  computed: typeof computed;
  effect: typeof effect;
  batch: typeof batch;
  untrack: typeof untrack;
  stream: typeof stream;
  from: typeof from;
  mapStream: typeof mapStream;
  scanStream: typeof scanStream;
  response: typeof response;
  h: typeof h;
  text: typeof text;
  dynamic: typeof dynamic;
  show: typeof show;
  list: typeof list;
  fragment: typeof fragment;
  renderResponse: typeof renderResponse;
  onCleanup(handler: (() => void) | null | undefined): (() => void) | null | undefined;
}

export type AppSetupResult =
  | QoreChild
  | {
      view?: MountView;
      onMount?: (root: QoreElement) => void;
    };

type AppLifecycleResult = {
  view?: MountView;
  onMount?: (root: QoreElement) => void;
};

export interface QoreApp<Props extends Record<string, unknown>> {
  mount(target: MountTarget, props?: Props): QoreElement;
  unmount(): QoreApp<Props>;
  readonly root: QoreElement | null;
}

// Resolve a CSS selector or direct node into the root mount target.
function resolveTarget(target: MountTarget): Element {
  if (typeof document === 'undefined') {
    throw new Error('Qore app mounting requires a browser-like environment');
  }

  if (typeof target === 'string') {
    const element = document.querySelector(target);

    if (!element) {
      throw new Error(`Qore could not find a mount target for selector: ${target}`);
    }

    return element;
  }

  return target;
}

// Create a tiny application shell around Qore's lower-level primitives.
export function createApp<Props extends Record<string, unknown> = Record<string, unknown>>(
  setup: (context: AppContext<Props>) => AppSetupResult
): QoreApp<Props> {
  let dispose: (() => QoreElement) | null = null;
  let mountedRoot: QoreElement | null = null;
  let cleanupHandlers: Array<() => void> = [];

  const app: QoreApp<Props> = {
    // Mount the app, provide framework primitives to setup, and render the resulting view.
    mount(target, props = {} as Props) {
      const root = resolveTarget(target);
      app.unmount();

      cleanupHandlers = [];
      mountedRoot = root;

      // Expose the core runtime pieces so an app can stay entirely within Qore primitives.
      const context: AppContext<Props> = {
        app,
        root,
        props,
        signal,
        computed,
        effect,
        batch,
        untrack,
        stream,
        from,
        mapStream,
        scanStream,
        response,
        h,
        text,
        dynamic,
        show,
        list,
        fragment,
        renderResponse,
        onCleanup(handler) {
          if (typeof handler === 'function') {
            cleanupHandlers.push(handler);
          }

          return handler;
        }
      };

      // Allow setup to return either a raw view or an object with lifecycle hooks.
      const result = setup(context);
      const lifecycleResult = result && typeof result === 'object'
        ? result as AppLifecycleResult
        : null;
      const view = lifecycleResult && 'view' in lifecycleResult
        ? lifecycleResult.view
        : result;
      const onMount = lifecycleResult?.onMount ?? null;

      dispose = mount(root, view);

      if (typeof onMount === 'function') {
        onMount(root);
      }

      return root;
    },

    // Tear down the mounted tree and any user-registered cleanup handlers.
    unmount() {
      if (dispose) {
        const stop = dispose;
        dispose = null;
        stop();
      }

      for (let index = cleanupHandlers.length - 1; index >= 0; index -= 1) {
        try {
          const cleanup = cleanupHandlers[index];

          if (cleanup) {
            cleanup();
          }
        } catch {
          // Ignore user cleanup errors so the app can still unmount.
        }
      }

      cleanupHandlers = [];
      mountedRoot = null;
      return app;
    },

    get root() {
      return mountedRoot;
    }
  };

  return app;
}
