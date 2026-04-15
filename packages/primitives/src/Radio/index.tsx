import { type ComponentChildren, type JSX, signal } from '@qorejs/qore'

export interface RadioOption {
  value: string | number
  label: ComponentChildren
  disabled?: boolean
  description?: string
}

export interface RadioGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Radio size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Disabled state */
  disabled?: boolean
  
  /** Required */
  required?: boolean
  
  /** Error state */
  error?: boolean | string
  
  /** Value (controlled) */
  value?: string | number
  
  /** Default value (uncontrolled) */
  defaultValue?: string | number
  
  /** onChange handler */
  onChange?: (value: string) => void
  
  /** Options */
  options?: RadioOption[]
  
  /** Label */
  label?: string
  
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  
  /** Name for radio group */
  name?: string
}

/**
 * RadioGroup Component
 * 
 * A headless, accessible radio group component.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // With options array
 * <RadioGroup
 *   options={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' },
 *   ]}
 * />
 * 
 * // Controlled
 * const [value, setValue] = signal('1')
 * <RadioGroup value={value()} onChange={setValue} options={options} />
 * 
 * // Vertical orientation
 * <RadioGroup orientation="vertical" options={options} />
 * ```
 */
export function RadioGroup(props: RadioGroupProps) {
  const {
    size = 'md',
    disabled = false,
    required = false,
    error = false,
    value: controlledValue,
    defaultValue,
    onChange,
    options = [],
    label,
    orientation = 'vertical',
    name,
    class: className = '',
    id,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalValue = signal(defaultValue ?? '')
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledValue !== undefined
  
  const groupValue = isControlled ? controlledValue : internalValue()
  
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newValue = target.value
    
    if (!isControlled) {
      internalValue(newValue)
    }
    
    onChange?.(newValue)
  }
  
  // Build class names
  const groupClasses = [
    'qore-radio-group',
    `qore-radio-group-${orientation}`,
    `qore-radio-group-${size}`,
    disabled ? 'qore-radio-group-disabled' : '',
    error ? 'qore-radio-group-error' : '',
    className,
  ].filter(Boolean).join(' ')
  
  const errorId = error ? `${id}-error` : undefined
  const labelId = label ? `${id}-label` : undefined
  
  return (
    <div 
      id={id}
      class={groupClasses}
      role="radiogroup"
      aria-required={required}
      aria-describedby={errorId || labelId}
      {...rest}
    >
      {label && (
        <div id={labelId} class="qore-radio-group-label">
          {label}
          {required && <span class="qore-radio-required" aria-hidden="true">*</span>}
        </div>
      )}
      
      <div class="qore-radio-options">
        {options.map((option) => {
          const optionId = `${id}-${option.value}`
          const isChecked = groupValue === option.value
          const isOptionDisabled = disabled || (option.disabled ?? false)
          
          return (
            <label 
              key={option.value}
              class={`qore-radio-option ${isChecked ? 'qore-radio-option-checked' : ''} ${isOptionDisabled ? 'qore-radio-option-disabled' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isChecked}
                disabled={isOptionDisabled}
                onChange={handleChange}
                class="qore-radio-input"
              />
              
              <span class="qore-radio-custom" aria-hidden="true">
                <span class="qore-radio-dot"></span>
              </span>
              
              <span class="qore-radio-label">{option.label}</span>
              
              {option.description && (
                <span class="qore-radio-description">{option.description}</span>
              )}
            </label>
          )
        })}
      </div>
      
      {error && typeof error === 'string' && (
        <p class="qore-radio-error-message" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

export type { RadioGroupProps, RadioOption }
