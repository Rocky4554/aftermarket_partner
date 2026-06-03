import crypto from 'crypto';
import { signSearchRequest } from '@/lib/sign';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return Response.json({ error: 'query too short' }, { status: 400 });
  }

  const base = process.env.NAMEAI_API_BASE_URL;
  const keyId = process.env.NAMEAI_API_KEY_ID;
  const secret = process.env.NAMEAI_API_SECRET;

  if (!base || !keyId || !secret) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Build the upstream URL + params we will both SIGN and SEND.
  const upstream = new URL('/api/partner/v1/domains/search', base);
  upstream.searchParams.set('q', q);
  upstream.searchParams.set('limit', searchParams.get('limit') || '20');
  const tld = searchParams.get('tld');
  if (tld) upstream.searchParams.set('tld', tld);
  const minPrice = searchParams.get('minPrice');
  if (minPrice) upstream.searchParams.set('minPrice', minPrice);
  const maxPrice = searchParams.get('maxPrice');
  if (maxPrice) upstream.searchParams.set('maxPrice', maxPrice);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const signature = signSearchRequest({
    secret,
    method: 'GET',
    pathname: upstream.pathname,
    searchParams: upstream.searchParams,
    timestamp,
    nonce,
  });

  try {
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        'X-NameAI-Key-Id': keyId,
        'X-NameAI-Timestamp': String(timestamp),
        'X-NameAI-Nonce': nonce,
        'X-NameAI-Signature': signature,
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || 'search failed' },
        { status: res.status },
      );
    }

    // Re-shape to the partner's own house style (hide that it came from name.ai).
    return Response.json({
      query: data.query,
      results: (data.results || []).map((r) => ({
        domain: r.domain,
        price: r.bin_price,
        makeOffer: r.bin_price == null,
      })),
    });
  } catch (err) {
    return Response.json({ error: 'Failed to reach upstream' }, { status: 502 });
  }
}
