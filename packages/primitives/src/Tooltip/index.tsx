import { type ComponentChildren, type JSX, signal, effect } from '@qorejs/qore'

export interface TooltipProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Content */
  content: ComponentChildren
  
  /** Open state (controlled) */
  open?: boolean
  
  /** Default open (uncontrolled) */
  defaultOpen?: boolean
  
  /** onOpenChange handler */
  onOpenChange?: (open: boolean) => void
  
  /** Position */
  position?: 'top' | 'bottom' | 'left' | 'right'
  
  /** Trigger type */
  trigger?: 'hover' | 'click' | 'focus'
  
  /** Delay before showing (ms) */
  delay?: number
  
  /** Children */
  children: ComponentChildren
}

/**
 * Tooltip Component
 * 
 * A headless, accessible tooltip component.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // Basic
 * <Tooltip content="Helpful information">
 *   <Button>Hover me</Button>
 * </Tooltip>
 * 
 * // Controlled
 * const [open, setOpen] = signal(false)
 * <Tooltip 
 *   content="Info" 
 *   open={open()}
 *   onOpenChange={setOpen}
 * >
 *   <Button>Click me</Button>
 * </Tooltip>
 * 
 * // Different positions
 * <Tooltip content="Top" position="top">
 *   <span>Top tooltip</span>
 * </Tooltip>
 * ```
 */
export function Tooltip(props: TooltipProps) {
  const {
    content,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    position = 'top',
    trigger = 'hover',
    delay = 200,
    children,
    class: className = '',
    id,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalOpen = signal(defaultOpen)
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledOpen !== undefined
  
  const isOpen = isControlled ? controlledOpen : internalOpen()
  
  const setOpen = (open: boolean) => {
    if (!isControlled) {
      internalOpen(open)
    }
    onOpenChange?.(open)
  }
  
  // Delay timer
  let showTimer: any = null
  let hideTimer: any = null
  
  const handleShow = () => {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    
    showTimer = setTimeout(() => {
      setOpen(true)
    }, delay)
  }
  
  const handleHide = () => {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    
    hideTimer = setTimeout(() => {
      setOpen(false)
    }, delay)
  }
  
  const handleClick = () => {
    if (trigger === 'click') {
      setOpen(!isOpen)
    }
  }
  
  // Position classes
  const positionClasses = {
    top: 'qore-tooltip-top',
    bottom: 'qore-tooltip-bottom',
    left: 'qore-tooltip-left',
    right: 'qore-tooltip-right',
  }
  
  const tooltipId = id ? `${id}-tooltip` : undefined
  
  return (
    <div 
      class="qore-tooltip-wrapper"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Trigger */}
      <div
        class="qore-tooltip-trigger"
        onMouseEnter={trigger === 'hover' ? handleShow : undefined}
        onMouseLeave={trigger === 'hover' ? handleHide : undefined}
        onFocus={trigger === 'focus' || trigger === 'hover' ? handleShow : undefined}
        onBlur={trigger === 'focus' || trigger === 'hover' ? handleHide : undefined}
        onClick={handleClick}
        aria-describedby={isOpen ? tooltipId : undefined}
      >
        {children}
      </div>
      
      {/* Tooltip */}
      {isOpen && (
        <div
          id={tooltipId}
          class={`qore-tooltip ${positionClasses[position]} ${className}`}
          role="tooltip"
          {...rest}
        >
          {content}
          <span class="qore-tooltip-arrow" aria-hidden="true"></span>
        </div>
      )}
    </div>
  )
}

export type { TooltipProps }
