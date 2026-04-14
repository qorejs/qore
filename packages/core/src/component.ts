/**
 * Qore Components - Simple component system
 */

import { Signal } from './reactive';
import { VNode, h } from './renderer';

export type Props<T = any> = Record<string, T>;
export type Component<P extends Props = Props> = (props: P) => VNode;

export function createComponent<P extends Props>(
  name: string,
  renderFn: (props: P, state: Record<string, Signal<any>>) => VNode
): Component<P> {
  return (props: P) => {
    const state: Record<string, Signal<any>> = {};
    
    const useState = <T>(initialValue: T, key: string): Signal<T> => {
      if (!state[key]) {
        state[key] = new Signal(initialValue) as Signal<T>;
      }
      return state[key] as Signal<T>;
    };

    return renderFn(props, state);
  };
}

export function Fragment({ children }: { children: any[] }): any[] {
  return children;
}

export function component<P extends Props>(
  tagName: string,
  defaultProps: P = {} as P
): Component<P> {
  return (props: P) => {
    const mergedProps = { ...defaultProps, ...props };
    return h(tagName, mergedProps);
  };
}

// Built-in components
export const div = component('div');
export const span = component('span');
export const button = component('button');
export const input = component('input');
export const ul = component('ul');
export const li = component('li');
export const h1 = component('h1');
export const h2 = component('h2');
export const p = component('p');
