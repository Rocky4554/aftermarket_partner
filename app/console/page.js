'use client';

import { useState } from 'react';
import Link from 'next/link';

// Presets covering the whole partner flow. Click one to load it, edit, Run.
const PRESETS = [
  { group: 'Discovery', label: 'Search', method: 'GET', path: '/api/partner/v1/domains/search', query: { q: 'ai' } },
  { group: 'Discovery', label: 'Domain detail', method: 'GET', path: '/api/partner/v1/domains/example.ai', query: {} },
  { group: 'Discovery', label: 'Availability', method: 'GET', path: '/api/partner/v1/availability', query: { domain: 'example.ai' } },
  { group: 'Discovery', label: 'Pricing', method: 'GET', path: '/api/partner/v1/pricing', query: { domain: 'example.ai' } },
  { group: 'Buy (MoR)', label: 'Quote', method: 'POST', path: '/api/partner/v1/quotes', body: { domain: 'example.ai' } },
  { group: 'Buy (MoR)', label: 'Record order', method: 'POST', path: '/api/partner/v1/orders', body: { quote_id: 'PASTE_QUOTE_ID', external_payment_ref: 'pi_test_123', buyer: { email: 'buyer@example.com' } }, idempotencyKey: 'demo-order-1' },
  { group: 'Buy (MoR)', label: 'List orders', method: 'GET', path: '/api/partner/v1/orders', query: {} },
  { group: 'Buy (MoR)', label: 'Order by id', method: 'GET', path: '/api/partner/v1/orders/PASTE_ORDER_ID', query: {} },
  { group: 'Pay with name.ai', label: 'Checkout session', method: 'POST', path: '/api/partner/v1/checkout-session', body: { domain: 'example.ai' } },
  { group: 'Brokerage', label: 'Eligibility', method: 'GET', path: '/api/partner/v1/brokerage/eligibility', query: { domain: 'example.ai' } },
  { group: 'Brokerage', label: 'Create case', method: 'POST', path: '/api/partner/v1/brokerage', body: { domain: 'example.ai', tier: 'managed', buyer_email: 'buyer@example.com', offer_price: 5000 } },
  { group: 'Brokerage', label: 'Case by id', method: 'GET', path: '/api/partner/v1/brokerage/PASTE_CASE_ID', query: {} },
  { group: 'Settlement', label: 'Settlements', method: 'GET', path: '/api/partner/v1/settlements', query: {} },
  { group: 'Settlement', label: 'Transactions', method: 'GET', path: '/api/partner/v1/transactions', query: {} },
  { group: 'Referral', label: 'Create link', method: 'POST', path: '/api/partner/v1/links', body: { target_type: 'generic' } },
  { group: 'Referral', label: 'List links', method: 'GET', path: '/api/partner/v1/links', query: {} },
  { group: 'Referral', label: 'My sales', method: 'GET', path: '/api/partner/v1/me/sales', query: {} },
  { group: 'Referral', label: 'My commissions', method: 'GET', path: '/api/partner/v1/me/commissions', query: {} },
  { group: 'Referral', label: 'My payouts', method: 'GET', path: '/api/partner/v1/me/payouts', query: {} },
  { group: 'Referral', label: 'Analytics', method: 'GET', path: '/api/partner/v1/analytics', query: {} },
  { group: 'Webhooks', label: 'Events', method: 'GET', path: '/api/partner/v1/events', query: {} },
];

const pretty = (o) => JSON.stringify(o ?? {}, null, 2);

export default function ConsolePage() {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/partner/v1/domains/search');
  const [queryText, setQueryText] = useState('{\n  "q": "ai"\n}');
  const [bodyText, setBodyText] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [resp, setResp] = useState(null);
  const [running, setRunning] = useState(false);

  const load = (p) => {
    setMethod(p.method);
    setPath(p.path);
    setQueryText(p.query ? pretty(p.query) : '');
    setBodyText(p.body ? pretty(p.body) : '');
    setIdempotencyKey(p.idempotencyKey || '');
    setResp(null);
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">Partner API console</span>
          <nav className="flex gap-4 text-sm font-medium text-gray-600">
            <Link href="/mor" className="hover:text-violet-600">MoR</Link>
            <Link href="/non-mor" className="hover:text-violet-600">Non-MoR</Link>
            <Link href="/console" className="text-violet-600">API console</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Presets */}
        <aside className="space-y-4">
          {groups.map((g) => (
            <div key={g}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{g}</div>
              <div className="flex flex-col gap-1">
                {PRESETS.filter((p) => p.group === g).map((p) => (
                  <button key={p.label} onClick={() => load(p)}
                    className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-violet-50 text-gray-700 border border-transparent hover:border-violet-200">
                    <span className="font-mono text-[10px] text-gray-400 mr-1">{p.method}</span>{p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Request builder */}
        <section className="space-y-4">
          <div className="flex gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono">
              {['GET', 'POST', 'PUT'].map((m) => <option key={m}>{m}</option>)}
            </select>
            <input value={path} onChange={(e) => setPath(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
            <button onClick={run} disabled={running}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-sm cursor-pointer">
              {running ? 'Running…' : 'Run'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500">Query (JSON)</label>
              <textarea value={queryText} onChange={(e) => setQueryText(e.target.value)} rows={6}
                className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Body (JSON, POST/PUT)</label>
              <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={6}
                className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Idempotency-Key (orders)</label>
            <input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Response</label>
            <pre className="mt-1 rounded-lg border border-gray-200 bg-gray-900 text-green-200 text-xs p-4 overflow-auto max-h-[420px]">
{resp ? pretty(resp) : '// Pick a preset on the left or build a request, then Run.'}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
