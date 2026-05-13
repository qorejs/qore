// @ts-nocheck
import { createResponse } from './response-runtime.js';

// Ship a few common reducers as convenience constructors on top of createResponse.
export { createResponse } from './response-runtime.js';

export const response = {
  create: createResponse,

  text(seed = '') {
    return createResponse({
      seed,
      reduce: (currentValue, chunk) => currentValue + String(chunk)
    });
  },

  list(seed = []) {
    return createResponse({
      seed,
      reduce: (currentValue, chunk) => [...currentValue, chunk]
    });
  },

  latest(seed = null) {
    return createResponse({
      seed,
      reduce: (_, chunk) => chunk
    });
  }
};
