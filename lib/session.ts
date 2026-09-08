/**
 * Cookie-based gate for the whole app. Runs in the Edge runtime (middleware),
 * so it uses Web Crypto only — no Node built-ins.
 *
 * The cookie is `<expiry>.<hmac>`, signed with SESSION_SECRET. The password
 * itself never reaches the browser and can't be recovered from a stolen
 * cookie, because the signing key is independent of it.
 */

export const SESSION_COOKIE = 'bm_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // a year — this is a phone app

const encoder = new TextEncoder();
let keyPromise: Promise<CryptoKey> | null = null;
let keyFor = '';

function signingKey(secret: string): Promise<CryptoKey> {
  if (!keyPromise || keyFor !== secret) {
    keyFor = secret;
    keyPromise = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  }
  return keyPromise;
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await signingKey(secret);
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * The signing key mixes in the PIN, so changing the PIN invalidates every
 * cookie already issued. Without this a stolen cookie would outlive the
 * credential it was traded for, for a whole year.
 */
export function signingMaterial(secret: string, pin: string): string {
  return `${secret}\u0000${pin}`;
}

export async function issueSession(secret: string): Promise<string> {
  const expiry = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expiry}.${await sign(secret, expiry)}`;
}

export async function isValidSession(
  secret: string,
  cookie: string | undefined,
): Promise<boolean> {
  if (!cookie) return false;

  const sep = cookie.indexOf('.');
  if (sep < 1) return false;

  const expiry = cookie.slice(0, sep);
  const mac = cookie.slice(sep + 1);

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return timingSafeEqual(mac, await sign(secret, expiry));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The gate is only active once APP_PASSWORD is set, so an install that never
 * sets it keeps working exactly as before.
 */
export function gateConfig() {
  const pin = process.env.APP_PIN;
  const secret = process.env.SESSION_SECRET;
  if (!pin || !secret) return null;
  return { pin, sessionKey: signingMaterial(secret, pin) };
}
