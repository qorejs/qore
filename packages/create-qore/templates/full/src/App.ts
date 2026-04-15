import { signal, h } from '@qore/core'
import { Button, Input, Tabs, TabPanel, success, error } from '@qore/primitives'

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
]

export function App() {
  const [name, setName] = signal('')
  const [count, setCount] = signal(0)
  
  const handleGreet = () => {
    if (!name()) {
      error('Please enter your name')
      return
    }
    success(`Hello, ${name()}!`)
  }
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#0070f3', marginBottom: '0.5rem' }}>
          Welcome to Qore
        </h1>
        <p style={{ color: '#666' }}>
          Full-featured app with components and devtools
        </p>
      </header>
      
      <Tabs tabs={tabs}>
        <TabPanel tabId="home">
          <div style={{ padding: '1rem 0' }}>
            <h2>Get Started</h2>
            <p style={{ margin: '1rem 0' }}>
              Try out the interactive components below:
            </p>
            
            <div style={{ marginTop: '2rem' }}>
              <Input
                label="Your Name"
                placeholder="Enter your name"
                value={name()}
                onChange={setName}
                helperText="We'll use this to greet you"
              />
              
              <Button 
                variant="primary" 
                size="md"
                onClick={handleGreet}
                style={{ marginTop: '1rem' }}
              >
                Say Hello
              </Button>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <h3>Counter Example</h3>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Button 
                  variant="secondary"
                  onClick={() => setCount(count() - 1)}
                >
                  -
                </Button>
                <span style={{ fontSize: '1.5rem', minWidth: '3rem', textAlign: 'center' }}>
                  {count()}
                </span>
                <Button 
                  variant="primary"
                  onClick={() => setCount(count() + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </TabPanel>
        
        <TabPanel tabId="about">
          <div style={{ padding: '1rem 0' }}>
            <h2>About Qore</h2>
            <p style={{ margin: '1rem 0' }}>
              Qore is a lightweight, AI-native frontend framework designed for 
              the next generation of web applications.
            </p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '1rem' }}>
              <li>🚀 Ultra-lightweight (&lt;3kb gzip)</li>
              <li>⚡ Signal-based reactivity</li>
              <li>🎨 Component primitives</li>
              <li>🔧 Developer tools</li>
              <li>📱 Mobile-first design</li>
            </ul>
          </div>
        </TabPanel>
        
        <TabPanel tabId="settings">
          <div style={{ padding: '1rem 0' }}>
            <h2>Settings</h2>
            <p style={{ margin: '1rem 0' }}>
              Configure your app settings here.
            </p>
          </div>
        </TabPanel>
      </Tabs>
      
      <footer style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e0e0e0' }}>
        <p style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
          Built with Qore Framework v0.6.0
        </p>
      </footer>
    </div>
  )
}
