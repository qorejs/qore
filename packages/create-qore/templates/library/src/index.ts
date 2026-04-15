/**
 * Qore Component Library
 * 
 * Start building your components here.
 */

import { h, type ComponentChildren } from '@qorejs/qore'

export interface MyComponentProps {
  title?: string
  children?: ComponentChildren
}

export function MyComponent(props: MyComponentProps) {
  const { title = 'My Component', children } = props
  
  return (
    <div style={{ padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
      {children}
    </div>
  )
}

// Export your components
export { MyComponent }
