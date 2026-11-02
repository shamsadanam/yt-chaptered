const CLOUDFLARE_TEST_SECRET = '1x0000000000000000000000000000000AA';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

const MAX_CLEARANCE_ENTRIES = 5000;
const clearanceStore = new Map<string, number>();
let lastClearanceCleanup = Date.now();

function evictStaleClearances(now: number) {
  if (now - lastClearanceCleanup < 60_000) return;
  lastClearanceCleanup = now;
  for (const [key, expiresAt] of clearanceStore) {
    if (now > expiresAt) clearanceStore.delete(key);
  }
}

export function isClientCleared(key: string): boolean {
  const now = Date.now();
  evictStaleClearances(now);
  const expiresAt = clearanceStore.get(key);
  if (!expiresAt) return false;
  if (now > expiresAt) {
    clearanceStore.delete(key);
    return false;
  }
  return true;
}

export function grantClientClearance(key: string, durationMs = 15 * 60 * 1000): void {
  const now = Date.now();
  evictStaleClearances(now);

  if (clearanceStore.size >= MAX_CLEARANCE_ENTRIES) {
    const oldestKey = clearanceStore.keys().next().value;
    if (oldestKey) clearanceStore.delete(oldestKey);
  }

  clearanceStore.set(key, now + durationMs);
}

export async function verifyTurnstileToken(
  token: string,
  clientIp?: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Turnstile token is missing or empty' };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY || CLOUDFLARE_TEST_SECRET;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret,
        response: token,
        ...(clientIp && { remoteip: clientIp }),
      }),
    });

    if (!res.ok) {
      return { success: false, error: `Verification request failed with status ${res.status}` };
    }

    const data: TurnstileVerifyResponse = await res.json();
    if (!data.success) {
      const errorMsg = data['error-codes']?.join(', ') || 'Bot verification failed';
      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown verification error',
    };
  }
}
