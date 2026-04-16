import { type ComponentChildren, type JSX, signal, effect } from '@qorejs/qore'

export interface MenuItem {
  id: string
  label: ComponentChildren
  icon?: ComponentChildren
  disabled?: boolean
  divider?: boolean
  children?: MenuItem[]
  onClick?: (item: MenuItem) => void
  href?: string
  target?: string
}

export interface MenuProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Menu items */
  items: MenuItem[]
  
  /** Active item ID (controlled) */
  activeItem?: string
  
  /** Default active item ID (uncontrolled) */
  defaultActiveItem?: string
  
  /** onItemSelect handler */
  onItemSelect?: (item: MenuItem) => void
  
  /** Orientation */
  orientation?: 'vertical' | 'horizontal'
  
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Show icons */
  showIcons?: boolean
  
  /** Children (for custom rendering) */
  children?: ComponentChildren
}

/**
 * Menu Component
 * 
 * A flexible, accessible menu component for navigation and actions.
 * Supports nested menus, icons, dividers, and keyboard navigation.
 * 
 * @example
 * ```tsx
 * // Basic Menu
 * const items = [
 *   { id: 'home', label: 'Home', icon: <HomeIcon /> },
 *   { id: 'about', label: 'About', icon: <AboutIcon /> },
 *   { id: 'divider', label: '', divider: true },
 *   { id: 'contact', label: 'Contact', icon: <ContactIcon /> },
 * ]
 * 
 * <Menu items={items} />
 * 
 * // Horizontal Menu
 * <Menu items={items} orientation="horizontal" />
 * 
 * // Controlled
 * const [active, setActive] = signal('home')
 * <Menu items={items} activeItem={active()} onItemSelect={(item) => setActive(item.id)} />
 * ```
 */
export function Menu(props: MenuProps) {
  const {
    items,
    activeItem: controlledActiveItem,
    defaultActiveItem,
    onItemSelect,
    orientation = 'vertical',
    size = 'md',
    showIcons = true,
    children,
    class: className = '',
    id,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalActiveItem = signal(defaultActiveItem ?? items.find(item => !item.disabled && !item.divider)?.id)
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledActiveItem !== undefined
  
  const activeItem = isControlled ? controlledActiveItem : internalActiveItem()
  
  const setActiveItem = (itemId: string) => {
    if (!isControlled) {
      internalActiveItem(itemId)
    }
    const item = items.find(i => i.id === itemId)
    if (item && !item.disabled && !item.divider) {
      onItemSelect?.(item)
      item.onClick?.(item)
    }
  }
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const enabledItems = items.filter(item => !item.disabled && !item.divider)
    const currentIndex = enabledItems.findIndex(item => item.id === activeItem)
    
    if (orientation === 'vertical') {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % enabledItems.length
        setActiveItem(enabledItems[nextIndex].id)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
        setActiveItem(enabledItems[prevIndex].id)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const currentItem = enabledItems.find(item => item.id === activeItem)
        if (currentItem) {
          setActiveItem(currentItem.id)
        }
      }
    } else {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % enabledItems.length
        setActiveItem(enabledItems[nextIndex].id)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
        setActiveItem(enabledItems[prevIndex].id)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const currentItem = enabledItems.find(item => item.id === activeItem)
        if (currentItem) {
          setActiveItem(currentItem.id)
        }
      }
    }
  }
  
  // Build class names
  const menuClasses = [
    'qore-menu',
    `qore-menu-${orientation}`,
    `qore-menu-${size}`,
    className,
  ].filter(Boolean).join(' ')
  
  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.divider) {
      return <div key={item.id} class="qore-menu-divider" role="separator" />
    }
    
    const isActive = activeItem === item.id
    const itemId = `${id}-item-${item.id}`
    
    const itemContent = (
      <div
        key={item.id}
        id={itemId}
        class={`qore-menu-item ${isActive ? 'qore-menu-item-active' : ''} ${item.disabled ? 'qore-menu-item-disabled' : ''}`}
        role="menuitem"
        aria-selected={isActive}
        aria-disabled={item.disabled}
        onClick={() => !item.disabled && setActiveItem(item.id)}
        tabIndex={isActive ? 0 : -1}
        style={item.href ? { cursor: 'pointer' } : {}}
      >
        {showIcons && item.icon && (
          <span class="qore-menu-item-icon">{item.icon}</span>
        )}
        <span class="qore-menu-item-label">{item.label}</span>
        {item.children && item.children.length > 0 && (
          <span class="qore-menu-item-arrow">›</span>
        )}
      </div>
    )
    
    // If item has href, wrap in anchor
    if (item.href) {
      return (
        <a
          key={item.id}
          href={item.href}
          target={item.target}
          class={`qore-menu-item-link ${isActive ? 'qore-menu-item-active' : ''} ${item.disabled ? 'qore-menu-item-disabled' : ''}`}
          role="menuitem"
          aria-selected={isActive}
          aria-disabled={item.disabled}
          tabIndex={isActive ? 0 : -1}
          onClick={(e) => {
            if (item.disabled) {
              e.preventDefault()
            } else {
              setActiveItem(item.id)
            }
          }}
        >
          {itemContent}
        </a>
      )
    }
    
    return itemContent
  }
  
  return (
    <div 
      id={id}
      class={menuClasses}
      role="menu"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {items.map((item, index) => renderMenuItem(item, index))}
      {children}
    </div>
  )
}

export type { MenuProps, MenuItem }
