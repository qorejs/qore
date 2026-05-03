// @ts-nocheck
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

// Resolve a CSS selector or direct node into the root mount target.
function resolveTarget(target) {
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
export function createApp(setup) {
  let dispose = null;
  let mountedRoot = null;
  let cleanupHandlers = [];

  const app = {
    // Mount the app, provide framework primitives to setup, and render the resulting view.
    mount(target, props = {}) {
      const root = resolveTarget(target);
      app.unmount();

      cleanupHandlers = [];
      mountedRoot = root;

      // Expose the core runtime pieces so an app can stay entirely within Qore primitives.
      const context = {
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
      const view = result && typeof result === 'object' && 'view' in result
        ? result.view
        : result;
      const onMount = result && typeof result === 'object' ? result.onMount : null;

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
          cleanupHandlers[index]();
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
