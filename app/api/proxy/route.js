import { nameaiRequest } from '@/lib/nameai';

export const dynamic = 'force-dynamic';

// Demo/test proxy: signs (server-side, secret stays here) and forwards a call to
// the name.ai Partner API so the browser test console can exercise any endpoint
// end-to-end. Restricted to partner API paths so it can't be used as an open
// relay. This is for the test console only — real flows use dedicated routes.
const ALLOWED_PREFIXES = ['/api/partner/v1/', '/api/partner/webhooks'];

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const method = String(payload?.method || 'GET').toUpperCase();
  const path = String(payload?.path || '');
  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return Response.json({ error: 'path not allowed' }, { status: 400 });
  }

  const r = await nameaiRequest({
    method,
    path,
    query: payload?.query || {},
    body: payload?.body ?? null,
    idempotencyKey: payload?.idempotencyKey || null,
  });

  return Response.json({ ok: r.ok, status: r.status, data: r.data });
}
