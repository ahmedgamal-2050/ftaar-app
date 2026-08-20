import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
}

export const requestAls = new AsyncLocalStorage<RequestStore>();

export function getRequestId(): string | undefined {
  return requestAls.getStore()?.requestId;
}
