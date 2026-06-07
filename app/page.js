'use client';

import { useState, useCallback } from 'react';

function formatPrice(dollars) {
  return '$' + Number(dollars).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
        D
      </div>
      <span className="text-2xl font-bold tracking-tight">
        Domain<span className="text-violet-600">Bazaar</span>
      </span>
    </div>
  );
}

function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex rounded-2xl shadow-lg shadow-violet-100 overflow-hidden border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-violet-400 transition-shadow">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a domain name..."
          className="flex-1 px-6 py-4 text-lg outline-none bg-transparent placeholder:text-gray-400"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="px-8 py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Searching
            </span>
          ) : (
            'Search'
          )}
        </button>
      </div>
    </form>
  );
}

function DomainCard({ domain, price, makeOffer }) {
  const [buying, setBuying] = useState(false);
  const [err, setErr] = useState('');

  const handleBuy = async () => {
    if (makeOffer) return;
    setBuying(true);
    setErr('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url; // → Stripe Checkout
        return;
      }
      setErr(data.error || 'Could not start checkout.');
    } catch {
      setErr('Network error. Please try again.');
    }
    setBuying(false);
  };

  const parts = domain.split('.');
  const name = parts.slice(0, -1).join('.');
  const tld = parts[parts.length - 1];

  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4">
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 break-all">
          {name}<span className="text-violet-600">.{tld}</span>
        </h3>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          {makeOffer ? (
            <span className="text-lg font-semibold text-amber-600">Make offer</span>
          ) : (
            <span className="text-2xl font-bold text-gray-900">{formatPrice(price)}</span>
          )}
        </div>
        <button
          onClick={handleBuy}
          disabled={buying}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {makeOffer ? 'Make Offer' : buying ? 'Redirecting…' : 'Buy Now'}
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

export default function Home() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState('');

  const handleSearch = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSearchedQuery(q);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setResults(data.results || []);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <nav className="flex gap-4 text-sm font-medium text-gray-600">
            <a href="/mor" className="hover:text-violet-600">MoR demo</a>
            <a href="/non-mor" className="hover:text-violet-600">Non-MoR demo</a>
            <a href="/console" className="hover:text-violet-600">API console</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="pt-16 pb-10 px-6">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Find your perfect <span className="text-violet-600">domain</span>
            </h1>
            <p className="text-lg text-gray-500">
              Search thousands of premium domains. Your brand starts here.
            </p>
          </div>
          <SearchBar onSearch={handleSearch} loading={loading} />
        </section>

        {/* Results */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <p className="text-gray-400 text-sm">Searching domains...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="max-w-md mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl px-6 py-4 text-center">
              {error}
            </div>
          )}

          {/* No results */}
          {results && results.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">No matching domains found for &quot;{searchedQuery}&quot;</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search term.</p>
            </div>
          )}

          {/* Result cards */}
          {results && results.length > 0 && !loading && (
            <>
              <p className="text-sm text-gray-400 mb-6">
                {results.length} domain{results.length !== 1 ? 's' : ''} found for &quot;{searchedQuery}&quot;
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map((r) => (
                  <DomainCard key={r.domain} {...r} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} DomainBazaar. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
