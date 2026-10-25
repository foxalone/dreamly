import type { PublicStatus } from './jobs';
export const POLL_INTERVAL_MS = 4000;
export const MAX_POLLS = 45;
/** Read-only, non-overlapping and bounded. No job creation is possible here. */
export function watchReading(read: () => Promise<PublicStatus>, options: {
  day: string; update: (status: PublicStatus) => void; ready: () => void; timedOut: () => void; unavailable: () => void;
  schedule?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  let stopped = false, count = 0, timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = options.schedule ?? setTimeout, cancel = options.cancel ?? clearTimeout;
  const tick = async () => {
    if (stopped) return;
    try {
      const result = await read();
      if (stopped) return;
      if (result.day !== options.day || result.status === 'ready') { stopped = true; options.ready(); return; }
      options.update(result);
      if (result.status === 'missing' || result.status === 'failed') { stopped = true; return; }
      if (++count >= MAX_POLLS) { stopped = true; options.timedOut(); return; }
      timer = schedule(() => { void tick(); }, POLL_INTERVAL_MS);
    } catch { if (!stopped) { stopped = true; options.unavailable(); } }
  };
  void tick();
  return () => { stopped = true; if (timer !== undefined) cancel(timer); };
}
