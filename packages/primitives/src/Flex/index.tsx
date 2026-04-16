import { type ComponentChildren, type JSX } from '@qorejs/qore'

export interface FlexProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Flex direction */
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse'
  
  /** Wrap behavior */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  
  /** Justify content */
  justifyContent?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly' | 'stretch'
  
  /** Align items */
  alignItems?: 'start' | 'end' | 'center' | 'stretch' | 'baseline'
  
  /** Align content */
  alignContent?: 'start' | 'end' | 'center' | 'stretch' | 'between' | 'around'
  
  /** Gap between items */
  gap?: string | number
  
  /** Children */
  children?: ComponentChildren
  
  /** Flex grow for direct children */
  childGrow?: number
  
  /** Flex shrink for direct children */
  childShrink?: number
  
  /** Flex basis for direct children */
  childBasis?: string
}

/**
 * Flex Component
 * 
 * A flexible CSS Flexbox layout component.
 * Supports all flexbox properties with a simple API.
 * 
 * @example
 * ```tsx
 * // Basic Flex Row
 * <Flex gap="16px">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Flex>
 * 
 * // Flex Column
 * <Flex direction="column" gap="16px">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Flex>
 * 
 * // Centered content
 * <Flex justifyContent="center" alignItems="center" gap="16px">
 *   <div>Centered Item</div>
 * </Flex>
 * 
 * // Space between
 * <Flex justifyContent="between" alignItems="center">
 *   <div>Left</div>
 *   <div>Right</div>
 * </Flex>
 * 
 * // With wrapping
 * <Flex wrap="wrap" gap="16px">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Flex>
 * ```
 */
export function Flex(props: FlexProps) {
  const {
    direction = 'row',
    wrap = 'nowrap',
    justifyContent = 'start',
    alignItems = 'stretch',
    alignContent = 'stretch',
    gap = '0',
    childGrow,
    childShrink,
    childBasis,
    children,
    class: className = '',
    id,
    style,
    ...rest
  } = props
  
  // Map direction
  const directionMap: Record<string, string> = {
    row: 'row',
    'row-reverse': 'row-reverse',
    column: 'column',
    'column-reverse': 'column-reverse',
  }
  
  // Map wrap
  const wrapMap: Record<string, string> = {
    nowrap: 'nowrap',
    wrap: 'wrap',
    'wrap-reverse': 'wrap-reverse',
  }
  
  // Map justify content
  const justifyContentMap: Record<string, string> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
    stretch: 'stretch',
  }
  
  // Map align items
  const alignItemsMap: Record<string, string> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
  }
  
  // Map align content
  const alignContentMap: Record<string, string> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
    between: 'space-between',
    around: 'space-around',
  }
  
  // Build class names
  const flexClasses = [
    'qore-flex',
    `qore-flex-${direction}`,
    className,
  ].filter(Boolean).join(' ')
  
  // Build inline styles
  const flexStyle: Record<string, string | number> = {
    display: 'flex',
    flexDirection: directionMap[direction],
    flexWrap: wrapMap[wrap],
    justifyContent: justifyContentMap[justifyContent],
    alignItems: alignItemsMap[alignItems],
    alignContent: alignContentMap[alignContent],
    gap: typeof gap === 'number' ? `${gap}px` : gap,
    ...style,
  }
  
  // Process children with flex props if specified
  let processedChildren = children
  if (childGrow !== undefined || childShrink !== undefined || childBasis !== undefined) {
    const flexValue = `${childGrow ?? 1} ${childShrink ?? 1} ${childBasis ?? 'auto'}`
    processedChildren = children
  }
  
  return (
    <div
      id={id}
      class={flexClasses}
      style={flexStyle}
      {...rest}
    >
      {processedChildren}
    </div>
  )
}

/**
 * Flex Item Component
 * 
 * A flex item with individual flex controls.
 */
export interface FlexItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Flex grow */
  grow?: number
  
  /** Flex shrink */
  shrink?: number
  
  /** Flex basis */
  basis?: string
  
  /** Order */
  order?: number
  
  /** Align self */
  alignSelf?: 'auto' | 'start' | 'end' | 'center' | 'stretch' | 'baseline'
  
  /** Children */
  children?: ComponentChildren
}

export function FlexItem(props: FlexItemProps) {
  const {
    grow = 0,
    shrink = 1,
    basis = 'auto',
    order,
    alignSelf,
    children,
    class: className = '',
    id,
    style,
    ...rest
  } = props
  
  // Map align self
  const alignSelfMap: Record<string, string> = {
    auto: 'auto',
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
  }
  
  // Build flex style
  const flexStyle: Record<string, string | number> = {
    flex: `${grow} ${shrink} ${basis}`,
    ...style,
  }
  
  if (order !== undefined) {
    flexStyle.order = order
  }
  
  if (alignSelf !== undefined) {
    flexStyle.alignSelf = alignSelfMap[alignSelf]
  }
  
  // Build class names
  const flexItemClasses = [
    'qore-flex-item',
    className,
  ].filter(Boolean).join(' ')
  
  return (
    <div
      id={id}
      class={flexItemClasses}
      style={flexStyle}
      {...rest}
    >
      {children}
    </div>
  )
}

export type { FlexProps, FlexItemProps }
