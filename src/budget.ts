/** Internal safety limits, deliberately absent from the consumer API. */
export const limits = Object.freeze({
  entries: 500, blocks: 25_000, continuationPages: 100,
  apiBytes: 8 * 1024 * 1024, markdownBytes: 32 * 1024 * 1024,
  mediaBytes: 32 * 1024 * 1024, frames: 200, pixels: 40_000_000,
  syncMs: 300_000, apiMs: 20_000, mediaMs: 30_000, attempts: 3,
});
export class LimitError extends Error {}
export function checkLimit(value: number, maximum: number, label: string): void {
  if (value > maximum) throw new LimitError(`Craft ${label} exceeds the supported limit.`);
}
export interface Deadline {
  signal: AbortSignal;
  remaining(): number;
  check(): void;
  wait<T>(promise: Promise<T>): Promise<T>;
  close(): void;
}
/** Races even transports/hooks that ignore AbortSignal, without retaining timers. */
export function deadline(milliseconds: number, parent?: Deadline): Deadline {
  const controller = new AbortController();
  const end = Date.now() + Math.min(milliseconds, parent?.remaining() ?? milliseconds);
  const abort = () => controller.abort();
  const timer = setTimeout(abort, Math.max(0, end - Date.now()));
  parent?.signal.addEventListener('abort', abort, { once: true });
  const check = () => {
    if (controller.signal.aborted || parent?.signal.aborted || Date.now() >= end) {
      controller.abort();
      throw new Error('Craft operation failed or timed out.');
    }
  };
  return {
    signal: controller.signal, remaining: () => Math.max(0, end - Date.now()), check,
    async wait<T>(promise: Promise<T>): Promise<T> {
      // Attach a rejection handler even when the deadline has already elapsed.
      void promise.catch(() => {});
      check();
      let listener: () => void = () => {};
      const aborted = new Promise<never>((_, reject) => {
        listener = () => reject(new Error('Craft operation failed or timed out.'));
        controller.signal.addEventListener('abort', listener, { once: true });
      });
      try { const value = await Promise.race([promise, aborted]); check(); return value; }
      finally { controller.signal.removeEventListener('abort', listener); }
    },
    close() { clearTimeout(timer); parent?.signal.removeEventListener('abort', abort); controller.abort(); },
  };
}
export function createSyncBudget(milliseconds = limits.syncMs) {
  const time = deadline(milliseconds);
  let blocks = 0, continuations = 0, markdown = 0;
  return {
    time,
    block() { time.check(); checkLimit(++blocks, limits.blocks, 'structured block count'); },
    continuation() { time.check(); checkLimit(++continuations, limits.continuationPages, 'continuation page count'); },
    markdown(bytes: number) { time.check(); markdown += bytes; checkLimit(markdown, limits.markdownBytes, 'normalized Markdown size'); },
  };
}
export type SyncBudget = ReturnType<typeof createSyncBudget>;
