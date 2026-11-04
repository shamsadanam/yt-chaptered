import { MemoryCache } from './cache';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

const clearanceCache = new MemoryCache<boolean>(5000);

export function isClientCleared(key: string): boolean {
  return clearanceCache.has(key);
}

export function grantClientClearance(key: string, durationMs = 15 * 60 * 1000): void {
  clearanceCache.set(key, true, durationMs);
}

export async function verifyTurnstileToken(
  token: string,
  clientIp?: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Turnstile token is missing or empty' };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return {
      success: false,
      error: 'TURNSTILE_SECRET_KEY environment variable is not configured',
    };
  }

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
