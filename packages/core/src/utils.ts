/**
 * Qore Utilities
 */

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn(...args);
    }
  };
}

export function cx(...classes: (string | false | null | undefined | Record<string, boolean>)[]): string {
  const result: string[] = [];
  for (const cls of classes) {
    if (!cls) continue;
    if (typeof cls === 'string') result.push(cls);
    else if (typeof cls === 'object') {
      for (const [key, value] of Object.entries(cls)) {
        if (value) result.push(key);
      }
    }
  }
  return result.join(' ');
}

export function style(...styles: (Record<string, string | number> | false | null | undefined)[]): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const s of styles) {
    if (s) Object.assign(result, s);
  }
  return result;
}

export function on<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  type: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  el.addEventListener(type, handler as EventListener, options);
  return () => el.removeEventListener(type, handler as EventListener, options);
}

export const onEvent = {
  click: (handler: (e: MouseEvent) => void) => ({ onClick: handler }),
  change: (handler: (e: Event) => void) => ({ onChange: handler }),
  input: (handler: (e: Event) => void) => ({ onInput: handler }),
  submit: (handler: (e: SubmitEvent) => void) => ({ onSubmit: handler }),
  keydown: (handler: (e: KeyboardEvent) => void) => ({ onKeyDown: handler }),
  keyup: (handler: (e: KeyboardEvent) => void) => ({ onKeyUp: handler }),
  focus: (handler: (e: FocusEvent) => void) => ({ onFocus: handler }),
  blur: (handler: (e: FocusEvent) => void) => ({ onBlur: handler }),
  mouseenter: (handler: (e: MouseEvent) => void) => ({ onMouseEnter: handler }),
  mouseleave: (handler: (e: MouseEvent) => void) => ({ onMouseLeave: handler }),
};

export function preventDefault<T extends Event>(handler: (e: T) => void): (e: T) => void {
  return (e: T) => { e.preventDefault(); handler(e); };
}

export function stopPropagation<T extends Event>(handler: (e: T) => void): (e: T) => void {
  return (e: T) => { e.stopPropagation(); handler(e); };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
