import Stripe from 'stripe';
import { nameaiRequest } from '@/lib/nameai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout — start a partner-collected purchase.
 *  1. Get a FIRM price quote from name.ai (POST /v1/quotes) — also confirms the
 *     domain is still available.
 *  2. Create a Stripe Checkout Session on the PARTNER's own Stripe (we are the
 *     Merchant of Record and collect the buyer's payment).
 *  3. Return the Stripe URL; the buyer pays, then /success notifies name.ai.
 *
 * Body: { domain }
 */
export async function POST(req) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
  const stripe = new Stripe(secret);

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const domain = String(body?.domain || '').trim().toLowerCase();
  if (!domain) return Response.json({ error: 'domain is required' }, { status: 400 });

  // 1. Firm price quote from name.ai (authoritative price + availability).
  const quote = await nameaiRequest({ method: 'POST', path: '/api/partner/v1/quotes', body: { domain } });
  if (!quote.ok) {
    return Response.json(
      { error: quote.data?.error?.message || 'This domain is not available right now.' },
      { status: quote.status === 409 ? 409 : 502 },
    );
  }
  const { price_cents, currency = 'usd', quote_id } = quote.data;

  // 2. Stripe Checkout Session (partner is MoR, collects the payment).
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: String(currency).toLowerCase(),
          unit_amount: price_cents,
          product_data: { name: domain, description: `Premium domain — ${domain}` },
        },
      },
    ],
    customer_creation: 'always',
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`,
    metadata: { domain, sale_price_cents: String(price_cents), quote_id: quote_id || '' },
  });

  return Response.json({ url: session.url });
}
