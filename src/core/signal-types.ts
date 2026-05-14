export interface SubscribeOptions {
  immediate?: boolean;
}

export type SignalListener<T> = (value: T) => void;
export type Cleanup = () => void;
export type EffectCallback = () => void | Cleanup;
export type EffectScheduler = 'sync' | 'microtask' | 'raf' | ((run: () => void) => void);

export interface EffectOptions {
  scheduler?: EffectScheduler;
}

export interface ObserverDependency {
  subscribers: Set<ReactiveObserver>;
}

export interface ReactiveObserver {
  deps: Set<ObserverDependency>;
  active: boolean;
  schedule(): void;
  notify(): void;
}
