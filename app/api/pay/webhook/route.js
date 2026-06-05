import Stripe from 'stripe';
import { nameaiRequest } from '@/lib/nameai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pay/webhook — Stripe webhook (the RELIABLE notifier).
 *
 * Stripe calls this server-to-server when a checkout completes, even if the buyer
 * closed the tab. We verify the Stripe signature, then notify name.ai of the sale
 * (POST /v1/orders, partner-collected). Idempotent on the Stripe session id, so it's
 * safe alongside the /success-page fallback — name.ai records the sale exactly once.
 *
 * Configure in Stripe: Destination URL = https://<this-app-host>/api/pay/webhook,
 * event = checkout.session.completed. Put the signing secret in STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return new Response('Stripe webhook not configured', { status: 500 });
  }
  const stripe = new Stripe(secret);

  // Stripe signature verification needs the RAW body, not parsed JSON.
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const domain = session.metadata?.domain;
      const salePriceCents = Number(session.metadata?.sale_price_cents);
      const buyerEmail = session.customer_details?.email || 'buyer@unknown.test';
      const paymentRef = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;

      const res = await nameaiRequest({
        method: 'POST',
        path: '/api/partner/v1/orders',
        idempotencyKey: session.id,
        body: {
          domain,
          sale_price_cents: salePriceCents,
          currency: 'USD',
          external_payment_ref: paymentRef,
          buyer: { email: buyerEmail },
        },
      });

      if (!res.ok) {
        // Return non-2xx so Stripe RETRIES transient failures (idempotency dedupes).
        console.error('[pay/webhook] name.ai /orders failed:', res.status, JSON.stringify(res.data));
        return new Response('Failed to record sale upstream', { status: 502 });
      }
      console.log('[pay/webhook] sale recorded:', domain, res.data?.public_id);
    }
  }

  // Acknowledge all other events so Stripe doesn't retry them.
  return Response.json({ received: true });
}
