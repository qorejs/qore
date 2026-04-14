import { signal, h, Renderer } from '@qore/core';

function Counter() {
  const count = signal(0);
  return h('div', { style: { textAlign: 'center' } }, [
    h('h1', null, ['🚀 Qore Framework']),
    h('p', null, ['Count: ', String(count.get())]),
    h('div', { style: { gap: '10px', display: 'flex', justifyContent: 'center' } }, [
      h('button', { onClick: () => count.update(v => v - 1) }, ['➖']),
      h('button', { onClick: () => count.update(v => v + 1) }, ['➕']),
    ])
  ]);
}

const app = document.getElementById('app');
if (app) {
  new Renderer(app).render(Counter());
  console.log('✅ Qore app rendered!');
}
