import crypto from 'crypto';
import { signRequest } from './sign';

/**
 * Make an HMAC-signed request to the name.ai partner API (server-side only — the
 * secret never reaches the browser). Handles GET (query) and POST (JSON body),
 * signing the exact body bytes. `idempotencyKey` (POST /orders) is sent as a
 * header and is NOT part of the signature.
 */
export async function nameaiRequest({ method, path, query = {}, body = null, idempotencyKey = null }) {
  const base = process.env.NAMEAI_API_BASE_URL;
  const keyId = process.env.NAMEAI_API_KEY_ID;
  const secret = process.env.NAMEAI_API_SECRET;
  if (!base || !keyId || !secret) {
    return { ok: false, status: 500, data: { error: 'name.ai credentials not configured' } };
  }

  const url = new URL(path, base);
  for (const [k, v] of Object.entries(query)) {
    if (v != null) url.searchParams.set(k, String(v));
  }

  const bodyStr = body != null ? JSON.stringify(body) : '';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const signature = signRequest({
    secret,
    method,
    pathname: url.pathname,
    searchParams: url.searchParams,
    timestamp,
    nonce,
    body: bodyStr,
  });

  const headers = {
    'X-NameAI-Key-Id': keyId,
    'X-NameAI-Timestamp': String(timestamp),
    'X-NameAI-Nonce': nonce,
    'X-NameAI-Signature': signature,
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const init = { method, headers, cache: 'no-store' };
  if (body != null) {
    headers['Content-Type'] = 'application/json';
    init.body = bodyStr;
  }

  const res = await fetch(url.toString(), init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
