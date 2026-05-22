import test from 'node:test';
import assert from 'node:assert/strict';

import { batch, computed, effect, signal, untrack } from '../src/index.js';

// Cover the core signal API surface from raw writes through observer semantics.
test('signal supports undefined and direct updates', () => {
  const value = signal<string | undefined>(undefined);

  assert.equal(value(), undefined);

  value.set('qore');
  assert.equal(value(), 'qore');

  value.set(undefined);
  assert.equal(value(), undefined);
});

test('computed reacts to upstream signals', () => {
  const count = signal(2);
  const doubled = computed(() => count() * 2);

  assert.equal(doubled(), 4);

  count.set(7);
  assert.equal(doubled(), 14);
});

// Verify that effects clean up old resources before re-running with new dependencies.
test('effect tracks dependencies and runs cleanup before re-run', () => {
  const count = signal(0);
  const events: string[] = [];

  const stop = effect(() => {
    const current = count();
    events.push(`run:${current}`);

    return () => {
      events.push(`cleanup:${current}`);
    };
  });

  count.set(1);
  stop();

  assert.deepEqual(events, [
    'run:0',
    'cleanup:0',
    'run:1',
    'cleanup:1'
  ]);
});

// A batch should collapse multiple synchronous writes into one downstream observer pass.
test('batch collapses synchronous churn into one observer pass', () => {
  const count = signal(0);
  const seen: number[] = [];

  effect(() => {
    seen.push(count());
  });

  batch(() => {
    count.set(1);
    count.set(2);
    count.set(3);
  });

  assert.deepEqual(seen, [0, 3]);
});

// Subscriptions should be able to start silently and stop receiving updates after unsubscribe.
test('signal subscribe can skip the immediate emission and unsubscribe cleanly', () => {
  const value = signal(1);
  const seen: number[] = [];

  const unsubscribe = value.subscribe((nextValue) => {
    seen.push(nextValue);
  }, { immediate: false });

  value.set(2);
  unsubscribe();
  value.set(3);

  assert.deepEqual(seen, [2]);
});

// Stopped computed signals should retain their last value instead of continuing to track.
test('computed stop freezes its current value', () => {
  const count = signal(2);
  const doubled = computed(() => count() * 2);

  assert.equal(doubled(), 4);

  doubled.stop();
  count.set(10);

  assert.equal(doubled(), 4);
});

// untrack should allow one-off reads without wiring them into reactive dependencies.
test('untrack reads without subscribing to future updates', () => {
  const count = signal(1);
  const seen: number[] = [];

  effect(() => {
    seen.push(untrack(() => count()));
  });

  count.set(2);

  assert.deepEqual(seen, [1]);
});

// Dynamic computed dependencies should unsubscribe from stale branches when the selector flips.
test('computed drops stale dependencies when its branch changes', () => {
  const useLeft = signal(true);
  const left = signal(1);
  const right = signal(10);
  const selected = computed(() => useLeft() ? left() : right());
  const seen: number[] = [];

  effect(() => {
    seen.push(selected());
  });

  left.set(2);
  useLeft.set(false);
  left.set(3);
  right.set(11);

  assert.deepEqual(seen, [1, 2, 10, 11]);
});

// Batched writes across multiple inputs should still trigger a dependent computed only once.
test('computed observers flush once per batch across multiple dependencies', () => {
  const left = signal(1);
  const right = signal(2);
  const total = computed(() => left() + right());
  const seen: number[] = [];

  effect(() => {
    seen.push(total());
  });

  batch(() => {
    left.set(5);
    right.set(9);
  });

  assert.deepEqual(seen, [3, 14]);
});

test('diamond dependencies settle once per source write', () => {
  const source = signal(1);
  const left = computed(() => source() * 2);
  const right = computed(() => source() * 3);
  const total = computed(() => left() + right());
  const seen: number[] = [];

  effect(() => {
    seen.push(total());
  });

  source.set(2);

  assert.deepEqual(seen, [5, 10]);
});

test('diamond dependencies do not recompute downstream computed values twice per source write', () => {
  const source = signal(1);
  const left = computed(() => source() + 1);
  const right = computed(() => source() + 2);
  let recomputes = 0;
  const total = computed(() => {
    recomputes += 1;
    return left() + right();
  });

  assert.equal(total(), 5);
  assert.equal(recomputes, 1);

  source.set(3);

  assert.equal(total(), 9);
  assert.equal(recomputes, 2);
});

test('microtask scheduled effects collapse synchronous writes', async () => {
  const count = signal(0);
  const seen: number[] = [];

  effect(() => {
    seen.push(count());
  }, { scheduler: 'microtask' });

  count.set(1);
  count.set(2);
  count.set(3);

  assert.deepEqual(seen, [0]);
  await Promise.resolve();
  assert.deepEqual(seen, [0, 3]);
});

test('raf scheduled effects use animation frame when available', async () => {
  const runtime = globalThis as typeof globalThis & {
    requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  };
  const originalRequestAnimationFrame = runtime.requestAnimationFrame;
  const queuedFrames: FrameRequestCallback[] = [];
  const count = signal(0);
  const seen: number[] = [];

  runtime.requestAnimationFrame = (callback) => {
    queuedFrames.push(callback);
    return queuedFrames.length;
  };

  try {
    effect(() => {
      seen.push(count());
    }, { scheduler: 'raf' });

    count.set(1);
    count.set(2);

    assert.deepEqual(seen, [0]);
    assert.equal(queuedFrames.length, 1);

    queuedFrames.shift()?.(performance.now());

    assert.deepEqual(seen, [0, 2]);
  } finally {
    if (originalRequestAnimationFrame) {
      runtime.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete runtime.requestAnimationFrame;
    }
  }
});

test('custom scheduled effects run through the provided scheduler', () => {
  const count = signal(0);
  const seen: number[] = [];
  const jobs: Array<() => void> = [];

  effect(() => {
    seen.push(count());
  }, {
    scheduler(run) {
      jobs.push(run);
    }
  });

  count.set(1);
  count.set(2);

  assert.deepEqual(seen, [0]);
  assert.equal(jobs.length, 1);

  jobs.shift()?.();

  assert.deepEqual(seen, [0, 2]);
});

test('stopped scheduled effects do not run queued jobs', async () => {
  const count = signal(0);
  const seen: number[] = [];

  const stop = effect(() => {
    seen.push(count());
  }, { scheduler: 'microtask' });

  count.set(1);
  stop();

  await Promise.resolve();

  assert.deepEqual(seen, [0]);
});

test('microtask scheduled effects can settle chained writes without duplicate queued runs', async () => {
  const count = signal(0);
  const seen: number[] = [];

  effect(() => {
    const current = count();
    seen.push(current);

    if (current < 2) {
      count.set(current + 1);
    }
  }, { scheduler: 'microtask' });

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(seen, [0, 1, 2]);
});

test('effects recover after a thrown callback leaves the current run', () => {
  const count = signal(0);
  const seen: number[] = [];

  effect(() => {
    const current = count();
    seen.push(current);

    if (current === 1) {
      throw new Error('boom');
    }
  });

  assert.throws(() => {
    count.set(1);
  }, /boom/);

  count.set(2);

  assert.deepEqual(seen, [0, 1, 2]);
});

test('effects stay subscribed when cleanup throws before the next run', () => {
  const count = signal(0);
  const events: string[] = [];
  let shouldThrowCleanup = true;

  effect(() => {
    const current = count();
    events.push(`run:${current}`);

    return () => {
      events.push(`cleanup:${current}`);

      if (current === 0 && shouldThrowCleanup) {
        shouldThrowCleanup = false;
        throw new Error('cleanup boom');
      }
    };
  });

  assert.throws(() => {
    count.set(1);
  }, /cleanup boom/);

  count.set(2);

  assert.deepEqual(events, [
    'run:0',
    'cleanup:0',
    'run:2'
  ]);
});
