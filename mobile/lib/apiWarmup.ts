import { API_URL } from '@/lib/env';

let warmed = false;
let warmPromise: Promise<void> | null = null;
let lastOkAt = 0;

const REWARM_AFTER_MS = 12 * 60 * 1000; // free Render can sleep ~15m idle

/**
 * Ping Render so the free dyno wakes while fonts/UI boot.
 * Safe to call many times — only one warm cycle runs at a time.
 * Re-warms after idle so cold starts after sleep are shorter.
 */
export function warmDiaryApi(apiUrl = API_URL): Promise<void> {
  if (warmed && Date.now() - lastOkAt < REWARM_AFTER_MS) {
    return Promise.resolve();
  }
  if (warmPromise) return warmPromise;

  const base = apiUrl.replace(/\/$/, '');
  if (!base) return Promise.resolve();

  warmed = false;
  warmPromise = (async () => {
    const delays = [0, 1500, 4000, 9000];
    try {
      for (const wait of delays) {
        if (wait) await new Promise((r) => setTimeout(r, wait));
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 12_000);
          const res = await fetch(`${base}/health`, { signal: ctrl.signal });
          clearTimeout(t);
          if (res.ok) {
            warmed = true;
            lastOkAt = Date.now();
            return;
          }
        } catch {
          // keep poking — cold start can take ~30–60s on free Render
        }
      }
    } finally {
      warmPromise = null;
    }
  })();

  return warmPromise;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
