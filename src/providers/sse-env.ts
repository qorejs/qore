import type { ProviderHeaders } from './types.js';

// Read environment variables without assuming a Node-only runtime.
export function readEnv(name: string): string | undefined {
  return typeof process !== 'undefined' && process?.env
    ? process.env[name]
    : undefined;
}

// Read one JSON or text error body so adapter failures surface clearly.
export async function readErrorBody(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const body = await response.json();
      return body?.error?.message ?? body?.message ?? JSON.stringify(body);
    } catch {
      return `${response.status} ${response.statusText}`.trim();
    }
  }

  try {
    const text = await response.text();
    return text || `${response.status} ${response.statusText}`.trim();
  } catch {
    return `${response.status} ${response.statusText}`.trim();
  }
}

// Merge headers while allowing per-request overrides.
export function mergeHeaders(
  baseHeaders: ProviderHeaders = {},
  nextHeaders: ProviderHeaders = {}
): ProviderHeaders {
  return {
    ...baseHeaders,
    ...nextHeaders
  };
}
