'use client';

import { useEffect, useState } from 'react';

export default function SuccessPage() {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get('session_id');
    if (!sid) {
      setState({ loading: false, error: 'Missing checkout session.' });
      return;
    }
    fetch(`/api/confirm?session_id=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((d) => setState({ loading: false, ...d }))
      .catch(() => setState({ loading: false, error: 'Could not confirm your order. Please contact support.' }));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-violet-50 to-white">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-lg p-8 text-center">
        {state.loading && (
          <>
            <svg className="animate-spin h-10 w-10 text-violet-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-gray-500">Confirming your purchase…</p>
          </>
        )}

        {!state.loading && state.recorded && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment successful 🎉</h1>
            <p className="text-gray-600">
              You now own <span className="font-semibold text-violet-600">{state.domain}</span>.
            </p>
            <p className="text-sm text-gray-400 mt-3">
              Order <span className="font-mono">{state.order?.id}</span> · we&apos;ll deliver your domain shortly.
            </p>
          </>
        )}

        {!state.loading && state.paid && !state.recorded && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment received</h1>
            <p className="text-gray-600">
              Your payment for <span className="font-semibold">{state.domain}</span> went through, but we hit a
              snag finalizing the order. Our team has been notified.
            </p>
            <p className="text-xs text-gray-400 mt-3">{state.error}</p>
          </>
        )}

        {!state.loading && !state.paid && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600">{state.error || 'We could not confirm your payment.'}</p>
          </>
        )}

        <a href="/" className="inline-block mt-7 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors">
          Back to search
        </a>
      </div>
    </div>
  );
}
