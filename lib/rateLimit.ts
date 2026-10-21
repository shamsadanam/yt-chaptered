type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
let lastCleanup = Date.now();

function evictStale(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

// Per-instance on serverless — resets on cold start but catches request bursts.
export function checkRateLimit(
  key: string,
  { windowMs = 60_000, max = 15 } = {}
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  evictStale(now);

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  entry.count++;

  if (entry.count > max) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}
