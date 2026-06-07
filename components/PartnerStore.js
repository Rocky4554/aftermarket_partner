'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

function formatPrice(dollars) {
  return '$' + Number(dollars).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

/**
 * DomainCard with both purchase paths:
 *  - "Buy Now"          → partner-collected (this app is MoR; Stripe on us)   [mode='mor']
 *  - "Pay with name.ai" → name.ai-collected (redirect to name.ai lander)      [both modes]
 *
 * A non-MoR partner can ONLY offer "Pay with name.ai".
 */
function DomainCard({ domain, price, makeOffer, mode }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const buyNow = async () => {
    if (makeOffer) return;
    setBusy('buy'); setErr('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setErr(data.error || 'Could not start checkout.');
    } catch { setErr('Network error.'); }
    setBusy('');
  };

  const payWithNameai = async () => {
    setBusy('nameai'); setErr('');
    try {
      const res = await fetch('/api/nameai-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (res.ok && data.checkout_url) { window.location.href = data.checkout_url; return; }
      setErr(data.error || 'Could not start name.ai checkout.');
    } catch { setErr('Network error.'); }
    setBusy('');
  };

  const parts = domain.split('.');
  const name = parts.slice(0, -1).join('.');
  const tld = parts[parts.length - 1];
  const isMor = mode === 'mor';

  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4">
      <h3 className="text-xl font-bold text-gray-900 break-all">
        {name}<span className="text-violet-600">.{tld}</span>
      </h3>

      {/* MoR partners see the price; a non-MoR partner sends the buyer to name.ai
          to see the price + pay. */}
      {isMor ? (
        <div className="text-2xl font-bold text-gray-900">
          {makeOffer ? <span className="text-lg text-amber-600">Make offer</span> : formatPrice(price)}
        </div>
      ) : (
        <div className="text-sm text-gray-400">Price &amp; checkout on name.ai</div>
      )}

      <div className="flex flex-col gap-2">
        {isMor && !makeOffer && (
          <button
            onClick={buyNow}
            disabled={!!busy}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            {busy === 'buy' ? 'Redirecting…' : 'Buy Now'}
          </button>
        )}
        <button
          onClick={payWithNameai}
          disabled={!!busy}
          className="px-5 py-2.5 rounded-xl border border-violet-600 text-violet-700 hover:bg-violet-50 disabled:opacity-50 font-semibold text-sm transition-colors cursor-pointer"
        >
          {busy === 'nameai' ? 'Redirecting…' : 'Pay with name.ai'}
        </button>
      </div>

      {err && (
        <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg max-w-[80%]">
          {err}
        </div>
      )}
    </div>
  );
}

export default function PartnerStore({ mode = 'mor', heading, subtitle, accent = 'violet' }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState('');

  const search = useCallback(async (query) => {
    setLoading(true); setError(null); setResults(null); setSearched(query);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setResults(data.results || []);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            Domain<span className="text-violet-600">Bazaar</span>
            <span className={`ml-2 align-middle text-[11px] font-semibold uppercase rounded-full px-2 py-0.5 ${mode === 'mor' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {mode === 'mor' ? 'MoR partner' : 'non-MoR partner'}
            </span>
          </span>
          <nav className="flex gap-4 text-sm font-medium text-gray-600">
            <Link href="/mor" className="hover:text-violet-600">MoR</Link>
            <Link href="/non-mor" className="hover:text-violet-600">Non-MoR</Link>
            <Link href="/console" className="hover:text-violet-600">API console</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="pt-14 pb-8 px-6">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              {heading || 'Find your perfect domain'}
            </h1>
            <p className="text-gray-500">{subtitle || 'Search premium domains.'}</p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 2) search(q.trim()); }}
            className="w-full max-w-2xl mx-auto"
          >
            <div className="flex rounded-2xl shadow-lg shadow-violet-100 overflow-hidden border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-violet-400">
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search for a domain name..."
                className="flex-1 px-6 py-4 text-lg outline-none bg-transparent placeholder:text-gray-400"
                autoFocus
              />
              <button type="submit" disabled={loading || q.trim().length < 2}
                className="px-8 py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-lg cursor-pointer">
                {loading ? 'Searching' : 'Search'}
              </button>
            </div>
          </form>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          {error && !loading && (
            <div className="max-w-md mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-4 text-center">{error}</div>
          )}
          {results && results.length === 0 && !loading && (
            <p className="text-center py-16 text-gray-400">No matching domains for &quot;{searched}&quot;.</p>
          )}
          {results && results.length > 0 && !loading && (
            <>
              <p className="text-sm text-gray-400 mb-6">{results.length} domain(s) for &quot;{searched}&quot;</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map((r) => <DomainCard key={r.domain} {...r} mode={mode} />)}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
