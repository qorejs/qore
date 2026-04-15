import { type ComponentChildren, type JSX, signal } from '@qorejs/qore'

export interface CheckboxProps extends JSX.HTMLAttributes<HTMLInputElement> {
  /** Checkbox size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Disabled state */
  disabled?: boolean
  
  /** Required */
  required?: boolean
  
  /** Checked state (controlled) */
  checked?: boolean
  
  /** Default checked (uncontrolled) */
  defaultChecked?: boolean
  
  /** Indeterminate state */
  indeterminate?: boolean
  
  /** onChange handler */
  onChange?: (checked: boolean) => void
  
  /** Label */
  label?: ComponentChildren
  
  /** Description */
  description?: string
  
  /** Error state */
  error?: boolean | string
}

/**
 * Checkbox Component
 * 
 * A headless, accessible checkbox component with indeterminate state support.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // Uncontrolled
 * <Checkbox label="Accept terms" />
 * 
 * // Controlled
 * const [checked, setChecked] = signal(false)
 * <Checkbox checked={checked()} onChange={setChecked} label="Subscribe" />
 * 
 * // Indeterminate
 * <Checkbox indeterminate label="Select all" />
 * 
 * // With description
 * <Checkbox 
 *   label="Enable notifications"
 *   description="Receive updates about your account"
 * />
 * ```
 */
export function Checkbox(props: CheckboxProps) {
  const {
    size = 'md',
    disabled = false,
    required = false,
    checked: controlledChecked,
    defaultChecked,
    indeterminate = false,
    onChange,
    label,
    description,
    error = false,
    class: className = '',
    id,
    name,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalChecked = signal(defaultChecked ?? false)
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledChecked !== undefined
  
  const isChecked = isControlled ? controlledChecked : internalChecked()
  
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newChecked = target.checked
    
    if (!isControlled) {
      internalChecked(newChecked)
    }
    
    onChange?.(newChecked)
  }
  
  // Build class names
  const wrapperClasses = [
    'qore-checkbox-wrapper',
    `qore-checkbox-${size}`,
    disabled ? 'qore-checkbox-disabled' : '',
    error ? 'qore-checkbox-error' : '',
    className,
  ].filter(Boolean).join(' ')
  
  const checkboxClasses = [
    'qore-checkbox',
    indeterminate ? 'qore-checkbox-indeterminate' : '',
  ].filter(Boolean).join(' ')
  
  const errorId = error ? `${id}-error` : undefined
  const labelId = label ? `${id}-label` : undefined
  
  return (
    <div class={wrapperClasses}>
      <label class="qore-checkbox-label">
        <input
          id={id}
          name={name}
          type="checkbox"
          class={checkboxClasses}
          checked={isChecked}
          disabled={disabled}
          required={required}
          aria-checked={indeterminate ? 'mixed' : isChecked}
          aria-describedby={labelId || errorId}
          onChange={handleChange}
          {...rest}
        />
        
        <span class="qore-checkbox-custom" aria-hidden="true">
          {indeterminate ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="11" width="14" height="2" fill="currentColor"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
        
        {label && (
          <span id={labelId} class="qore-checkbox-text">
            {label}
          </span>
        )}
      </label>
      
      {description && (
        <p class="qore-checkbox-description">{description}</p>
      )}
      
      {error && typeof error === 'string' && (
        <p class="qore-checkbox-error-message" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

export type { CheckboxProps }
