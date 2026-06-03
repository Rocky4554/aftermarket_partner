import crypto from 'crypto';

const EMPTY_SHA256 = crypto.createHash('sha256').update('').digest('hex');

// Encode a query component the SAME way the server does:
// encodeURIComponent, then also percent-encode ! ' ( ) *
function encodeQueryComponent(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

// Canonical query string: params SORTED by key, then by value; each key & value
// encoded with encodeQueryComponent; joined with '&'. Empty -> ''.
function canonicalizeQuery(searchParams) {
  const entries = Array.from(searchParams.entries()).sort(([ak, av], [bk, bv]) =>
    ak === bk ? av.localeCompare(bv) : ak.localeCompare(bk),
  );
  return entries
    .map(([k, v]) => `${encodeQueryComponent(k)}=${encodeQueryComponent(v)}`)
    .join('&');
}

// For GET there is no body, so bodyHash = sha256('') = EMPTY_SHA256.
export function signSearchRequest({ secret, method, pathname, searchParams, timestamp, nonce }) {
  const canonicalString = [
    method.toUpperCase(),           // "GET"
    pathname || '/',                // "/api/partner/v1/domains/search"
    canonicalizeQuery(searchParams),// "limit=20&q=raunak.com"
    String(timestamp),              // unix seconds
    String(nonce),                  // uuid
    EMPTY_SHA256,                   // body hash (empty for GET)
  ].join('\n');

  const hex = crypto.createHmac('sha256', secret).update(canonicalString).digest('hex');
  return `v1=${hex}`;
}
