import { type ComponentChildren, type JSX, signal, effect, createContext, useContext } from '@qorejs/qore'

export interface Tab {
  id: string
  label: ComponentChildren
  disabled?: boolean
  icon?: ComponentChildren
  closable?: boolean
  onClose?: (tabId: string) => void
}

export interface TabsContextValue {
  activeTab: string
  setActiveTab: (tabId: string) => void
  orientation: 'horizontal' | 'vertical'
  size: 'sm' | 'md' | 'lg'
  id: string
}

// Create Tabs context
const TabsContext = createContext<TabsContextValue | null>(null)

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
  
  /** Allow closing tabs */
  closable?: boolean
  
  /** Show add button */
  showAdd?: boolean
  
  /** onAdd handler */
  onAdd?: () => void
  
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
 * Supports both controlled and uncontrolled modes, keyboard navigation, and closable tabs.
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
 * // Vertical with closable tabs
 * <Tabs tabs={tabs} orientation="vertical" closable />
 * 
 * // With add button
 * <Tabs tabs={tabs} showAdd onAdd={() => console.log('Add tab')} />
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
    closable = false,
    showAdd = false,
    onAdd,
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
  
  // Handle tab close
  const handleTabClose = (e: Event, tab: Tab) => {
    e.stopPropagation()
    tab.onClose?.(tab.id)
    
    // If closing active tab, switch to another tab
    if (activeTab === tab.id) {
      const currentIndex = tabs.findIndex(t => t.id === tab.id)
      const nextTab = tabs[currentIndex + 1] || tabs[currentIndex - 1]
      if (nextTab) {
        setActiveTab(nextTab.id)
      }
    }
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
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveTab(tabs[0].id)
      } else if (e.key === 'End') {
        e.preventDefault()
        setActiveTab(tabs[tabs.length - 1].id)
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
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveTab(tabs[0].id)
      } else if (e.key === 'End') {
        e.preventDefault()
        setActiveTab(tabs[tabs.length - 1].id)
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
  
  // Create context value
  const contextValue: TabsContextValue = {
    activeTab,
    setActiveTab,
    orientation,
    size,
    id: id || '',
  }
  
  return (
    <TabsContext.Provider value={contextValue}>
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
              <div
                key={tab.id}
                class={`qore-tab-wrapper ${isActive ? 'qore-tab-wrapper-active' : ''}`}
                role="presentation"
              >
                <button
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
                  {(closable || tab.closable) && !tab.disabled && (
                    <button
                      class="qore-tab-close"
                      onClick={(e) => handleTabClose(e, tab)}
                      aria-label={`Close ${tab.label}`}
                      tabIndex={-1}
                    >
                      ×
                    </button>
                  )}
                </button>
              </div>
            )
          })}
          
          {/* Add button */}
          {showAdd && (
            <button
              class="qore-tab-add"
              onClick={onAdd}
              aria-label="Add tab"
            >
              +
            </button>
          )}
        </div>
        
        {/* Tab Panels */}
        <div class="qore-tab-panels">
          {children}
        </div>
      </div>
    </TabsContext.Provider>
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
  
  // Get context from parent Tabs
  const context = useContext(TabsContext)
  
  if (!context) {
    console.warn('TabPanel must be used within a Tabs component')
  }
  
  const isActive = context?.activeTab === tabId
  const panelId = id ?? `panel-${tabId}`
  const tabPanelId = context ? `${context.id}-tab-${tabId}` : `tab-${tabId}`
  
  return (
    <div
      id={panelId}
      class={`qore-tab-panel ${className} ${isActive ? 'qore-tab-panel-active' : ''}`}
      role="tabpanel"
      aria-labelledby={tabPanelId}
      hidden={!isActive}
      {...rest}
    >
      {isActive && children}
    </div>
  )
}

export type { TabsProps, TabPanelProps, Tab }
