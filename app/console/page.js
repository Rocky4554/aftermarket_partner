'use client';

import { useState } from 'react';
import Link from 'next/link';

const PRESETS = [
  {
    group: 'Discovery', label: 'Search', method: 'GET',
    path: '/api/partner/v1/domains/search', query: { q: 'ai' },
    desc: 'Semantic + keyword domain search across name.ai inventory. Returns up to 5 ranked results with BIN price and relevance score.',
    params: [
      { name: 'q', required: true, desc: 'Search query, e.g. "ai startup" or "lawyer"' },
      { name: 'limit', required: false, desc: 'Max results (default 5, max 5)' },
    ],
    example: { results: [{ domain: 'custodylawyer.com', bin_price: 25000, score: 0.91 }], total: 1 },
  },
  {
    group: 'Discovery', label: 'Domain detail', method: 'GET',
    path: '/api/partner/v1/domains/example.ai', query: {},
    desc: 'Fetch full details for a single domain — price, description, age, extension info, and listing metadata.',
    params: [
      { name: ':domain (path)', required: true, desc: 'The domain to look up, e.g. /domains/example.ai' },
    ],
    example: { domain: 'example.ai', bin_price: 12000, floor_price: 8000, description: 'Short premium .ai domain', listed_at: '2026-01-10' },
  },
  {
    group: 'Discovery', label: 'Availability', method: 'GET',
    path: '/api/partner/v1/availability', query: { domain: 'example.ai' },
    desc: 'Check whether a domain is currently available for purchase on name.ai — not reserved, not sold, actively listed.',
    params: [
      { name: 'domain', required: true, desc: 'Domain name to check, e.g. example.ai' },
    ],
    example: { domain: 'example.ai', available: true, bin_price: 12000 },
  },
  {
    group: 'Discovery', label: 'Pricing', method: 'GET',
    path: '/api/partner/v1/pricing', query: { domain: 'example.ai' },
    desc: 'Get the current BIN and floor price for a domain without fetching full detail. Useful for price-display in your storefront.',
    params: [
      { name: 'domain', required: true, desc: 'Domain name to price, e.g. example.ai' },
    ],
    example: { domain: 'example.ai', bin_price: 12000, floor_price: 8000, currency: 'USD' },
  },

  {
    group: 'Buy (MoR)', label: 'Quote', method: 'POST',
    path: '/api/partner/v1/quotes', body: { domain: 'example.ai' },
    desc: 'Lock a price quote for a domain (valid 15 min). Use the returned quote_id when recording the order after you collect payment on your Stripe. MoR partners only.',
    params: [
      { name: 'domain', required: true, desc: 'Domain being purchased' },
    ],
    example: { quote_id: 'qt_A1B2C3', domain: 'example.ai', bin_price: 12000, currency: 'USD', expires_at: '2026-06-08T12:15:00Z' },
  },
  {
    group: 'Buy (MoR)', label: 'Record order', method: 'POST',
    path: '/api/partner/v1/orders',
    body: { quote_id: 'PASTE_QUOTE_ID', external_payment_ref: 'pi_test_123', buyer: { email: 'buyer@example.com' } },
    idempotencyKey: 'demo-order-1',
    desc: 'Record a completed sale after YOU collected payment on your own Stripe. name.ai uses this to trigger domain transfer, track the sale, and credit your commission. Always pass an Idempotency-Key.',
    params: [
      { name: 'quote_id', required: true, desc: 'From POST /quotes — locks the price' },
      { name: 'external_payment_ref', required: true, desc: 'Your Stripe payment_intent id (pi_…) for reconciliation' },
      { name: 'buyer.email', required: true, desc: 'Buyer email — used for transfer instructions' },
      { name: 'buyer.name', required: false, desc: 'Buyer full name' },
      { name: 'Idempotency-Key', required: true, desc: 'Header — unique per order, prevents duplicates' },
    ],
    example: { order_id: 'ord_X1Y2Z3', domain: 'example.ai', status: 'PAID', commission_due: 1200, created_at: '2026-06-08T12:10:00Z' },
  },
  {
    group: 'Buy (MoR)', label: 'List orders', method: 'GET',
    path: '/api/partner/v1/orders', query: {},
    desc: 'List all partner-collected orders for your account, newest first. Each row shows domain, status, sale price, commission.',
    params: [
      { name: 'status', required: false, desc: 'Filter: PAID | TRANSFERRED | CANCELLED' },
      { name: 'limit / offset', required: false, desc: 'Pagination (default limit 20)' },
    ],
    example: { orders: [{ order_id: 'ord_X1Y2Z3', domain: 'example.ai', status: 'PAID', sale_price: 12000 }], total: 1 },
  },
  {
    group: 'Buy (MoR)', label: 'Order by id', method: 'GET',
    path: '/api/partner/v1/orders/PASTE_ORDER_ID', query: {},
    desc: 'Fetch a single order by its ID. Useful for polling transfer status or confirming a specific sale.',
    params: [
      { name: ':order_id (path)', required: true, desc: 'e.g. ord_X1Y2Z3 from the create response' },
    ],
    example: { order_id: 'ord_X1Y2Z3', domain: 'example.ai', status: 'TRANSFERRED', transferred_at: '2026-06-09T08:00:00Z' },
  },

  {
    group: 'Pay with name.ai', label: 'Checkout session', method: 'POST',
    path: '/api/partner/v1/checkout-session', body: { domain: 'example.ai' },
    desc: 'Create a "Pay with name.ai" session. Returns a signed checkout_url pointing to the name.ai lander. Send the buyer there — name.ai collects payment, handles transfer, and credits your commission at settlement. Works for both MoR and non-MoR partners.',
    params: [
      { name: 'domain', required: true, desc: 'Domain the buyer wants to purchase' },
      { name: 'return_url', required: false, desc: 'Where to send the buyer after payment' },
      { name: 'cancel_url', required: false, desc: 'Where to send the buyer if they abandon' },
    ],
    example: { checkout_url: 'https://name.ai/lander/example.ai?pt=eyJ...', domain: 'example.ai', price_cents: 1200000, payment_model: 'name_ai_collected', expires_in_seconds: 604800 },
  },

  {
    group: 'Brokerage', label: 'Eligibility', method: 'GET',
    path: '/api/partner/v1/brokerage/eligibility', query: { domain: 'example.ai' },
    desc: 'Check whether a domain is eligible for name.ai brokerage. A domain is ineligible if it runs an active live site or already has an open brokerage case.',
    params: [
      { name: 'domain', required: true, desc: 'Domain to check eligibility for' },
    ],
    example: { domain: 'example.ai', eligible: true, reason: 'parked' },
  },
  {
    group: 'Brokerage', label: 'Create case', method: 'POST',
    path: '/api/partner/v1/brokerage',
    body: { domain: 'example.ai', tier: 'managed', buyer_email: 'buyer@example.com', offer_price: 5000 },
    desc: 'Open a brokerage case where name.ai negotiates acquisition of a domain on the buyer\'s behalf. Tier "managed" = full-service; "self_serve" = we provide tools, partner manages. Returns a no-login progress link for the buyer.',
    params: [
      { name: 'domain', required: true, desc: 'Domain to acquire (not necessarily on name.ai)' },
      { name: 'tier', required: true, desc: '"managed" (name.ai brokers) or "self_serve"' },
      { name: 'buyer_email', required: true, desc: 'Buyer contact for updates' },
      { name: 'offer_price', required: false, desc: 'Buyer\'s starting offer in USD' },
    ],
    example: { case_id: 'bc_A1B2', domain: 'example.ai', status: 'open', progress_url: 'https://name.ai/broker/bc_A1B2?token=…' },
  },
  {
    group: 'Brokerage', label: 'Case by id', method: 'GET',
    path: '/api/partner/v1/brokerage/PASTE_CASE_ID', query: {},
    desc: 'Fetch the current status and timeline of a brokerage case. Poll this or listen for the case_completed webhook.',
    params: [
      { name: ':case_id (path)', required: true, desc: 'e.g. bc_A1B2 from the create response' },
    ],
    example: { case_id: 'bc_A1B2', domain: 'example.ai', status: 'negotiating', last_offer: 8000 },
  },

  {
    group: 'Settlement', label: 'Settlements', method: 'GET',
    path: '/api/partner/v1/settlements', query: {},
    desc: 'List all settled payouts name.ai has sent to your account. Settlements run on the 1st and 15th of each month, 45 days after each sale.',
    params: [
      { name: 'limit / offset', required: false, desc: 'Pagination' },
    ],
    example: { settlements: [{ id: 'ps_1', amount: 3600, currency: 'USD', settled_at: '2026-06-01', orders: 3 }], total: 1 },
  },
  {
    group: 'Settlement', label: 'Transactions', method: 'GET',
    path: '/api/partner/v1/transactions', query: {},
    desc: 'Full sales history — every domain sold through your partner attribution (both name.ai-collected and partner-collected). Shows sale price, your commission, and settlement status.',
    params: [
      { name: 'limit / offset', required: false, desc: 'Pagination (default 20)' },
      { name: 'status', required: false, desc: 'Filter by settlement status: pending | accrued | settled' },
    ],
    example: { transactions: [{ domain: 'example.ai', sale_price: 12000, commission: 1200, status: 'accrued', sold_at: '2026-05-10' }], total_commission: 1200 },
  },

  {
    group: 'Referral', label: 'Create link', method: 'POST',
    path: '/api/partner/v1/links', body: { target_type: 'generic' },
    desc: 'Create a tracked referral link. Any buyer who clicks it and later purchases earns you a commission — no Stripe or payment integration needed.',
    params: [
      { name: 'target_type', required: true, desc: '"generic" (name.ai homepage) or "domain" (specific domain lander)' },
      { name: 'domain', required: false, desc: 'Required when target_type = "domain"' },
      { name: 'label', required: false, desc: 'Internal label for your tracking' },
    ],
    example: { link_id: 'lnk_R1', url: 'https://name.ai/?ref=ptr_ABC123', clicks: 0, sales: 0 },
  },
  {
    group: 'Referral', label: 'List links', method: 'GET',
    path: '/api/partner/v1/links', query: {},
    desc: 'List all referral links you\'ve created with click and conversion stats.',
    params: [
      { name: 'limit / offset', required: false, desc: 'Pagination' },
    ],
    example: { links: [{ link_id: 'lnk_R1', url: 'https://name.ai/?ref=ptr_ABC123', clicks: 142, sales: 3 }] },
  },
  {
    group: 'Referral', label: 'My sales', method: 'GET',
    path: '/api/partner/v1/me/sales', query: {},
    desc: 'All sales attributed to your referral links — buyer, domain, amount, and commission earned.',
    params: [],
    example: { sales: [{ domain: 'custodylawyer.com', sale_price: 25000, commission: 2500, sold_at: '2026-05-20' }] },
  },
  {
    group: 'Referral', label: 'My commissions', method: 'GET',
    path: '/api/partner/v1/me/commissions', query: {},
    desc: 'Commission ledger — every commission earned (accrued, pending, paid out), grouped by status.',
    params: [],
    example: { total_accrued: 3700, total_paid: 1200, items: [{ amount: 2500, status: 'accrued', domain: 'custodylawyer.com' }] },
  },
  {
    group: 'Referral', label: 'My payouts', method: 'GET',
    path: '/api/partner/v1/me/payouts', query: {},
    desc: 'All payouts (partner commissions) sent to your account, with dates and amounts.',
    params: [],
    example: { payouts: [{ id: 'pout_1', amount: 1200, currency: 'USD', paid_at: '2026-06-01' }] },
  },
  {
    group: 'Referral', label: 'Analytics', method: 'GET',
    path: '/api/partner/v1/analytics', query: {},
    desc: 'Aggregated performance metrics: clicks, unique visitors, conversion rate, total revenue attributed, and commission earned — across all your links and channels.',
    params: [
      { name: 'from / to', required: false, desc: 'Date range (ISO 8601), e.g. 2026-05-01 / 2026-06-08' },
    ],
    example: { clicks: 1420, unique_visitors: 980, conversions: 12, revenue: 145000, commission: 14500, conversion_rate: '1.2%' },
  },

  {
    group: 'Webhooks', label: 'Events', method: 'GET',
    path: '/api/partner/v1/events', query: {},
    desc: 'List recent webhook delivery events — what was sent, when, and whether it succeeded. Useful for debugging missed webhooks. Supported events: order.completed, brokerage.case_completed.',
    params: [
      { name: 'limit / offset', required: false, desc: 'Pagination' },
    ],
    example: { events: [{ event: 'order.completed', delivered_at: '2026-06-08T11:00:00Z', status: 'success', payload: { domain: 'example.ai' } }] },
  },
];

const pretty = (o) => JSON.stringify(o ?? {}, null, 2);

const METHOD_COLOR = {
  GET: 'text-emerald-600 bg-emerald-50',
  POST: 'text-violet-600 bg-violet-50',
  PUT: 'text-amber-600 bg-amber-50',
};

export default function ConsolePage() {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/partner/v1/domains/search');
  const [queryText, setQueryText] = useState('{\n  "q": "ai"\n}');
  const [bodyText, setBodyText] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [resp, setResp] = useState(null);
  const [running, setRunning] = useState(false);
  const [activePreset, setActivePreset] = useState(PRESETS[0]);

  const load = (p) => {
    setMethod(p.method);
    setPath(p.path);
    setQueryText(p.query ? pretty(p.query) : '');
    setBodyText(p.body ? pretty(p.body) : '');
    setIdempotencyKey(p.idempotencyKey || '');
    setResp(null);
    setActivePreset(p);
  };

  const run = async () => {
    setRunning(true); setResp(null);
    let query = {}, body = null;
    try { query = queryText.trim() ? JSON.parse(queryText) : {}; } catch { setResp({ error: 'Invalid query JSON' }); setRunning(false); return; }
    if (method !== 'GET' && bodyText.trim()) {
      try { body = JSON.parse(bodyText); } catch { setResp({ error: 'Invalid body JSON' }); setRunning(false); return; }
    }
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, path, query, body, idempotencyKey: idempotencyKey || null }),
      });
      setResp(await res.json());
    } catch { setResp({ error: 'Network error' }); }
    setRunning(false);
  };

  const groups = [...new Set(PRESETS.map((p) => p.group))];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">Partner API console</span>
          <nav className="flex gap-4 text-sm font-medium text-gray-600">
            <Link href="/mor" className="hover:text-violet-600">MoR</Link>
            <Link href="/non-mor" className="hover:text-violet-600">Non-MoR</Link>
            <Link href="/console" className="text-violet-600">API console</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">

        {/* Sidebar presets */}
        <aside className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 px-1">{g}</div>
              <div className="flex flex-col gap-0.5">
                {PRESETS.filter((p) => p.group === g).map((p) => (
                  <button
                    key={p.label}
                    onClick={() => load(p)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg transition-all ${activePreset?.label === p.label ? 'bg-violet-100 text-violet-800 font-semibold border border-violet-200' : 'hover:bg-gray-100 text-gray-700 border border-transparent'}`}
                  >
                    <span className={`font-mono text-[9px] font-bold mr-1.5 px-1 py-0.5 rounded ${METHOD_COLOR[p.method] || 'text-gray-500 bg-gray-100'}`}>{p.method}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Main panel */}
        <section className="space-y-4 min-w-0">

          {/* Description card */}
          {activePreset && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded font-mono mt-0.5 ${METHOD_COLOR[activePreset.method]}`}>{activePreset.method}</span>
                <div>
                  <div className="font-semibold text-gray-900 text-base">{activePreset.label}</div>
                  <div className="text-xs font-mono text-gray-400 mt-0.5">{activePreset.path.replace('PASTE_ORDER_ID', ':order_id').replace('PASTE_CASE_ID', ':case_id')}</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{activePreset.desc}</p>

              {activePreset.params?.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Parameters</div>
                  <div className="space-y-1.5">
                    {activePreset.params.map((param) => (
                      <div key={param.name} className="flex items-start gap-2 text-sm">
                        <code className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">{param.name}</code>
                        {param.required
                          ? <span className="text-[10px] font-bold text-red-500 uppercase mt-0.5">required</span>
                          : <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">optional</span>}
                        <span className="text-gray-500 text-xs mt-0.5">{param.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePreset.example && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Example response</div>
                  <pre className="rounded-lg bg-gray-900 text-green-300 text-xs p-3 overflow-auto max-h-40">{pretty(activePreset.example)}</pre>
                </div>
              )}
            </div>
          )}

          {/* Request builder */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Request</div>
            <div className="flex gap-2">
              <select value={method} onChange={(e) => setMethod(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono">
                {['GET', 'POST', 'PUT'].map((m) => <option key={m}>{m}</option>)}
              </select>
              <input value={path} onChange={(e) => setPath(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono min-w-0" />
              <button onClick={run} disabled={running}
                className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-sm cursor-pointer whitespace-nowrap">
                {running ? 'Running…' : 'Run'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Query (JSON)</label>
                <textarea value={queryText} onChange={(e) => setQueryText(e.target.value)} rows={5}
                  className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Body (JSON, POST/PUT)</label>
                <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={5}
                  className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Idempotency-Key (orders)</label>
              <input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
            </div>
          </div>

          {/* Response */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Response</div>
            <pre className="rounded-lg border border-gray-200 bg-gray-900 text-green-200 text-xs p-4 overflow-auto max-h-[400px]">
              {resp ? pretty(resp) : '// Pick a preset on the left or build a request, then Run.'}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
