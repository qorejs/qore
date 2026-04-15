import { type ComponentChildren, type JSX, signal } from '@qorejs/qore'

export interface SwitchProps extends JSX.HTMLAttributes<HTMLInputElement> {
  /** Switch size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Disabled state */
  disabled?: boolean
  
  /** Checked state (controlled) */
  checked?: boolean
  
  /** Default checked (uncontrolled) */
  defaultChecked?: boolean
  
  /** onChange handler */
  onChange?: (checked: boolean) => void
  
  /** Label */
  label?: ComponentChildren
  
  /** Description */
  description?: string
  
  /** Loading state */
  loading?: boolean
  
  /** Icons for on/off states */
  onIcon?: ComponentChildren
  offIcon?: ComponentChildren
  
  /** Colors */
  color?: 'primary' | 'success' | 'danger'
}

/**
 * Switch Component
 * 
 * A headless, accessible toggle switch component.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // Uncontrolled
 * <Switch label="Enable notifications" />
 * 
 * // Controlled
 * const [checked, setChecked] = signal(false)
 * <Switch checked={checked()} onChange={setChecked} label="Dark mode" />
 * 
 * // With loading state
 * <Switch loading label="Syncing..." />
 * 
 * // With custom colors
 * <Switch color="success" label="Enabled" />
 * ```
 */
export function Switch(props: SwitchProps) {
  const {
    size = 'md',
    disabled = false,
    checked: controlledChecked,
    defaultChecked,
    onChange,
    label,
    description,
    loading = false,
    onIcon,
    offIcon,
    color = 'primary',
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
    'qore-switch-wrapper',
    `qore-switch-${size}`,
    `qore-switch-${color}`,
    disabled ? 'qore-switch-disabled' : '',
    loading ? 'qore-switch-loading' : '',
    className,
  ].filter(Boolean).join(' ')
  
  const switchClasses = [
    'qore-switch',
    isChecked ? 'qore-switch-checked' : '',
    loading ? 'qore-switch-loading' : '',
  ].filter(Boolean).join(' ')
  
  return (
    <div class={wrapperClasses}>
      <label class="qore-switch-label">
        <input
          id={id}
          name={name}
          type="checkbox"
          class="qore-switch-input"
          checked={isChecked}
          disabled={disabled || loading}
          aria-checked={isChecked}
          onChange={handleChange}
          {...rest}
        />
        
        <span class={switchClasses} aria-hidden="true">
          <span class="qore-switch-track">
            {isChecked && onIcon && (
              <span class="qore-switch-icon-on">{onIcon}</span>
            )}
            {!isChecked && offIcon && (
              <span class="qore-switch-icon-off">{offIcon}</span>
            )}
          </span>
          <span class="qore-switch-thumb">
            {loading && (
              <span class="qore-switch-spinner">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </span>
            )}
          </span>
        </span>
        
        {label && (
          <span class="qore-switch-text">{label}</span>
        )}
      </label>
      
      {description && (
        <p class="qore-switch-description">{description}</p>
      )}
    </div>
  )
}

export type { SwitchProps }
