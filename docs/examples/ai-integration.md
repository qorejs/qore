# AI 集成示例

```ts
import { component, signal, effect } from 'qore'
import { ai } from 'qore/ai'

const AIAssistant = component(() => {
  const prompt = signal('')
  const response = signal('')
  const loading = signal(false)
  
  const askAI = async () => {
    loading.set(true)
    try {
      const result = await ai.generate(prompt())
      response.set(result)
    } finally {
      loading.set(false)
    }
  }
  
  return () => `
    <div style="max-width: 600px; margin: 2rem auto;">
      <h1>AI Assistant</h1>
      <textarea 
        value="${prompt()}"
        oninput="${e => prompt.set(e.target.value)}"
        placeholder="Ask AI..."
        rows="4"
      />
      <button 
        onclick="${askAI}" 
        disabled="${loading()}"
      >
        ${loading() ? 'Thinking...' : 'Ask'}
      </button>
      ${response() ? `<div class="response">${response()}</div>` : ''}
    </div>
  `
})

export default AIAssistant
```
