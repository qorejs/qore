import { type ComponentChildren, type JSX, signal, effect } from '@qorejs/qore'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends JSX.HTMLAttributes<HTMLSelectElement> {
  /** Select size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Select variant */
  variant?: 'default' | 'filled' | 'outlined'
  
  /** Disabled state */
  disabled?: boolean
  
  /** Error state */
  error?: boolean | string
  
  /** Required */
  required?: boolean
  
  /** Placeholder */
  placeholder?: string
  
  /** Options */
  options?: SelectOption[]
  
  /** Value (controlled) */
  value?: string | number
  
  /** Default value (uncontrolled) */
  defaultValue?: string | number
  
  /** onChange handler */
  onChange?: (value: string) => void
  
  /** Multiple selection */
  multiple?: boolean
  
  /** Label */
  label?: string
  
  /** Helper text */
  helperText?: string
  
  /** Children (for custom options) */
  children?: ComponentChildren
}

/**
 * Select Component
 * 
 * A headless, accessible select component with custom dropdown support.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // With options array
 * <Select 
 *   options={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' },
 *   ]}
 * />
 * 
 * // Controlled
 * const [value, setValue] = signal('1')
 * <Select value={value()} onChange={setValue} options={options} />
 * 
 * // With custom options
 * <Select>
 *   <option value="1">Option 1</option>
 *   <option value="2">Option 2</option>
 * </Select>
 * ```
 */
export function Select(props: SelectProps) {
  const {
    size = 'md',
    variant = 'default',
    disabled = false,
    error = false,
    required = false,
    placeholder,
    options,
    value: controlledValue,
    defaultValue,
    onChange,
    multiple = false,
    label,
    helperText,
    children,
    class: className = '',
    id,
    name,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalValue = signal(defaultValue ?? (multiple ? [] : ''))
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledValue !== undefined
  
  const selectValue = isControlled ? controlledValue : internalValue()
  
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    const newValue = multiple 
      ? Array.from(target.selectedOptions).map(o => o.value)
      : target.value
    
    if (!isControlled) {
      internalValue(newValue as any)
    }
    
    onChange?.(newValue as string)
  }
  
  // Build class names
  const selectClasses = [
    'qore-select',
    `qore-select-${size}`,
    `qore-select-${variant}`,
    disabled ? 'qore-select-disabled' : '',
    error ? 'qore-select-error' : '',
    className,
  ].filter(Boolean).join(' ')
  
  const errorId = error ? `${id}-error` : undefined
  const labelId = label ? `${id}-label` : undefined
  
  return (
    <div class="qore-select-wrapper">
      {label && (
        <label 
          id={labelId}
          for={id}
          class="qore-select-label"
        >
          {label}
          {required && <span class="qore-select-required" aria-hidden="true">*</span>}
        </label>
      )}
      
      <div class="qore-select-container">
        <select
          id={id}
          name={name}
          class={selectClasses}
          value={selectValue as string}
          disabled={disabled}
          multiple={multiple}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={errorId || labelId}
          onChange={handleChange}
          {...rest}
        >
          {placeholder && !multiple && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {options?.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
          
          {children}
        </select>
        
        <span class="qore-select-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      
      {helperText && (
        <p class="qore-select-helper" id={errorId}>
          {typeof error === 'string' ? error : helperText}
        </p>
      )}
    </div>
  )
}

export type { SelectProps, SelectOption }
