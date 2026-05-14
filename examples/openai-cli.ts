import { createOpenAI, stream } from '../src/index.js';

// Keep the first real-provider example tiny: stream tokens to stdout from one prompt.
const prompt = process.argv.slice(2).join(' ').trim() || 'Why should stream be signal?';
const openai = createOpenAI({
  ...(process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : {}),
  model: process.env.OPENAI_MODEL || 'gpt-5'
});
const answer = stream(openai.chat(prompt));

for await (const chunk of answer) {
  process.stdout.write(chunk);
}

process.stdout.write('\n');
