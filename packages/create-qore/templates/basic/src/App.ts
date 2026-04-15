import { signal, h } from '@qorejs/qore'

export function App() {
  const count = signal(0)
  
  const increment = () => {
    count(count() + 1)
  }
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#0070f3' }}>Welcome to Qore</h1>
      <p style={{ margin: '1rem 0' }}>
        A lightweight, AI-native frontend framework
      </p>
      
      <div style={{ margin: '2rem 0' }}>
        <button
          onClick={increment}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1.2rem',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Count: {count()}
        </button>
      </div>
      
      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Edit <code>src/App.ts</code> to get started
      </p>
    </div>
  )
}
