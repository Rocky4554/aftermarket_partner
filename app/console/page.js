'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ─── API definitions ─────────────────────────────────────────────────────── */
const APIS = [
  /* ── DISCOVERY ─────────────────────────────────────────────────── */
  {
    group: 'Discovery',
    label: 'Search domains',
    method: 'GET',
    path: '/api/partner/v1/domains/search',
    desc: 'Semantic + keyword search across name.ai inventory. Returns up to 5 ranked results with BIN price.',
    fields: [
      { key: 'q', in: 'query', label: 'Search query', placeholder: 'e.g. ai startup, lawyer', required: true },
      { key: 'limit', in: 'query', label: 'Limit (max 5)', placeholder: '5', required: false },
    ],
  },
  {
    group: 'Discovery',
    label: 'Domain detail',
    method: 'GET',
    path: '/api/partner/v1/domains/:domain',
    desc: 'Full details for a single domain — price, description, age, and listing metadata.',
    fields: [
      { key: ':domain', in: 'path', label: 'Domain', placeholder: 'e.g. example.ai', required: true },
    ],
  },
  {
    group: 'Discovery',
    label: 'Availability',
    method: 'GET',
    path: '/api/partner/v1/availability',
    desc: 'Check if a domain is currently available for purchase — not reserved or sold.',
    fields: [
      { key: 'domain', in: 'query', label: 'Domain', placeholder: 'e.g. example.ai', required: true },
    ],
  },
  {
    group: 'Discovery',
    label: 'Pricing',
    method: 'GET',
    path: '/api/partner/v1/pricing',
    desc: 'Get the current BIN and floor price for a domain. Lightweight — no full listing detail.',
    fields: [
      { key: 'domain', in: 'query', label: 'Domain', placeholder: 'e.g. example.ai', required: true },
    ],
  },

  /* ── BUY (MoR) ─────────────────────────────────────────────────── */
  {
    group: 'Buy (MoR)',
    label: 'Get quote',
    method: 'POST',
    path: '/api/partner/v1/quotes',
    desc: 'Lock a price quote (valid 15 min). Use the returned quote_id when recording the order after you collect payment on your own Stripe. MoR partners only.',
    fields: [
      { key: 'domain', in: 'body', label: 'Domain', placeholder: 'e.g. example.ai', required: true },
    ],
  },
  {
    group: 'Buy (MoR)',
    label: 'Record order',
    method: 'POST',
    path: '/api/partner/v1/orders',
    desc: 'Record a completed sale after YOU collected payment. name.ai triggers domain transfer and credits your commission. Always set an Idempotency-Key.',
    idempotency: true,
    fields: [
      { key: 'quote_id', in: 'body', label: 'Quote ID', placeholder: 'qt_…', required: true },
      { key: 'external_payment_ref', in: 'body', label: 'Payment ref (Stripe pi_…)', placeholder: 'pi_3…', required: true },
      { key: 'buyer.email', in: 'body', label: 'Buyer email', placeholder: 'buyer@example.com', required: true },
      { key: 'buyer.name', in: 'body', label: 'Buyer name', placeholder: 'Jane Smith', required: false },
      { key: 'idempotency_key', in: 'idempotency', label: 'Idempotency Key', placeholder: 'order-uuid-here', required: true },
    ],
  },
  {
    group: 'Buy (MoR)',
    label: 'List orders',
    method: 'GET',
    path: '/api/partner/v1/orders',
    desc: 'List all partner-collected orders, newest first. Shows domain, status, sale price, commission.',
    fields: [
      { key: 'status', in: 'query', label: 'Status filter', placeholder: 'PAID | TRANSFERRED | CANCELLED', required: false },
      { key: 'limit', in: 'query', label: 'Limit', placeholder: '20', required: false },
      { key: 'offset', in: 'query', label: 'Offset', placeholder: '0', required: false },
    ],
  },
  {
    group: 'Buy (MoR)',
    label: 'Order by ID',
    method: 'GET',
    path: '/api/partner/v1/orders/:order_id',
    desc: 'Fetch a single order — useful for polling transfer status.',
    fields: [
      { key: ':order_id', in: 'path', label: 'Order ID', placeholder: 'ord_…', required: true },
    ],
  },

  /* ── PAY WITH NAME.AI ───────────────────────────────────────────── */
  {
    group: 'Pay with name.ai',
    label: 'Checkout session',
    method: 'POST',
    path: '/api/partner/v1/checkout-session',
    desc: 'Create a "Pay with name.ai" session. Returns a signed checkout_url — send the buyer there, name.ai collects payment and credits your commission. Works for both MoR and non-MoR partners.',
    fields: [
      { key: 'domain', in: 'body', label: 'Domain', placeholder: 'e.g. example.ai', required: true },
      { key: 'return_url', in: 'body', label: 'Return URL', placeholder: 'https://yoursite.com/success', required: false },
      { key: 'cancel_url', in: 'body', label: 'Cancel URL', placeholder: 'https://yoursite.com', required: false },
    ],
  },

  /* ── BROKERAGE ──────────────────────────────────────────────────── */
  {
    group: 'Brokerage',
    label: 'Check eligibility',
    method: 'GET',
    path: '/api/partner/v1/brokerage/eligibility',
    desc: 'Check if a domain is eligible for name.ai brokerage. Ineligible if it runs an active live site or already has an open case.',
    fields: [
      { key: 'domain', in: 'query', label: 'Domain', placeholder: 'e.g. targetdomain.com', required: true },
    ],
  },
  {
    group: 'Brokerage',
    label: 'Create case',
    method: 'POST',
    path: '/api/partner/v1/brokerage',
    desc: 'Open a brokerage case — name.ai negotiates acquisition of a domain on the buyer\'s behalf. Returns a no-login progress link for the buyer.',
    fields: [
      { key: 'domain', in: 'body', label: 'Domain to acquire', placeholder: 'targetdomain.com', required: true },
      { key: 'tier', in: 'body', label: 'Tier', placeholder: 'managed | self_serve', required: true },
      { key: 'buyer_email', in: 'body', label: 'Buyer email', placeholder: 'buyer@example.com', required: true },
      { key: 'offer_price', in: 'body', label: 'Starting offer (USD)', placeholder: '5000', required: false },
    ],
  },
  {
    group: 'Brokerage',
    label: 'Case by ID',
    method: 'GET',
    path: '/api/partner/v1/brokerage/:case_id',
    desc: 'Fetch current status and timeline of a brokerage case. Poll this or listen for the case_completed webhook.',
    fields: [
      { key: ':case_id', in: 'path', label: 'Case ID', placeholder: 'bc_…', required: true },
    ],
  },

  /* ── SETTLEMENT ─────────────────────────────────────────────────── */
  {
    group: 'Settlement',
    label: 'Settlements',
    method: 'GET',
    path: '/api/partner/v1/settlements',
    desc: 'List all settled payouts name.ai has sent to your account. Runs on the 1st and 15th monthly, 45 days after each sale.',
    fields: [
      { key: 'limit', in: 'query', label: 'Limit', placeholder: '20', required: false },
      { key: 'offset', in: 'query', label: 'Offset', placeholder: '0', required: false },
    ],
  },
  {
    group: 'Settlement',
    label: 'Transactions',
    method: 'GET',
    path: '/api/partner/v1/transactions',
    desc: 'Full sales history — every domain sold through your attribution. Shows sale price, your commission, and settlement status.',
    fields: [
      { key: 'status', in: 'query', label: 'Status filter', placeholder: 'pending | accrued | settled', required: false },
      { key: 'limit', in: 'query', label: 'Limit', placeholder: '20', required: false },
    ],
  },

  /* ── REFERRAL ───────────────────────────────────────────────────── */
  {
    group: 'Referral',
    label: 'Create link',
    method: 'POST',
    path: '/api/partner/v1/links',
    desc: 'Create a tracked referral link. Buyers who click it and purchase earn you a commission — no Stripe needed.',
    fields: [
      { key: 'target_type', in: 'body', label: 'Target type', placeholder: 'generic | domain', required: true },
      { key: 'domain', in: 'body', label: 'Domain (if target_type=domain)', placeholder: 'example.ai', required: false },
      { key: 'label', in: 'body', label: 'Internal label', placeholder: 'My campaign', required: false },
    ],
  },
  {
    group: 'Referral',
    label: 'List links',
    method: 'GET',
    path: '/api/partner/v1/links',
    desc: 'List all referral links you\'ve created with click and conversion stats.',
    fields: [
      { key: 'limit', in: 'query', label: 'Limit', placeholder: '20', required: false },
    ],
  },
  {
    group: 'Referral',
    label: 'My sales',
    method: 'GET',
    path: '/api/partner/v1/me/sales',
    desc: 'All sales attributed to your referral links — buyer, domain, amount, and commission earned.',
    fields: [],
  },
  {
    group: 'Referral',
    label: 'My commissions',
    method: 'GET',
    path: '/api/partner/v1/me/commissions',
    desc: 'Commission ledger — every commission earned (accrued, pending, paid out), grouped by status.',
    fields: [],
  },
  {
    group: 'Referral',
    label: 'My payouts',
    method: 'GET',
    path: '/api/partner/v1/me/payouts',
    desc: 'All payouts sent to your account with dates and amounts.',
    fields: [],
  },
  {
    group: 'Referral',
    label: 'Analytics',
    method: 'GET',
    path: '/api/partner/v1/analytics',
    desc: 'Aggregated performance: clicks, unique visitors, conversion rate, total revenue, commission earned.',
    fields: [
      { key: 'from', in: 'query', label: 'From date', placeholder: '2026-05-01', required: false },
      { key: 'to', in: 'query', label: 'To date', placeholder: '2026-06-08', required: false },
    ],
  },

  /* ── WEBHOOKS ───────────────────────────────────────────────────── */
  {
    group: 'Webhooks',
    label: 'Events log',
    method: 'GET',
    path: '/api/partner/v1/events',
    desc: 'Recent webhook delivery events — what was sent, when, and whether it succeeded. Events: order.completed, brokerage.case_completed.',
    fields: [
      { key: 'limit', in: 'query', label: 'Limit', placeholder: '20', required: false },
    ],
  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const METHOD_STYLE = {
  GET:  'bg-emerald-100 text-emerald-700',
  POST: 'bg-violet-100 text-violet-700',
  PUT:  'bg-amber-100  text-amber-700',
};

const pretty = (o) => JSON.stringify(o ?? {}, null, 2);

function setNestedKey(obj, dotPath, value) {
  const parts = dotPath.split('.');
  const copy = { ...obj };
  let cur = copy;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = { ...(cur[parts[i]] || {}) };
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  return copy;
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function ConsolePage() {
  const [active, setActive] = useState(APIS[0]);
  const [values, setValues] = useState({});
  const [resp, setResp] = useState(null);
  const [running, setRunning] = useState(false);

  const selectApi = (api) => {
    setActive(api);
    setValues({});
    setResp(null);
  };

  const set = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const run = async () => {
    setRunning(true);
    setResp(null);

    // Build resolved path (replace :param segments)
    let resolvedPath = active.path;
    const query = {};
    const body = {};
    let idempotencyKey = null;

    for (const f of active.fields) {
      const val = (values[f.key] || '').trim();
      if (!val) continue;
      if (f.in === 'path') {
        resolvedPath = resolvedPath.replace(f.key, encodeURIComponent(val));
      } else if (f.in === 'query') {
        query[f.key] = val;
      } else if (f.in === 'body') {
        if (f.key.includes('.')) {
          const parts = f.key.split('.');
          if (!body[parts[0]]) body[parts[0]] = {};
          body[parts[0]][parts[1]] = val;
        } else {
          body[f.key] = isNaN(val) ? val : Number(val);
        }
      } else if (f.in === 'idempotency') {
        idempotencyKey = val;
      }
    }

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: active.method,
          path: resolvedPath,
          query,
          body: active.method !== 'GET' ? body : null,
          idempotencyKey,
        }),
      });
      setResp(await res.json());
    } catch {
      setResp({ error: 'Network error — is the proxy running?' });
    }
    setRunning(false);
  };

  const groups = [...new Set(APIS.map((a) => a.group))];

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900">Partner API console</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">DomainBazaar</span>
          </div>
          <nav className="flex gap-5 text-sm font-medium text-gray-500">
            <Link href="/mor" className="hover:text-violet-600 transition-colors">MoR</Link>
            <Link href="/non-mor" className="hover:text-violet-600 transition-colors">Non-MoR</Link>
            <Link href="/console" className="text-violet-600 font-semibold">API console</Link>
          </nav>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-6 gap-5">

        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 px-1">{g}</div>
              <div className="flex flex-col gap-0.5">
                {APIS.filter((a) => a.group === g).map((a) => (
                  <button
                    key={a.label}
                    onClick={() => selectApi(a)}
                    className={`text-left w-full px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2
                      ${active?.label === a.label
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'}`}
                  >
                    <span className={`text-[9px] font-bold font-mono shrink-0 px-1 py-0.5 rounded
                      ${active?.label === a.label
                        ? 'bg-white/20 text-white'
                        : (METHOD_STYLE[a.method] || 'bg-gray-100 text-gray-500')}`}>
                      {a.method}
                    </span>
                    <span className="leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Main panel ── */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Endpoint header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${METHOD_STYLE[active.method]}`}>
                {active.method}
              </span>
              <code className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                {active.path}
              </code>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">{active.label}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{active.desc}</p>
          </div>

          {/* Parameters form */}
          {active.fields.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Parameters</div>
              <div className="space-y-3">
                {active.fields.map((f) => (
                  <div key={f.key} className="grid grid-cols-[180px_1fr_60px] gap-3 items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{f.label}</div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {f.in === 'path' ? 'path param' : f.in === 'idempotency' ? 'header' : f.in}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={values[f.key] || ''}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-gray-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 px-3 py-2 text-sm font-mono outline-none transition-all"
                    />
                    <span className={`text-center text-[10px] font-bold uppercase px-2 py-1 rounded-full ${f.required ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                      {f.required ? 'req' : 'opt'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Run button */}
          <button
            onClick={run}
            disabled={running}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {running ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Running…
              </>
            ) : `▶  Run ${active.method} ${active.label}`}
          </button>

          {/* Response */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Response</div>
              {resp && !resp.error && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">200 OK</span>
              )}
              {resp?.error && (
                <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Error</span>
              )}
            </div>
            <pre className="rounded-lg bg-gray-950 text-emerald-300 text-xs p-4 overflow-auto max-h-[480px] leading-relaxed">
              {resp ? pretty(resp) : '// Fill in the parameters above and click Run.'}
            </pre>
          </div>
        </main>
      </div>
    </div>
  );
}
