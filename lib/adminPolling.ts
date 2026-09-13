/** A request gate shared by manual refreshes and automatic polling. */
export class AdminPollingError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class AdminPollingGate {
  private busy = false;
  private failures = 0;
  private retryAt = 0;
  private stopped = false;

  begin(quiet: boolean, now = Date.now()) {
    if (this.busy || (quiet && (this.stopped || now < this.retryAt))) return false;
    this.busy = true;
    if (!quiet) {
      this.failures = 0;
      this.stopped = false;
      this.retryAt = 0;
    }
    return true;
  }

  success() {
    this.failures = 0;
    this.retryAt = 0;
    this.stopped = false;
  }

  failure(error: unknown, now = Date.now()) {
    this.failures += 1;
    const status = error instanceof AdminPollingError ? error.status : 0;
    const code = (error as { code?: string } | null)?.code;
    const needsAction = (status >= 400 && status < 500 && status !== 408 && status !== 429)
      || (typeof code === "string" && code.startsWith("auth/") && code !== "auth/network-request-failed");
    this.stopped = needsAction || this.failures >= 3;
    this.retryAt = now + Math.min(60_000, 10_000 * 2 ** (this.failures - 1));
  }

  finish() {
    this.busy = false;
  }
}

/** Schedule from completion, so slow requests and visibility events never overlap. */
export function startAdminPolling(
  tick: () => void | Promise<unknown>,
  intervalMs: number,
  pauseWhenHidden = true,
) {
  let disposed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hidden = () => pauseWhenHidden && document.visibilityState === "hidden";
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const schedule = () => {
    clear();
    if (!disposed && !hidden()) timer = setTimeout(() => void run(), intervalMs);
  };
  const run = async () => {
    if (disposed || running || hidden()) return;
    clear();
    running = true;
    try {
      await tick();
    } finally {
      running = false;
      schedule();
    }
  };
  const onVisibility = () => {
    if (hidden()) clear();
    else void run();
  };
  schedule();
  if (pauseWhenHidden) document.addEventListener("visibilitychange", onVisibility);
  return () => {
    if (disposed) return;
    disposed = true;
    clear();
    if (pauseWhenHidden) document.removeEventListener("visibilitychange", onVisibility);
  };
}
