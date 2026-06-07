import { nameaiRequest } from '@/lib/nameai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nameai-checkout — "Pay with name.ai" (name.ai is Merchant of Record).
 * Calls POST /api/partner/v1/checkout-session and returns the hosted checkout
 * link (name.ai lander). The buyer pays + registers there; the sale is
 * attributed to us as the partner. We collect nothing — name.ai does.
 *
 * Body: { domain }
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const domain = String(body?.domain || '').trim().toLowerCase();
  if (!domain) return Response.json({ error: 'domain is required' }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const r = await nameaiRequest({
    method: 'POST',
    path: '/api/partner/v1/checkout-session',
    body: { domain, return_url: `${origin}/success`, cancel_url: origin },
  });

  if (!r.ok) {
    return Response.json(
      { error: r.data?.error?.message || 'Could not start name.ai checkout.' },
      { status: r.status === 409 ? 409 : 502 },
    );
  }
  return Response.json({ checkout_url: r.data.checkout_url });
}
