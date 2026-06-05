import Stripe from 'stripe';
import { nameaiRequest } from '@/lib/nameai';

export const dynamic = 'force-dynamic';

/**
 * GET /api/confirm?session_id=...  — called by the /success page after Stripe
 * checkout. Verifies the session is PAID, then notifies name.ai of the sale
 * (POST /v1/orders, partner-collected) using the Stripe payment id as the
 * external_payment_ref and the session id as the idempotency key (so a refresh
 * never double-records).
 */
export async function GET(req) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
  const stripe = new Stripe(secret);

  const sessionId = new URL(req.url).searchParams.get('session_id');
  if (!sessionId) return Response.json({ error: 'session_id is required' }, { status: 400 });

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return Response.json({ error: 'Could not find that checkout session.' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return Response.json({ paid: false, error: 'Payment not completed.' }, { status: 402 });
  }

  const domain = session.metadata?.domain;
  const salePriceCents = Number(session.metadata?.sale_price_cents);
  const buyerEmail = session.customer_details?.email || 'buyer@unknown.test';
  const paymentRef = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;

  // Notify name.ai — record the partner-collected sale. Idempotent on the session id.
  const order = await nameaiRequest({
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

  if (!order.ok) {
    return Response.json(
      {
        paid: true,
        recorded: false,
        domain,
        error: order.data?.error?.message || order.data?.error || 'Could not record the sale with name.ai.',
      },
      { status: 200 },
    );
  }

  return Response.json({
    paid: true,
    recorded: true,
    domain,
    order: {
      id: order.data.public_id,
      status: order.data.status,
      delivery: order.data.delivery,
    },
  });
}
