import { type ComponentChildren, type JSX, signal, effect } from '@qore/core'

export interface DialogProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Open state (controlled) */
  open?: boolean
  
  /** Default open (uncontrolled) */
  defaultOpen?: boolean
  
  /** onOpenChange handler */
  onOpenChange?: (open: boolean) => void
  
  /** Title */
  title?: ComponentChildren
  
  /** Description */
  description?: ComponentChildren
  
  /** Footer content */
  footer?: ComponentChildren
  
  /** Close button */
  closeable?: boolean
  
  /** Close on overlay click */
  closeOnOverlayClick?: boolean
  
  /** Close on escape key */
  closeOnEscape?: boolean
  
  /** Size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  
  /** Children */
  children?: ComponentChildren
}

/**
 * Dialog Component
 * 
 * A headless, accessible modal dialog component.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // Uncontrolled
 * <Dialog title="Confirm" defaultOpen>
 *   <p>Are you sure?</p>
 * </Dialog>
 * 
 * // Controlled
 * const [open, setOpen] = signal(false)
 * <Dialog 
 *   open={open()} 
 *   onOpenChange={setOpen}
 *   title="Confirm"
 * >
 *   <p>Are you sure?</p>
 * </Dialog>
 * 
 * // With footer
 * <Dialog 
 *   title="Delete Item"
 *   footer={
 *     <>
 *       <Button variant="ghost">Cancel</Button>
 *       <Button variant="danger">Delete</Button>
 *     </>
 *   }
 * >
 *   <p>This action cannot be undone.</p>
 * </Dialog>
 * ```
 */
export function Dialog(props: DialogProps) {
  const {
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    title,
    description,
    footer,
    closeable = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    size = 'md',
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
  
  const handleClose = () => {
    setOpen(false)
  }
  
  // Handle escape key
  effect(() => {
    if (!isOpen || !closeOnEscape) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })
  
  // Handle body scroll lock
  effect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  })
  
  // Build class names
  const overlayClasses = [
    'qore-dialog-overlay',
    isOpen ? 'qore-dialog-overlay-open' : 'qore-dialog-overlay-closed',
  ].filter(Boolean).join(' ')
  
  const dialogClasses = [
    'qore-dialog',
    `qore-dialog-${size}`,
    isOpen ? 'qore-dialog-open' : 'qore-dialog-closed',
    className,
  ].filter(Boolean).join(' ')
  
  if (!isOpen) return null
  
  return (
    <div 
      class={overlayClasses}
      onClick={closeOnOverlayClick ? handleClose : undefined}
      aria-hidden={!isOpen}
    >
      <div
        id={id}
        class={dialogClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id}-title` : undefined}
        aria-describedby={description ? `${id}-description` : undefined}
        onClick={(e) => e.stopPropagation()}
        {...rest}
      >
        {(title || closeable) && (
          <div class="qore-dialog-header">
            {title && (
              <h2 id={`${id}-title`} class="qore-dialog-title">
                {title}
              </h2>
            )}
            
            {closeable && (
              <button
                class="qore-dialog-close"
                onClick={handleClose}
                aria-label="Close dialog"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}
        
        {(description || children) && (
          <div class="qore-dialog-content">
            {description && (
              <p id={`${id}-description`} class="qore-dialog-description">
                {description}
              </p>
            )}
            {children}
          </div>
        )}
        
        {footer && (
          <div class="qore-dialog-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export type { DialogProps }
