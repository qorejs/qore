import test from 'node:test';
import assert from 'node:assert/strict';

import { batch, computed, effect, signal } from '../src/index.js';

test('signal supports undefined and direct updates', () => {
  const value = signal(undefined);

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

test('effect tracks dependencies and runs cleanup before re-run', () => {
  const count = signal(0);
  const events = [];

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

test('batch collapses synchronous churn into one observer pass', () => {
  const count = signal(0);
  const seen = [];

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
