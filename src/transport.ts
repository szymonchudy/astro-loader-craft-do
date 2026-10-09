import { setTimeout as delay } from 'node:timers/promises';
import { checkLimit, deadline, LimitError, limits, type Deadline } from './budget.js';

const transient = new Set([408, 429, 500, 502, 503, 504]);
function cancel(body: ReadableStream<Uint8Array> | null): void {
  if (body) void body.cancel().catch(() => {});
}
async function readBytes(response: Response, maximum: number, time: Deadline, onBytes?: (bytes: number) => void): Promise<Buffer> {
  const length = response.headers.get('content-length');
  if (length && /^\d+$/.test(length)) {
    try { checkLimit(Number(length), maximum, 'response size'); }
    catch (error) { cancel(response.body); throw error; }
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await time.wait(reader.read());
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      checkLimit(size, maximum, 'response size');
      // Shared accounting happens before retention and is never refunded on retry.
      onBytes?.(value.byteLength);
      chunks.push(value);
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}
function retryAfter(response: Response): number {
  const value = response.headers.get('retry-after');
  if (!value) return 0;
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * 1000;
  const when = Date.parse(value);
  return Number.isFinite(when) ? Math.max(0, when - Date.now()) : 0;
}
/** Retries only transport interruptions and explicitly temporary HTTP responses. */
export async function requestBytes(url: URL, request: typeof fetch, options: {
  init?: RequestInit; maximum: number; milliseconds: number; parent?: Deadline;
  onBytes?: (bytes: number) => void;
  failure: string; httpError(status: number): Error;
}): Promise<Buffer> {
  const time = deadline(options.milliseconds, options.parent);
  let failure = new Error(options.failure);
  try {
    for (let attempt = 0; attempt < limits.attempts; attempt++) {
      let backoff = attempt === 0 ? 250 : 750;
      let response: Response | undefined;
      try {
        const pending = request(url, { ...options.init, redirect: 'error', signal: time.signal });
        // A custom transport may resolve after cancellation; discard its body.
        void pending.then(result => { if (time.signal.aborted) cancel(result.body); }, () => {});
        response = await time.wait(pending);
      } catch { failure = new Error(options.failure); }
      if (response) {
        if (!response.ok) {
          cancel(response.body);
          failure = options.httpError(response.status);
          if (!transient.has(response.status)) throw failure;
          backoff = Math.max(backoff, retryAfter(response));
        } else {
          try { return await readBytes(response, options.maximum, time, options.onBytes); }
          catch (error) {
            if (error instanceof LimitError) throw error;
            failure = new Error(options.failure);
          }
        }
      }
      if (attempt === limits.attempts - 1 || backoff >= time.remaining()) throw failure;
      try { await time.wait(delay(backoff, undefined, { signal: time.signal })); }
      catch { throw failure; }
    }
    throw failure;
  } finally { time.close(); }
}
