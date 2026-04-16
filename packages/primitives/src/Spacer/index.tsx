import { type JSX } from '@qorejs/qore'

export interface SpacerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Spacer size */
  size?: string | number
  
  /** Horizontal spacer */
  x?: string | number
  
  /** Vertical spacer */
  y?: string | number
  
  /** Grow to fill available space */
  grow?: boolean
  
  /** Spacer direction */
  direction?: 'horizontal' | 'vertical'
}

/**
 * Spacer Component
 * 
 * Adds flexible spacing between elements.
 * Supports fixed sizes, responsive sizes, and grow behavior.
 * 
 * @example
 * ```tsx
 * // Fixed size spacer
 * <Spacer size="16px" />
 * 
 * // Horizontal spacer
 * <Spacer x="20px" />
 * 
 * // Vertical spacer
 * <Spacer y="20px" />
 * 
 * // Grow to fill space
 * <Flex>
 *   <div>Left</div>
 *   <Spacer grow />
 *   <div>Right</div>
 * </Flex>
 * 
 * // Number size (converted to px)
 * <Spacer size={16} />
 * ```
 */
export function Spacer(props: SpacerProps) {
  const {
    size,
    x,
    y,
    grow = false,
    direction = 'horizontal',
    class: className = '',
    id,
    style,
    ...rest
  } = props
  
  // Build spacer styles
  const spacerStyle: Record<string, string | number> = {
    ...style,
  }
  
  // Handle grow behavior
  if (grow) {
    if (direction === 'horizontal') {
      spacerStyle.flex = '1 1 auto'
      spacerStyle.minWidth = '0'
    } else {
      spacerStyle.flex = '1 1 auto'
      spacerStyle.minHeight = '0'
    }
  }
  
  // Handle explicit sizes
  if (x !== undefined) {
    spacerStyle.width = typeof x === 'number' ? `${x}px` : x
  }
  
  if (y !== undefined) {
    spacerStyle.height = typeof y === 'number' ? `${y}px` : y
  }
  
  if (size !== undefined) {
    if (direction === 'horizontal') {
      spacerStyle.width = typeof size === 'number' ? `${size}px` : size
    } else {
      spacerStyle.height = typeof size === 'number' ? `${size}px` : size
    }
  }
  
  // Build class names
  const spacerClasses = [
    'qore-spacer',
    `qore-spacer-${direction}`,
    grow ? 'qore-spacer-grow' : '',
    className,
  ].filter(Boolean).join(' ')
  
  return (
    <div
      id={id}
      class={spacerClasses}
      style={spacerStyle}
      aria-hidden="true"
      {...rest}
    />
  )
}

export type { SpacerProps }
