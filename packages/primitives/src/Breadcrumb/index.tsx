import { type ComponentChildren, type JSX } from '@qorejs/qore'

export interface BreadcrumbItem {
  id: string
  label: ComponentChildren
  href?: string
  icon?: ComponentChildren
  disabled?: boolean
  onClick?: (item: BreadcrumbItem) => void
}

export interface BreadcrumbProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Breadcrumb items */
  items: BreadcrumbItem[]
  
  /** Separator */
  separator?: ComponentChildren
  
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Show home icon */
  showHome?: boolean
  
  /** Home icon */
  homeIcon?: ComponentChildren
  
  /** Home link href */
  homeHref?: string
  
  /** Children (for custom rendering) */
  children?: ComponentChildren
}

/**
 * Breadcrumb Component
 * 
 * Displays the navigation path to the current page.
 * Supports custom separators, icons, and click handlers.
 * 
 * @example
 * ```tsx
 * // Basic Breadcrumb
 * const items = [
 *   { id: 'home', label: 'Home', href: '/' },
 *   { id: 'products', label: 'Products', href: '/products' },
 *   { id: 'details', label: 'Product Details', href: '/products/123' },
 * ]
 * 
 * <Breadcrumb items={items} />
 * 
 * // Custom Separator
 * <Breadcrumb items={items} separator=">" />
 * 
 * // With Home Icon
 * <Breadcrumb items={items} showHome homeHref="/" />
 * ```
 */
export function Breadcrumb(props: BreadcrumbProps) {
  const {
    items,
    separator = '/',
    size = 'md',
    showHome = false,
    homeIcon = '🏠',
    homeHref = '/',
    children,
    class: className = '',
    id,
    ...rest
  } = props
  
  // Build class names
  const breadcrumbClasses = [
    'qore-breadcrumb',
    `qore-breadcrumb-${size}`,
    className,
  ].filter(Boolean).join(' ')
  
  const separatorClasses = [
    'qore-breadcrumb-separator',
    `qore-breadcrumb-separator-${size}`,
  ].filter(Boolean).join(' ')
  
  return (
    <nav 
      id={id}
      class={breadcrumbClasses}
      aria-label="Breadcrumb"
      {...rest}
    >
      <ol class="qore-breadcrumb-list">
        {showHome && (
          <li class="qore-breadcrumb-item qore-breadcrumb-home">
            <a 
              href={homeHref}
              class="qore-breadcrumb-link qore-breadcrumb-home-link"
              aria-label="Home"
            >
              {homeIcon}
            </a>
          </li>
        )}
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const itemId = `${id}-item-${item.id}`
          
          return (
            <>
              {index > 0 && (
                <li 
                  class={separatorClasses}
                  aria-hidden="true"
                >
                  {separator}
                </li>
              )}
              <li 
                key={item.id}
                class={`qore-breadcrumb-item ${isLast ? 'qore-breadcrumb-item-current' : ''} ${item.disabled ? 'qore-breadcrumb-item-disabled' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.href && !isLast ? (
                  <a
                    id={itemId}
                    href={item.href}
                    class="qore-breadcrumb-link"
                    onClick={(e) => {
                      if (item.disabled) {
                        e.preventDefault()
                      } else {
                        item.onClick?.(item)
                      }
                    }}
                    aria-disabled={item.disabled}
                    tabIndex={item.disabled ? -1 : 0}
                  >
                    {item.icon && (
                      <span class="qore-breadcrumb-icon">{item.icon}</span>
                    )}
                    <span class="qore-breadcrumb-label">{item.label}</span>
                  </a>
                ) : (
                  <span
                    id={itemId}
                    class="qore-breadcrumb-current"
                    aria-current="page"
                  >
                    {item.icon && (
                      <span class="qore-breadcrumb-icon">{item.icon}</span>
                    )}
                    <span class="qore-breadcrumb-label">{item.label}</span>
                  </span>
                )}
              </li>
            </>
          )
        })}
        
        {children}
      </ol>
    </nav>
  )
}

export type { BreadcrumbProps, BreadcrumbItem }
