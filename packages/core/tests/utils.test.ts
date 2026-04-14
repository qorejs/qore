import { describe, it, expect } from 'vitest';
import { cx, style, onEvent, preventDefault, stopPropagation } from '../src/utils';

describe('cx - Class Name Utility', () => {
  it('should join string classes', () => {
    expect(cx('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should filter out falsy values', () => {
    expect(cx('foo', false, null, undefined, 'bar')).toBe('foo bar');
  });

  it('should handle object with boolean values', () => {
    expect(cx({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should mix strings and objects', () => {
    expect(cx('base', { active: true, disabled: false }, 'extra')).toBe('base active extra');
  });

  it('should handle empty input', () => {
    expect(cx()).toBe('');
    expect(cx(false, null, undefined)).toBe('');
  });
});

describe('style - Style Merging Utility', () => {
  it('should merge style objects', () => {
    const result = style(
      { color: 'red', fontSize: 14 },
      { backgroundColor: 'blue' }
    );
    expect(result).toEqual({
      color: 'red',
      fontSize: 14,
      backgroundColor: 'blue',
    });
  });

  it('should override earlier styles with later ones', () => {
    const result = style(
      { color: 'red', fontSize: 14 },
      { color: 'blue' }
    );
    expect(result.color).toBe('blue');
    expect(result.fontSize).toBe(14);
  });

  it('should filter out falsy values', () => {
    const result = style(
      { color: 'red' },
      false,
      null,
      undefined,
      { fontSize: 14 }
    );
    expect(result).toEqual({ color: 'red', fontSize: 14 });
  });

  it('should handle empty input', () => {
    expect(style()).toEqual({});
    expect(style(false, null, undefined)).toEqual({});
  });
});

describe('onEvent - Event Handler Creators', () => {
  it('should create onClick handler', () => {
    const handler = () => {};
    const result = onEvent.click(handler);
    expect(result).toHaveProperty('onClick', handler);
  });

  it('should create onChange handler', () => {
    const handler = () => {};
    const result = onEvent.change(handler);
    expect(result).toHaveProperty('onChange', handler);
  });

  it('should create onInput handler', () => {
    const handler = () => {};
    const result = onEvent.input(handler);
    expect(result).toHaveProperty('onInput', handler);
  });

  it('should create onSubmit handler', () => {
    const handler = () => {};
    const result = onEvent.submit(handler);
    expect(result).toHaveProperty('onSubmit', handler);
  });

  it('should create onKeyDown handler', () => {
    const handler = () => {};
    const result = onEvent.keydown(handler);
    expect(result).toHaveProperty('onKeyDown', handler);
  });

  it('should create onFocus handler', () => {
    const handler = () => {};
    const result = onEvent.focus(handler);
    expect(result).toHaveProperty('onFocus', handler);
  });

  it('should create onBlur handler', () => {
    const handler = () => {};
    const result = onEvent.blur(handler);
    expect(result).toHaveProperty('onBlur', handler);
  });

  it('should create onMouseEnter handler', () => {
    const handler = () => {};
    const result = onEvent.mouseenter(handler);
    expect(result).toHaveProperty('onMouseEnter', handler);
  });

  it('should create onMouseLeave handler', () => {
    const handler = () => {};
    const result = onEvent.mouseleave(handler);
    expect(result).toHaveProperty('onMouseLeave', handler);
  });
});

describe('preventDefault', () => {
  it('should call preventDefault on event', () => {
    const prevented = { preventDefault: () => {} };
    let called = false;
    
    const handler = preventDefault(() => {
      called = true;
    });
    
    handler(prevented as any);
    expect(called).toBe(true);
  });
});

describe('stopPropagation', () => {
  it('should call stopPropagation on event', () => {
    const stopped = { stopPropagation: () => {} };
    let called = false;
    
    const handler = stopPropagation(() => {
      called = true;
    });
    
    handler(stopped as any);
    expect(called).toBe(true);
  });
});
