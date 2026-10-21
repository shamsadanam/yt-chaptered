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
