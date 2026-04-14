# Qore 🚀

**The Core of AI Era UI**

AI-Native Frontend Framework - Technical Prototype

---

## 🎯 Goals

- **Performance**: 50%+ faster than React/Vue
- **Streaming**: Native AI streaming support
- **Simplicity**: Hello World < 10 lines
- **Feasibility**: Manageable complexity

---

## 🚀 Quick Start

```bash
pnpm install
pnpm build
pnpm test
pnpm bench
```

---

## ⚡ Core API

```typescript
import { signal, computed, effect, h, Renderer } from '@qore/core';

// Reactive
const count = signal(0);
const doubled = computed(() => count.get() * 2);
effect(() => console.log(count.get()));

// Component
const Counter = () => h('div', null, [
  h('h1', null, [`Count: ${count.get()}`]),
  h('button', { onClick: () => count.update(v => v + 1) }, '+')
]);

// Render
new Renderer(document.getElementById('app')).render(Counter());
```

---

## 📊 Benchmarks

```
📊 Signal Operations:     1000 signals = 0.62ms
📊 Effect Tracking:       100 effects = 11.85ms
📊 VNode Creation:        1000 nodes = 0.77ms
```

---

## 👥 Team

- **十万伏特** - Tech Lead
- **博士** - AI Features
- **老六** - Testing
- **盖娅** - Documentation
- **乔布斯** - Competitive Analysis

---

## 📅 Timeline

- **Week 1-2**: ✅ Core Engine POC (COMPLETED)
- **Week 3**: Streaming Renderer
- **Week 4**: Performance Testing

---

## 📁 Structure

```
qore/
├── packages/core/      # Core engine
├── benchmarks/         # Performance tests
├── examples/           # Examples
└── docs/               # Documentation
```

---

**Qore** - The Core of AI Era UI

License: MIT
