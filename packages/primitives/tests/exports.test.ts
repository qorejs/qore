import { describe, it, expect } from 'vitest'
import * as Primitives from '../src/index'

describe('Primitives', () => {
  it('should export Button', () => {
    expect(Primitives.Button).toBeDefined()
  })

  it('should export Input', () => {
    expect(Primitives.Input).toBeDefined()
  })

  it('should export Textarea', () => {
    expect(Primitives.Textarea).toBeDefined()
  })

  it('should export Select', () => {
    expect(Primitives.Select).toBeDefined()
  })

  it('should export Checkbox', () => {
    expect(Primitives.Checkbox).toBeDefined()
  })

  it('should export RadioGroup', () => {
    expect(Primitives.RadioGroup).toBeDefined()
  })

  it('should export Switch', () => {
    expect(Primitives.Switch).toBeDefined()
  })

  it('should export Dialog', () => {
    expect(Primitives.Dialog).toBeDefined()
  })

  it('should export ToastProvider', () => {
    expect(Primitives.ToastProvider).toBeDefined()
  })

  it('should export Toast functions', () => {
    expect(Primitives.info).toBeDefined()
    expect(Primitives.success).toBeDefined()
    expect(Primitives.warning).toBeDefined()
    expect(Primitives.error).toBeDefined()
  })

  it('should export Tooltip', () => {
    expect(Primitives.Tooltip).toBeDefined()
  })

  it('should export Tabs', () => {
    expect(Primitives.Tabs).toBeDefined()
  })
})

describe('Button', () => {
  it('should have Button component', () => {
    expect(typeof Primitives.Button).toBe('function')
  })
})

describe('Input', () => {
  it('should have Input component', () => {
    expect(typeof Primitives.Input).toBe('function')
  })
})

describe('Dialog', () => {
  it('should have Dialog component', () => {
    expect(typeof Primitives.Dialog).toBe('function')
  })
})
