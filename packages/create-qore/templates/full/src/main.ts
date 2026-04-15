import { createApp, h } from '@qore/core'
import { enableDevtools } from '@qore/devtools'
import { ToastProvider } from '@qore/primitives'
import { App } from './App'

// Create app
const app = createApp({
  root: document.getElementById('app')!,
})

// Enable devtools in development
if (import.meta.env.DEV) {
  enableDevtools(app, {
    enableComponentTree: true,
    enableStateMonitoring: true,
    enablePerformance: true,
    enableTimeline: true,
  })
}

// Render with ToastProvider
app.render(() => (
  <ToastProvider position="top-right">
    <App />
  </ToastProvider>
))

console.log('🚀 Qore app is running!')
