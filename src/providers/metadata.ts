import type {
  AnthropicEvent,
  DeepSeekEvent,
  OpenAIEvent,
  OllamaEvent,
  OpenRouterEvent,
  ProviderMetadataUpdate,
  ProviderStreamMetadata,
  ProviderUsage
} from './types.js';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return readString(value);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toUsage(update: Partial<ProviderUsage> | undefined): ProviderUsage | undefined {
  if (!update) {
    return undefined;
  }

  const inputTokens = readNumber(update.inputTokens);
  const outputTokens = readNumber(update.outputTokens);
  const explicitTotal = readNumber(update.totalTokens);
  const totalTokens = explicitTotal ?? (
    inputTokens !== undefined && outputTokens !== undefined
      ? (inputTokens ?? 0) + (outputTokens ?? 0)
      : undefined
  );

  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return undefined;
  }

  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {})
  };
}

function usageFromOpenAIStyle(raw: unknown): ProviderUsage | undefined {
  const usage = readRecord(raw);

  if (!usage) {
    return undefined;
  }

  const inputTokens = readNumber(usage['input_tokens'] ?? usage['prompt_tokens']);
  const outputTokens = readNumber(usage['output_tokens'] ?? usage['completion_tokens']);
  const totalTokens = readNumber(usage['total_tokens']);

  return toUsage({
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {})
  });
}

function usageFromAnthropic(raw: unknown): ProviderUsage | undefined {
  const usage = readRecord(raw);

  if (!usage) {
    return undefined;
  }

  const inputTokens = readNumber(usage['input_tokens']);
  const outputTokens = readNumber(usage['output_tokens']);

  return toUsage({
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {})
  });
}

function usageFromOllama(event: OllamaEvent): ProviderUsage | undefined {
  const inputTokens = readNumber(event['prompt_eval_count']);
  const outputTokens = readNumber(event['eval_count']);

  return toUsage({
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {})
  });
}

function hasMetadata(update: ProviderMetadataUpdate): boolean {
  return update.responseId !== undefined
    || update.model !== undefined
    || update.finishReason !== undefined
    || update.stopReason !== undefined
    || update.usage !== undefined;
}

function buildMetadataUpdate(fields: {
  responseId: string | undefined;
  model: string | undefined;
  finishReason: string | null | undefined;
  stopReason: string | null | undefined;
  usage: ProviderUsage | undefined;
}): ProviderMetadataUpdate {
  return {
    ...(fields.responseId !== undefined ? { responseId: fields.responseId } : {}),
    ...(fields.model !== undefined ? { model: fields.model } : {}),
    ...(fields.finishReason !== undefined ? { finishReason: fields.finishReason } : {}),
    ...(fields.stopReason !== undefined ? { stopReason: fields.stopReason } : {}),
    ...(fields.usage !== undefined ? { usage: fields.usage } : {})
  };
}

export function mergeProviderMetadata(
  metadata: ProviderStreamMetadata,
  update: ProviderMetadataUpdate | null | undefined
): ProviderStreamMetadata {
  if (!update) {
    return metadata;
  }

  const hasUsageUpdate = update.usage !== undefined;
  const mergedInputTokens = update.usage?.inputTokens ?? metadata.usage?.inputTokens;
  const mergedOutputTokens = update.usage?.outputTokens ?? metadata.usage?.outputTokens;
  const mergedExplicitTotal = update.usage?.totalTokens ?? (
    hasUsageUpdate ? undefined : metadata.usage?.totalTokens
  );
  const mergedUsage = toUsage({
    ...(mergedInputTokens !== undefined ? { inputTokens: mergedInputTokens } : {}),
    ...(mergedOutputTokens !== undefined ? { outputTokens: mergedOutputTokens } : {}),
    ...(mergedExplicitTotal !== undefined ? { totalTokens: mergedExplicitTotal } : {})
  });

  return {
    provider: metadata.provider,
    ...(update.responseId !== undefined ? { responseId: update.responseId } : metadata.responseId !== undefined ? { responseId: metadata.responseId } : {}),
    ...(update.model !== undefined ? { model: update.model } : metadata.model !== undefined ? { model: metadata.model } : {}),
    ...(update.finishReason !== undefined
      ? { finishReason: update.finishReason }
      : metadata.finishReason !== undefined
        ? { finishReason: metadata.finishReason }
        : {}),
    ...(update.stopReason !== undefined
      ? { stopReason: update.stopReason }
      : metadata.stopReason !== undefined
        ? { stopReason: metadata.stopReason }
        : {}),
    ...(mergedUsage ? { usage: mergedUsage } : {})
  };
}

export async function collectProviderMetadata<TEvent>(
  provider: string,
  events: Iterable<TEvent> | AsyncIterable<TEvent>,
  extract: (event: TEvent) => ProviderMetadataUpdate | null | undefined
): Promise<ProviderStreamMetadata> {
  let metadata: ProviderStreamMetadata = { provider };

  for await (const event of events) {
    metadata = mergeProviderMetadata(metadata, extract(event));
  }

  return metadata;
}

export function extractOpenAIMetadata(event: OpenAIEvent): ProviderMetadataUpdate | undefined {
  const response = readRecord(event['response']);

  if (!response) {
    return undefined;
  }

  const update = buildMetadataUpdate({
    responseId: readString(response['id']),
    model: readString(response['model']),
    finishReason: readNullableString(response['finish_reason']) ?? readNullableString(response['status']),
    stopReason: undefined,
    usage: usageFromOpenAIStyle(response['usage'])
  });

  return hasMetadata(update) ? update : undefined;
}

export function extractOpenRouterMetadata(event: OpenRouterEvent): ProviderMetadataUpdate | undefined {
  const firstChoice = Array.isArray(event.choices) ? event.choices[0] : undefined;
  const finishReason = readNullableString(firstChoice?.finish_reason);
  const update = buildMetadataUpdate({
    responseId: readString(event.id),
    model: readString(event.model),
    finishReason,
    stopReason: undefined,
    usage: usageFromOpenAIStyle(readRecord(event)?.['usage'])
  });

  return hasMetadata(update) ? update : undefined;
}

export function extractDeepSeekMetadata(event: DeepSeekEvent): ProviderMetadataUpdate | undefined {
  return extractOpenRouterMetadata(event);
}

export function extractAnthropicMetadata(event: AnthropicEvent): ProviderMetadataUpdate | undefined {
  if (event.type === 'message_start') {
    const message = readRecord(event['message']);

    if (!message) {
      return undefined;
    }

    const update = buildMetadataUpdate({
      responseId: readString(message['id']),
      model: readString(message['model']),
      finishReason: undefined,
      stopReason: undefined,
      usage: usageFromAnthropic(message['usage'])
    });

    return hasMetadata(update) ? update : undefined;
  }

  if (event.type === 'message_delta') {
    const delta = readRecord(event['delta']);
    const stopReason = readNullableString(delta?.['stop_reason']) ?? readNullableString(delta?.['stop_sequence']);
    const update = buildMetadataUpdate({
      responseId: undefined,
      model: undefined,
      finishReason: stopReason,
      stopReason,
      usage: usageFromAnthropic(event['usage'])
    });

    return hasMetadata(update) ? update : undefined;
  }

  return undefined;
}

export function extractOllamaMetadata(event: OllamaEvent): ProviderMetadataUpdate | undefined {
  const finishReason = readNullableString(event.done_reason);
  const update = buildMetadataUpdate({
    responseId: undefined,
    model: readString(event.model),
    finishReason,
    stopReason: finishReason,
    usage: usageFromOllama(event)
  });

  return hasMetadata(update) ? update : undefined;
}
