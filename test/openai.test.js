// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAI } from '../src/openai.js';
const encoder = new TextEncoder();
// Turn event payloads into a tiny text/event-stream body for adapter tests.
function createSSEBody(events) {
    return new ReadableStream({
        start(controller) {
            for (const event of events) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        }
    });
}
test('createOpenAI chat streams text deltas from the Responses API', async () => {
    const calls = [];
    const openai = createOpenAI({
        apiKey: 'test-key',
        fetch: async (url, init) => {
            calls.push({
                url,
                method: init.method,
                headers: init.headers,
                body: JSON.parse(init.body)
            });
            return new Response(createSSEBody([
                { type: 'response.created', response: { id: 'resp_1' } },
                { type: 'response.output_text.delta', delta: 'Hello' },
                { type: 'response.output_text.delta', delta: ' Qore' },
                { type: 'response.completed', response: { id: 'resp_1' } }
            ]), {
                status: 200,
                headers: {
                    'content-type': 'text/event-stream'
                }
            });
        }
    });
    const chunks = [];
    for await (const chunk of openai.chat('Why stream should be signal?', {
        model: 'gpt-5',
        instructions: 'Keep it short.'
    })) {
        chunks.push(chunk);
    }
    assert.deepEqual(chunks, ['Hello', ' Qore']);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].headers.Authorization, 'Bearer test-key');
    assert.equal(calls[0].body.model, 'gpt-5');
    assert.equal(calls[0].body.stream, true);
    assert.equal(calls[0].body.instructions, 'Keep it short.');
    assert.deepEqual(calls[0].body.input, [{ role: 'user', content: 'Why stream should be signal?' }]);
});
test('createOpenAI responses.stream yields typed events', async () => {
    const openai = createOpenAI({
        apiKey: 'test-key',
        fetch: async () => new Response(createSSEBody([
            { type: 'response.created', response: { id: 'resp_2' } },
            { type: 'response.output_text.delta', delta: 'A' },
            { type: 'response.completed', response: { id: 'resp_2' } }
        ]), {
            status: 200,
            headers: {
                'content-type': 'text/event-stream'
            }
        })
    });
    const seen = [];
    for await (const event of openai.responses.stream({ input: 'hello' })) {
        seen.push(event.type);
    }
    assert.deepEqual(seen, ['response.created', 'response.output_text.delta', 'response.completed']);
});
test('createOpenAI surfaces provider HTTP errors clearly', async () => {
    const openai = createOpenAI({
        apiKey: 'bad-key',
        fetch: async () => new Response(JSON.stringify({
            error: {
                message: 'Invalid API key'
            }
        }), {
            status: 401,
            headers: {
                'content-type': 'application/json'
            }
        })
    });
    const iterator = openai.chat('hello')[Symbol.asyncIterator]();
    await assert.rejects(() => iterator.next(), /Invalid API key/);
});
test('createOpenAI does not assume process exists when API keys are missing', () => {
    const originalProcess = globalThis.process;
    try {
        globalThis.process = undefined;
        assert.throws(() => createOpenAI({ fetch: async () => new Response(null) }), /requires an API key/);
    }
    finally {
        globalThis.process = originalProcess;
    }
});
