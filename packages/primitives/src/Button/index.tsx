import { h, type ComponentChildren } from '@qorejs/qore'

export interface ButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Disabled state */
  disabled?: boolean
  
  /** Loading state */
  loading?: boolean
  
  /** Full width button */
  fullWidth?: boolean
  
  /** Button type */
  type?: 'button' | 'submit' | 'reset'
  
  /** Children */
  children?: ComponentChildren
  
  /** Class name */
  class?: string
  
  /** Click handler */
  onClick?: (e: Event) => void
}

/**
 * Button Component
 * 
 * A headless, accessible button component with multiple variants and sizes.
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    type = 'button',
    children,
    class: className = '',
    onClick,
    ...rest
  } = props
  
  // Build class names
  const classes = [
    'qore-button',
    `qore-button-${variant}`,
    `qore-button-${size}`,
    fullWidth ? 'qore-button-full' : '',
    disabled || loading ? 'qore-button-disabled' : '',
    loading ? 'qore-button-loading' : '',
    className,
  ].filter(Boolean).join(' ')
  
  return h('button', {
    type,
    class: classes,
    disabled: disabled || loading,
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    onClick,
    ...rest,
  },
    loading && h('span', { class: 'qore-button-spinner', 'aria-hidden': 'true' },
      h('svg', { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        h('circle', {
          cx: '12',
          cy: '12',
          r: '10',
          stroke: 'currentColor',
          strokeWidth: '3',
          strokeDasharray: '31.4 31.4',
          strokeLinecap: 'round',
          innerHTML: '<animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>'
        })
      )
    ),
    h('span', { class: loading ? 'qore-button-content-hidden' : '' }, children)
  )
}

export type { ButtonProps }
