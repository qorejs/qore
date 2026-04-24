const escapeHtml = (value = '') => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const highlight = (code) => escapeHtml(code).replace(/\b(const|return|stream|text|signal|await|yield)\b/g, '<span class="kw">$1</span>');
export const renderMarkdown = (value = '') => {
  const blocks = [];
  return escapeHtml(value)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang = 'txt', code) => `@@CODE${blocks.push(`<pre class="code"><div class="lang">${lang}</div><code>${highlight(code)}</code></pre>`) - 1}@@`)
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    .split(/\n{2,}/)
    .map((block) => /^@@CODE\d+@@$/.test(block) || /^<h3>/.test(block) ? block : `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('')
    .replace(/@@CODE(\d+)@@/g, (_, index) => blocks[Number(index)]);
};
