import { type ComponentChildren, type JSX } from '@qorejs/qore'

export interface GridProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Number of columns */
  columns?: number | string
  
  /** Gap between items */
  gap?: string | number
  
  /** Row gap */
  rowGap?: string | number
  
  /** Column gap */
  columnGap?: string | number
  
  /** Auto-fit minimum column width */
  autoFitMinWidth?: string
  
  /** Justify content */
  justifyContent?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  
  /** Align items */
  alignItems?: 'start' | 'end' | 'center' | 'stretch' | 'baseline'
  
  /** Align content */
  alignContent?: 'start' | 'end' | 'center' | 'stretch' | 'between' | 'around'
  
  /** Children */
  children?: ComponentChildren
}

/**
 * Grid Component
 * 
 * A flexible CSS Grid layout component.
 * Supports responsive columns, custom gaps, and alignment options.
 * 
 * @example
 * ```tsx
 * // Basic Grid
 * <Grid columns={3} gap="16px">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Grid>
 * 
 * // Auto-fit columns
 * <Grid autoFitMinWidth="200px" gap="16px">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Grid>
 * 
 * // Custom alignment
 * <Grid columns={3} justifyContent="center" alignItems="center">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Grid>
 * 
 * // Responsive with template
 * <Grid columns="repeat(auto-fit, minmax(250px, 1fr))" gap="20px">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Grid>
 * ```
 */
export function Grid(props: GridProps) {
  const {
    columns = 1,
    gap = '0',
    rowGap,
    columnGap,
    autoFitMinWidth,
    justifyContent = 'start',
    alignItems = 'stretch',
    alignContent = 'start',
    children,
    class: className = '',
    id,
    style,
    ...rest
  } = props
  
  // Build grid template columns
  let gridTemplateColumns: string
  if (autoFitMinWidth) {
    gridTemplateColumns = `repeat(auto-fit, minmax(${autoFitMinWidth}, 1fr))`
  } else if (typeof columns === 'number') {
    gridTemplateColumns = `repeat(${columns}, 1fr)`
  } else {
    gridTemplateColumns = columns
  }
  
  // Build gap styles
  const gapStyle: Record<string, string | number> = {}
  if (rowGap !== undefined || columnGap !== undefined) {
    if (rowGap !== undefined) {
      gapStyle.rowGap = typeof rowGap === 'number' ? `${rowGap}px` : rowGap
    }
    if (columnGap !== undefined) {
      gapStyle.columnGap = typeof columnGap === 'number' ? `${columnGap}px` : columnGap
    }
  } else {
    gapStyle.gap = typeof gap === 'number' ? `${gap}px` : gap
  }
  
  // Map justify content
  const justifyContentMap: Record<string, string> = {
    start: 'start',
    end: 'end',
    center: 'center',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  }
  
  // Map align items
  const alignItemsMap: Record<string, string> = {
    start: 'start',
    end: 'end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
  }
  
  // Map align content
  const alignContentMap: Record<string, string> = {
    start: 'start',
    end: 'end',
    center: 'center',
    stretch: 'stretch',
    between: 'space-between',
    around: 'space-around',
  }
  
  // Build class names
  const gridClasses = [
    'qore-grid',
    className,
  ].filter(Boolean).join(' ')
  
  // Build inline styles
  const gridStyle: Record<string, string | number> = {
    display: 'grid',
    gridTemplateColumns,
    justifyContent: justifyContentMap[justifyContent],
    alignItems: alignItemsMap[alignItems],
    alignContent: alignContentMap[alignContent],
    ...gapStyle,
    ...style,
  }
  
  return (
    <div
      id={id}
      class={gridClasses}
      style={gridStyle}
      {...rest}
    >
      {children}
    </div>
  )
}

/**
 * Grid Item Component
 * 
 * A grid item with span controls.
 */
export interface GridItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Column span */
  columnSpan?: number
  
  /** Row span */
  rowSpan?: number
  
  /** Column start */
  columnStart?: number
  
  /** Column end */
  columnEnd?: number
  
  /** Row start */
  rowStart?: number
  
  /** Row end */
  rowEnd?: number
  
  /** Children */
  children?: ComponentChildren
}

export function GridItem(props: GridItemProps) {
  const {
    columnSpan,
    rowSpan,
    columnStart,
    columnEnd,
    rowStart,
    rowEnd,
    children,
    class: className = '',
    id,
    style,
    ...rest
  } = props
  
  // Build grid styles
  const gridItemStyle: Record<string, string | number> = {
    ...style,
  }
  
  if (columnSpan !== undefined) {
    gridItemStyle.gridColumn = `span ${columnSpan}`
  }
  if (rowSpan !== undefined) {
    gridItemStyle.gridRow = `span ${rowSpan}`
  }
  if (columnStart !== undefined) {
    gridItemStyle.gridColumnStart = columnStart
  }
  if (columnEnd !== undefined) {
    gridItemStyle.gridColumnEnd = columnEnd
  }
  if (rowStart !== undefined) {
    gridItemStyle.gridRowStart = rowStart
  }
  if (rowEnd !== undefined) {
    gridItemStyle.gridRowEnd = rowEnd
  }
  
  // Build class names
  const gridItemClasses = [
    'qore-grid-item',
    className,
  ].filter(Boolean).join(' ')
  
  return (
    <div
      id={id}
      class={gridItemClasses}
      style={gridItemStyle}
      {...rest}
    >
      {children}
    </div>
  )
}

export type { GridProps, GridItemProps }
