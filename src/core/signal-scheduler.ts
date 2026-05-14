import type { EffectScheduler } from './signal-types.js';

export function scheduleEffectRun(scheduler: EffectScheduler | undefined, run: () => void): void {
  if (typeof scheduler === 'function') {
    scheduler(run);
    return;
  }

  if (scheduler === 'microtask') {
    queueMicrotask(run);
    return;
  }

  if (scheduler === 'raf') {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => run());
      return;
    }

    queueMicrotask(run);
    return;
  }

  run();
}
