import { type ComponentChildren, type JSX, signal, effect, batch } from '@qorejs/qore'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastProviderProps {
  /** Position */
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center'
  
  /** Maximum visible toasts */
  maxToasts?: number
  
  /** Default duration */
  defaultDuration?: number
  
  /** Children */
  children?: ComponentChildren
}

export interface ToastContext {
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
  info: (message: string, title?: string) => string
  success: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
}

// Global toast store
const toasts = signal<Toast[]>([])
let toastIdCounter = 0

function generateToastId(): string {
  return `toast_${++toastIdCounter}_${Date.now()}`
}

/**
 * Toast Provider Component
 * 
 * Provides toast notification context to children.
 * 
 * @example
 * ```tsx
 * <ToastProvider position="top-right">
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider(props: ToastProviderProps) {
  const {
    position = 'top-right',
    maxToasts = 5,
    defaultDuration = 5000,
    children,
  } = props
  
  const positionClasses = {
    'top-right': 'qore-toast-top-right',
    'top-left': 'qore-toast-top-left',
    'top-center': 'qore-toast-top-center',
    'bottom-right': 'qore-toast-bottom-right',
    'bottom-left': 'qore-toast-bottom-left',
    'bottom-center': 'qore-toast-bottom-center',
  }
  
  return (
    <>
      {children}
      <div class={`qore-toast-container ${positionClasses[position]}`}>
        {toasts().map((toast) => (
          <ToastItem 
            key={toast.id}
            toast={toast}
            defaultDuration={defaultDuration}
          />
        ))}
      </div>
    </>
  )
}

function ToastItem(props: { toast: Toast; defaultDuration: number }) {
  const { toast, defaultDuration } = props
  
  const duration = toast.duration ?? defaultDuration
  
  // Auto-dismiss
  effect(() => {
    if (duration <= 0) return
    
    const timer = setTimeout(() => {
      removeToast(toast.id)
    }, duration)
    
    return () => clearTimeout(timer)
  })
  
  const typeClasses = {
    info: 'qore-toast-info',
    success: 'qore-toast-success',
    warning: 'qore-toast-warning',
    error: 'qore-toast-error',
  }
  
  const icons = {
    info: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="8" r="1" fill="currentColor"/>
      </svg>
    ),
    success: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="17" r="1" fill="currentColor"/>
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  }
  
  return (
    <div 
      class={`qore-toast ${typeClasses[toast.type]}`}
      role="alert"
      aria-live="polite"
    >
      <span class="qore-toast-icon">{icons[toast.type]}</span>
      
      <div class="qore-toast-content">
        {toast.title && (
          <div class="qore-toast-title">{toast.title}</div>
        )}
        <div class="qore-toast-message">{toast.message}</div>
      </div>
      
      {toast.action && (
        <button 
          class="qore-toast-action"
          onClick={toast.action.onClick}
        >
          {toast.action.label}
        </button>
      )}
      
      <button 
        class="qore-toast-close"
        onClick={() => removeToast(toast.id)}
        aria-label="Close toast"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

/**
 * Add a toast
 */
export function addToast(toast: Omit<Toast, 'id'>): string {
  const id = generateToastId()
  const newToast: Toast = { ...toast, id }
  
  batch(() => {
    toasts([...toasts(), newToast])
  })
  
  return id
}

/**
 * Remove a toast
 */
export function removeToast(id: string): void {
  batch(() => {
    toasts(toasts().filter((t) => t.id !== id))
  })
}

/**
 * Clear all toasts
 */
export function clearToasts(): void {
  batch(() => {
    toasts([])
  })
}

/**
 * Show info toast
 */
export function info(message: string, title?: string): string {
  return addToast({ type: 'info', message, title })
}

/**
 * Show success toast
 */
export function success(message: string, title?: string): string {
  return addToast({ type: 'success', message, title })
}

/**
 * Show warning toast
 */
export function warning(message: string, title?: string): string {
  return addToast({ type: 'warning', message, title })
}

/**
 * Show error toast
 */
export function error(message: string, title?: string): string {
  return addToast({ type: 'error', message, title })
}

export type { ToastProps }

interface ToastProps extends JSX.HTMLAttributes<HTMLDivElement> {
  toast: Toast
  defaultDuration?: number
}
