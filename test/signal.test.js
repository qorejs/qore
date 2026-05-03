// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { batch, computed, effect, signal, untrack } from '../src/index.js';
// Cover the core signal API surface from raw writes through observer semantics.
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
// Verify that effects clean up old resources before re-running with new dependencies.
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
// A batch should collapse multiple synchronous writes into one downstream observer pass.
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
// Subscriptions should be able to start silently and stop receiving updates after unsubscribe.
test('signal subscribe can skip the immediate emission and unsubscribe cleanly', () => {
    const value = signal(1);
    const seen = [];
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
    const seen = [];
    effect(() => {
        seen.push(untrack(() => count()));
    });
    count.set(2);
    assert.deepEqual(seen, [1]);
});
