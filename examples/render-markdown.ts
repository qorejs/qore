// Escape user content before injecting any HTML into the demo output.
const escapeHtml = (value = ''): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
// Apply lightweight highlighting to the demo snippets without adding a heavy dependency.
const highlight = (code: string): string => escapeHtml(code)
  .replace(/\b(const|return|stream|text|signal|await|yield)\b/g, '<span class="kw">$1</span>');
// Render a deliberately small Markdown subset that stays safe for the showcase.
export const renderMarkdown = (value = ''): string => {
  const blocks: string[] = [];
  return escapeHtml(value)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang = 'txt', code) => `@@CODE${blocks.push(`<pre class="code"><div class="lang">${lang}</div><code>${highlight(code)}</code></pre>`) - 1}@@`)
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    .split(/\n{2,}/)
    .map((block) => /^@@CODE\d+@@$/.test(block) || /^<h3>/.test(block) ? block : `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('')
    .replace(/@@CODE(\d+)@@/g, (_, index) => blocks[Number(index)] ?? '');
};
