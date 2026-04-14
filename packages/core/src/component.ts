/**
 * Qore Components - Minimal abstraction
 */

import { signal, Signal } from './signal';
import { VNode } from './render';

export type Props = Record<string, any>;

export function createComponent<P extends Props>(
  name: string,
  renderFn: (props: P, state: <T>(key: string, initial: T) => Signal<T>) => VNode
): (props: P) => VNode {
  return (props: P) => {
    const stateMap = new Map<string, Signal<any>>();
    
    const state = <T>(key: string, initial: T): Signal<T> => {
      if (!stateMap.has(key)) {
        stateMap.set(key, signal(initial));
      }
      return stateMap.get(key)!;
    };
    
    return renderFn(props, state);
  };
}
