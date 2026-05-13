export interface SubscribeOptions {
  immediate?: boolean;
}

export type SignalListener<T> = (value: T) => void;
export type Cleanup = () => void;
export type EffectCallback = () => void | Cleanup;

export interface ObserverDependency {
  subscribers: Set<ReactiveObserver>;
}

export interface ReactiveObserver {
  deps: Set<ObserverDependency>;
  active: boolean;
  notify(): void;
}
