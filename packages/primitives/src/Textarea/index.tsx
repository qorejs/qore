import { type ComponentChildren, type JSX, signal } from '@qore/core'

export interface TextareaProps extends JSX.HTMLAttributes<HTMLTextAreaElement> {
  /** Textarea size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Textarea variant */
  variant?: 'default' | 'filled' | 'outlined'
  
  /** Disabled state */
  disabled?: boolean
  
  /** Read-only state */
  readOnly?: boolean
  
  /** Error state */
  error?: boolean | string
  
  /** Success state */
  success?: boolean
  
  /** Required */
  required?: boolean
  
  /** Placeholder */
  placeholder?: string
  
  /** Value (controlled) */
  value?: string
  
  /** Default value (uncontrolled) */
  defaultValue?: string
  
  /** onChange handler */
  onChange?: (value: string) => void
  
  /** Rows */
  rows?: number
  
  /** Auto-resize */
  autoResize?: boolean
  
  /** Max length */
  maxLength?: number
  
  /** Label */
  label?: string
  
  /** Helper text */
  helperText?: string
}

/**
 * Textarea Component
 * 
 * A headless, accessible textarea component with auto-resize support.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // Uncontrolled
 * <Textarea placeholder="Enter text" rows={4} />
 * 
 * // Controlled
 * const [value, setValue] = signal('')
 * <Textarea value={value()} onChange={setValue} />
 * 
 * // Auto-resize
 * <Textarea autoResize placeholder="Auto-resizing textarea" />
 * 
 * // With error
 * <Textarea error="This field is required" />
 * ```
 */
export function Textarea(props: TextareaProps) {
  const {
    size = 'md',
    variant = 'default',
    disabled = false,
    readOnly = false,
    error = false,
    success = false,
    required = false,
    placeholder,
    value: controlledValue,
    defaultValue,
    onChange,
    rows = 4,
    autoResize = false,
    maxLength,
    label,
    helperText,
    class: className = '',
    id,
    name,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalValue = signal(defaultValue ?? '')
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledValue !== undefined
  
  const textareaValue = isControlled ? controlledValue : internalValue()
  
  const handleChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    const newValue = target.value
    
    if (!isControlled) {
      internalValue(newValue)
    }
    
    onChange?.(newValue)
    
    // Auto-resize
    if (autoResize) {
      target.style.height = 'auto'
      target.style.height = `${target.scrollHeight}px`
    }
  }
  
  // Build class names
  const textareaClasses = [
    'qore-textarea',
    `qore-textarea-${size}`,
    `qore-textarea-${variant}`,
    disabled ? 'qore-textarea-disabled' : '',
    readOnly ? 'qore-textarea-readonly' : '',
    error ? 'qore-textarea-error' : '',
    success ? 'qore-textarea-success' : '',
    autoResize ? 'qore-textarea-autoresize' : '',
    className,
  ].filter(Boolean).join(' ')
  
  const errorId = error ? `${id}-error` : undefined
  const labelId = label ? `${id}-label` : undefined
  
  // Character count
  const showCharCount = maxLength !== undefined
  const charCount = textareaValue?.length ?? 0
  
  return (
    <div class="qore-textarea-wrapper">
      {label && (
        <label 
          id={labelId}
          for={id}
          class="qore-textarea-label"
        >
          {label}
          {required && <span class="qore-textarea-required" aria-hidden="true">*</span>}
        </label>
      )}
      
      <div class="qore-textarea-container">
        <textarea
          id={id}
          name={name}
          class={textareaClasses}
          value={textareaValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          maxlength={maxLength}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId || labelId}
          onInput={handleChange}
          {...rest}
        />
      </div>
      
      {(helperText || showCharCount) && (
        <div class="qore-textarea-footer">
          {helperText && (
            <p class="qore-textarea-helper" id={errorId}>
              {typeof error === 'string' ? error : helperText}
            </p>
          )}
          
          {showCharCount && (
            <span class="qore-textarea-count">
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export type { TextareaProps }
