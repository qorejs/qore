import { type ComponentChildren, type JSX, signal, effect } from '@qore/core'

export interface Tab {
  id: string
  label: ComponentChildren
  disabled?: boolean
  icon?: ComponentChildren
}

export interface TabsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Tabs list */
  tabs: Tab[]
  
  /** Active tab (controlled) */
  activeTab?: string
  
  /** Default active tab (uncontrolled) */
  defaultTab?: string
  
  /** onTabChange handler */
  onTabChange?: (tabId: string) => void
  
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  
  /** Children (tab panels) */
  children?: ComponentChildren
}

export interface TabPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Tab ID this panel belongs to */
  tabId: string
  
  /** Children */
  children?: ComponentChildren
}

/**
 * Tabs Component
 * 
 * A headless, accessible tabs component.
 * Supports both controlled and uncontrolled modes.
 * 
 * @example
 * ```tsx
 * // Basic
 * const tabs = [
 *   { id: 'tab1', label: 'Tab 1' },
 *   { id: 'tab2', label: 'Tab 2' },
 *   { id: 'tab3', label: 'Tab 3' },
 * ]
 * 
 * <Tabs tabs={tabs}>
 *   <TabPanel tabId="tab1">Content 1</TabPanel>
 *   <TabPanel tabId="tab2">Content 2</TabPanel>
 *   <TabPanel tabId="tab3">Content 3</TabPanel>
 * </Tabs>
 * 
 * // Controlled
 * const [activeTab, setActiveTab] = signal('tab1')
 * <Tabs tabs={tabs} activeTab={activeTab()} onTabChange={setActiveTab} />
 * 
 * // Vertical
 * <Tabs tabs={tabs} orientation="vertical" />
 * ```
 */
export function Tabs(props: TabsProps) {
  const {
    tabs,
    activeTab: controlledActiveTab,
    defaultTab,
    onTabChange,
    orientation = 'horizontal',
    size = 'md',
    children,
    class: className = '',
    id,
    ...rest
  } = props
  
  // Internal state for uncontrolled mode
  const internalActiveTab = signal(defaultTab ?? tabs[0]?.id)
  
  // Determine if controlled or uncontrolled
  const isControlled = controlledActiveTab !== undefined
  
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab()
  
  const setActiveTab = (tabId: string) => {
    if (!isControlled) {
      internalActiveTab(tabId)
    }
    onTabChange?.(tabId)
  }
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab)
    
    if (orientation === 'horizontal') {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % tabs.length
        setActiveTab(tabs[nextIndex].id)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
        setActiveTab(tabs[prevIndex].id)
      }
    } else {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % tabs.length
        setActiveTab(tabs[nextIndex].id)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
        setActiveTab(tabs[prevIndex].id)
      }
    }
  }
  
  // Build class names
  const tabsClasses = [
    'qore-tabs',
    `qore-tabs-${orientation}`,
    `qore-tabs-${size}`,
    className,
  ].filter(Boolean).join(' ')
  
  return (
    <div 
      id={id}
      class={tabsClasses}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {/* Tab List */}
      <div class="qore-tab-list">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const tabId = `${id}-tab-${tab.id}`
          const panelId = `${id}-panel-${tab.id}`
          
          return (
            <button
              key={tab.id}
              id={tabId}
              class={`qore-tab ${isActive ? 'qore-tab-active' : ''} ${tab.disabled ? 'qore-tab-disabled' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              aria-disabled={tab.disabled}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              tabIndex={isActive ? 0 : -1}
            >
              {tab.icon && (
                <span class="qore-tab-icon">{tab.icon}</span>
              )}
              <span class="qore-tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
      
      {/* Tab Panels */}
      <div class="qore-tab-panels">
        {children}
      </div>
    </div>
  )
}

/**
 * TabPanel Component
 */
export function TabPanel(props: TabPanelProps) {
  const {
    tabId,
    children,
    class: className = '',
    id,
    ...rest
  } = props
  
  // Find parent tabs component to get active tab
  // This is a simplified implementation - in a real scenario,
  // we'd use context to communicate with the parent Tabs
  const isActive = true // Would be determined by context
  
  const panelId = id ?? `panel-${tabId}`
  const tabPanelId = `tab-${tabId}`
  
  return (
    <div
      id={panelId}
      class={`qore-tab-panel ${className}`}
      role="tabpanel"
      aria-labelledby={tabPanelId}
      hidden={!isActive}
      {...rest}
    >
      {children}
    </div>
  )
}

export type { TabsProps, TabPanelProps, Tab }
