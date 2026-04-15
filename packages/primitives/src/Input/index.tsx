import { type ComponentChildren, type JSX, signal, effect } from '@qorejs/qore'

export interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local'
  
  /** Input size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Input variant */
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
  value?: string | number
  
  /** Default value (uncontrolled) */
  defaultValue?: string | number
  
  /** onChange handler */
  onChange?: (value: string) => void
  
  /** onBlur handler */
  onBlur?: JSX.EventHandler<HTMLInputElement, FocusEvent>
  
  /** Label */
  label?: string
  
  /** Helper text */
  helperText?: string
  
  /** Left icon */
  leftIcon?: ComponentChildren
  
  /** Right icon */
  rightIcon?: ComponentChildren
}

/**
 * Input Component
 * 
 * A headless, accessible input component with multiple variants and states.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // Uncontrolled
 * <Input placeholder="Enter text" />
 * 
 * // Controlled
 * const [value, setValue] = signal('')
 * <Input value={value()} onChange={setValue} />
 * 
 * // With error
 * <Input error="This field is required" />
 * 
 * // With label
 * <Input label="Email" type="email" />
 * ```
 */
export function Input(props: InputProps) {
  const {
    type = 'text',
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
    onBlur,
    label,
    helperText,
    leftIcon,
    rightIcon,
    class: className = '',
    id,
    name,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalValue = signal(defaultValue ?? '')
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledValue !== undefined
  
  const inputValue = isControlled ? controlledValue : internalValue()
  
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newValue = target.value
    
    if (!isControlled) {
      internalValue(newValue)
    }
    
    onChange?.(newValue)
  }
  
  // Build class names
  const inputClasses = [
    'qore-input',
    `qore-input-${size}`,
    `qore-input-${variant}`,
    disabled ? 'qore-input-disabled' : '',
    readOnly ? 'qore-input-readonly' : '',
    error ? 'qore-input-error' : '',
    success ? 'qore-input-success' : '',
    leftIcon ? 'qore-input-with-left-icon' : '',
    rightIcon ? 'qore-input-with-right-icon' : '',
    className,
  ].filter(Boolean).join(' ')
  
  const errorId = error ? `${id}-error` : undefined
  const labelId = label ? `${id}-label` : undefined
  
  return (
    <div class="qore-input-wrapper">
      {label && (
        <label 
          id={labelId}
          for={id}
          class="qore-input-label"
        >
          {label}
          {required && <span class="qore-input-required" aria-hidden="true">*</span>}
        </label>
      )}
      
      <div class="qore-input-container">
        {leftIcon && (
          <span class="qore-input-icon-left">{leftIcon}</span>
        )}
        
        <input
          id={id}
          name={name}
          type={type}
          class={inputClasses}
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId || labelId}
          onInput={handleChange}
          onBlur={onBlur}
          {...rest}
        />
        
        {rightIcon && (
          <span class="qore-input-icon-right">{rightIcon}</span>
        )}
      </div>
      
      {helperText && (
        <p class="qore-input-helper" id={errorId}>
          {typeof error === 'string' ? error : helperText}
        </p>
      )}
    </div>
  )
}

export type { InputProps }
