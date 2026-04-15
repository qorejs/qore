import { createApp, h } from '@qorejs/qore'
import { App } from './App'

// Create app
const app = createApp({
  root: document.getElementById('app')!,
})

// Render
app.render(() => h(App))

console.log('🚀 Qore app is running!')
