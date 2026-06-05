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
  return signRequest({ secret, method, pathname, searchParams, timestamp, nonce, body: '' });
}

/**
 * General request signer — handles GET (empty body) AND POST (sha256 of the exact
 * JSON body string you send). The `body` MUST be the identical string passed as
 * the request body, or the signature won't match.
 */
export function signRequest({ secret, method, pathname, searchParams, timestamp, nonce, body = '' }) {
  const bodyHash = body
    ? crypto.createHash('sha256').update(body).digest('hex')
    : EMPTY_SHA256;
  const canonicalString = [
    method.toUpperCase(),
    pathname || '/',
    canonicalizeQuery(searchParams || new URLSearchParams()),
    String(timestamp),
    String(nonce),
    bodyHash,
  ].join('\n');
  const hex = crypto.createHmac('sha256', secret).update(canonicalString).digest('hex');
  return `v1=${hex}`;
}
