import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectProviderMetadata,
  extractAnthropicMetadata,
  extractDeepSeekMetadata,
  extractOllamaMetadata,
  extractOpenAIMetadata,
  extractOpenRouterMetadata,
  mergeProviderMetadata
} from '../src/index.js';

test('mergeProviderMetadata keeps provider identity and merges partial usage updates', () => {
  const metadata = mergeProviderMetadata({
    provider: 'OpenAI',
    responseId: 'resp_1',
    usage: {
      inputTokens: 10
    }
  }, {
    finishReason: 'stop',
    usage: {
      outputTokens: 5
    }
  });

  assert.deepEqual(metadata, {
    provider: 'OpenAI',
    responseId: 'resp_1',
    finishReason: 'stop',
    usage: {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15
    }
  });
});

test('collectProviderMetadata normalizes OpenAI response metadata', async () => {
  const metadata = await collectProviderMetadata('OpenAI', [
    { type: 'response.created', response: { id: 'resp_1', model: 'gpt-5' } },
    {
      type: 'response.completed',
      response: {
        id: 'resp_1',
        model: 'gpt-5',
        status: 'completed',
        usage: {
          input_tokens: 12,
          output_tokens: 8,
          total_tokens: 20
        }
      }
    }
  ], extractOpenAIMetadata);

  assert.deepEqual(metadata, {
    provider: 'OpenAI',
    responseId: 'resp_1',
    model: 'gpt-5',
    finishReason: 'completed',
    usage: {
      inputTokens: 12,
      outputTokens: 8,
      totalTokens: 20
    }
  });
});

test('extractOpenRouterMetadata and extractDeepSeekMetadata normalize chat completion metadata', () => {
  const event = {
    id: 'chat_1',
    model: 'openai/gpt-4.1-mini',
    choices: [{ finish_reason: 'stop', delta: {} }],
    usage: {
      prompt_tokens: 9,
      completion_tokens: 4,
      total_tokens: 13
    }
  };

  assert.deepEqual(extractOpenRouterMetadata(event), {
    responseId: 'chat_1',
    model: 'openai/gpt-4.1-mini',
    finishReason: 'stop',
    usage: {
      inputTokens: 9,
      outputTokens: 4,
      totalTokens: 13
    }
  });
  assert.deepEqual(extractDeepSeekMetadata(event), {
    responseId: 'chat_1',
    model: 'openai/gpt-4.1-mini',
    finishReason: 'stop',
    usage: {
      inputTokens: 9,
      outputTokens: 4,
      totalTokens: 13
    }
  });
});

test('collectProviderMetadata merges Anthropic message lifecycle usage and stop reasons', async () => {
  const metadata = await collectProviderMetadata('Anthropic', [
    {
      type: 'message_start',
      message: {
        id: 'msg_1',
        model: 'claude-sonnet-4-20250514',
        usage: {
          input_tokens: 18
        }
      }
    },
    {
      type: 'message_delta',
      delta: {
        stop_reason: 'end_turn'
      },
      usage: {
        output_tokens: 7
      }
    }
  ], extractAnthropicMetadata);

  assert.deepEqual(metadata, {
    provider: 'Anthropic',
    responseId: 'msg_1',
    model: 'claude-sonnet-4-20250514',
    finishReason: 'end_turn',
    stopReason: 'end_turn',
    usage: {
      inputTokens: 18,
      outputTokens: 7,
      totalTokens: 25
    }
  });
});

test('extractOllamaMetadata normalizes local model usage counters', () => {
  assert.deepEqual(extractOllamaMetadata({
    model: 'qwen3:4b',
    done: true,
    done_reason: 'stop',
    prompt_eval_count: 22,
    eval_count: 11
  }), {
    model: 'qwen3:4b',
    finishReason: 'stop',
    stopReason: 'stop',
    usage: {
      inputTokens: 22,
      outputTokens: 11,
      totalTokens: 33
    }
  });
});
