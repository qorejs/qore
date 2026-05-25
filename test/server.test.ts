import test from 'node:test';
import assert from 'node:assert/strict';

import { createSSEResponse } from '../src/index.js';

async function readResponseText(response: Response): Promise<string> {
  return new TextDecoder().decode(await response.arrayBuffer());
}

test('createSSEResponse serializes plain chunk streams into SSE frames', async () => {
  const response = createSSEResponse(['hello', ' world']);
  const body = await readResponseText(response);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  assert.match(body, /data: hello\n\n/);
  assert.match(body, /data:  world\n\n/);
  assert.match(body, /data: \[DONE\]\n\n$/);
});

test('createSSEResponse supports structured frame encoding', async () => {
  const response = createSSEResponse([{ id: 'evt_1', text: 'Qore' }], {
    encode(chunk) {
      return {
        event: 'token',
        id: chunk.id,
        retry: 1000,
        data: chunk.text
      };
    },
    headers: {
      'x-qore-test': 'server'
    }
  });
  const body = await readResponseText(response);

  assert.equal(response.headers.get('x-qore-test'), 'server');
  assert.match(body, /event: token\nid: evt_1\nretry: 1000\ndata: Qore\n\n/);
});

test('createSSEResponse can surface stream errors as terminal SSE frames', async () => {
  const response = createSSEResponse((async function* broken() {
    yield 'hello';
    throw new Error('boom');
  })());
  const body = await readResponseText(response);

  assert.match(body, /data: hello\n\n/);
  assert.match(body, /event: error\ndata: boom\n\n/);
  assert.doesNotMatch(body, /data: \[DONE\]\n\n$/);
});
