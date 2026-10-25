/** Optional local recovery worker. Requires explicit operator startup. */
import { setTimeout as delay } from 'node:timers/promises';
import { drainRequestedJobs } from '../lib/horoscope/jobs';
const stop = new AbortController();
process.once('SIGINT', () => stop.abort());
process.once('SIGTERM', () => stop.abort());
async function main() {
  console.info('[horoscope-worker] started; existing requested jobs only');
  do {
    try {
      const result = await drainRequestedJobs();
      if (result.pendingJobs) console.info('[horoscope-worker]', result);
    } catch (error) {
      console.error('[horoscope-worker] recovery unavailable', { name: error instanceof Error ? error.name : 'Error' });
    }
    if (process.argv.includes('--once') || stop.signal.aborted) break;
    try { await delay(30_000, undefined, { signal: stop.signal }); } catch { break; }
  } while (!stop.signal.aborted);
}
void main().catch(() => { process.exitCode = 1; });
