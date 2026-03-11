/**
 * sc-auth-lib.js — Shared helpers for official SoundCloud OAuth wrapper functions.
 *
 * This file is NOT a Netlify function handler. It exports utilities imported
 * by sc-official-search.js and sc-official-resolve.js.
 *
 * Security rules enforced here:
 *   - Credentials read from process.env only
 *   - Token cached in memory, never logged
 *   - Authorization headers never appear in logs or responses
 *   - Errors are sanitized before returning to callers
 */

// ── Env validation ────────────────────────────────────────────────────────────

const _clientId = process.env.SOUNDCLOUD_CLIENT_ID;
const _clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;

function _credsMissing() {
  const badId = !_clientId || _clientId.trim() === "" || _clientId === "YOUR_CLIENT_ID";
  const badSec = !_clientSecret || _clientSecret.trim() === "" || _clientSecret === "YOUR_CLIENT_SECRET";
  return { badId, badSec, any: badId || badSec };
}

// ── In-memory token cache ─────────────────────────────────────────────────────

let _cachedToken = null;
let _tokenExpiry = 0;     // Unix ms

/**
 * Returns a valid Bearer access token, fetching a new one when the cached
 * token is expired or missing. Token value is never logged.
 * @returns {Promise<string>}
 */
export async function getAccessToken() {
  const { any, badId, badSec } = _credsMissing();
  if (any) {
    const which = [badId && "SOUNDCLOUD_CLIENT_ID", badSec && "SOUNDCLOUD_CLIENT_SECRET"]
      .filter(Boolean).join(", ");
    throw new Error(`[sc-auth-lib] Missing required env var(s): ${which}. Set them in your .env or Netlify environment variables.`);
  }

  // Return cached token if still valid (expire 30 s early)
  if (_cachedToken && Date.now() < _tokenExpiry - 30_000) {
    return _cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: _clientId,
    client_secret: _clientSecret,
  });

  let res;
  try {
    res = await fetch("https://api.soundcloud.com/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    throw new Error("[sc-auth-lib] Token request failed — network error");
  }

  if (!res.ok) {
    throw new Error(`[sc-auth-lib] Token request failed — HTTP ${res.status}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("[sc-auth-lib] Token response was not valid JSON");
  }

  if (!data.access_token) {
    throw new Error("[sc-auth-lib] Token response missing access_token field");
  }

  // Store in memory only — never log the value
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + (parseInt(data.expires_in, 10) || 3600) * 1000;

  return _cachedToken;
}

// ── Origin allowlist ──────────────────────────────────────────────────────────

/**
 * Returns the origin string if allowed, or null if rejected.
 * Reads ALLOWED_ORIGINS env var (comma-separated).
 * Automatically permits ANY localhost/127.0.0.1 port to prevent local dev port
 * drift (e.g. localhost:8889) from silently breaking requests.
 * @param {string|null} origin
 * @returns {string|null}
 */
export function allowOrigin(origin) {
  if (!origin) return null;
  const o = origin.trim().toLowerCase();

  // 1. Dynamic Localhost wildcard
  if (o.startsWith("http://localhost:") || o.startsWith("http://127.0.0.1:")) {
    return origin; // preserve exact matching casing
  }

  // 2. Production .env ALLOWED_ORIGINS
  const envOrigins = (process.env.ALLOWED_ORIGINS || "").split(",")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);

  if (envOrigins.includes(o)) {
    return origin;
  }

  return null;
}

// ── Rate limiting (in-memory, best-effort MVP) ────────────────────────────────

/**
 * Simple rolling-window rate limiter.
 * 30 requests per 5-minute window per key (origin or IP).
 */
const _WINDOW_MS = 5 * 60 * 1000;   // 5 minutes
const _WINDOW_LIMIT = 30;
const _rateBuckets = new Map();        // key → number[]  (timestamps)

/**
 * @param {string} key  — typically origin or remote IP
 * @returns {{ ok: boolean, retryAfter: number }}
 */
export function checkRateLimit(key) {
  const now = Date.now();
  const hits = (_rateBuckets.get(key) || []).filter(t => now - t < _WINDOW_MS);
  hits.push(now);
  _rateBuckets.set(key, hits);

  if (hits.length > _WINDOW_LIMIT) {
    const oldest = hits[0];
    const retryAfter = Math.ceil((_WINDOW_MS - (now - oldest)) / 1000);
    return { ok: false, retryAfter };
  }
  return { ok: true, retryAfter: 0 };
}

// ── Response helpers ──────────────────────────────────────────────────────────

/**
 * Build a JSON Response with correct CORS headers for the allowed origin.
 * @param {number}      status
 * @param {object}      body
 * @param {string|null} allowedOrigin
 * @returns {Response}
 */
export function json(status, body, allowedOrigin = null) {
  const headers = { "content-type": "application/json" };
  if (allowedOrigin) {
    headers["access-control-allow-origin"] = allowedOrigin;
    headers["access-control-allow-headers"] = "content-type";
    headers["access-control-allow-methods"] = "GET,OPTIONS";
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

// ── Telemetry (G2 Scaffold) ───────────────────────────────────────────────────

/**
 * Lightweight structured logger for official wrapper telemetry.
 * Output is captured by Netlify Function Logs natively.
 * 
 * If Axiom variables are configured (AXIOM_API_TOKEN, AXIOM_DATASET, AXIOM_DOMAIN),
 * the sanitized JSON payload is also forwarded to the Axiom dataset via a 
 * non-blocking HTTP POST.
 * 
 * @param {string} eventName   - String event identifier (e.g. 'sc_search_request')
 * @param {object} payload     - Contextual data (no secrets, no raw queries/urls)
 */
export function logTelemetry(eventName, payload = {}) {
  const entry = {
    _telemetry: true,
    event: eventName,
    timestamp: new Date().toISOString(),
    ...payload
  };

  const jsonString = JSON.stringify(entry);

  // 1. Always log locally for Netlify Runtime Logs
  console.log(jsonString);

  // 2. Axiom External Sink Forwarding (if configured)
  const axiomToken = process.env.AXIOM_API_TOKEN;
  const axiomDataset = process.env.AXIOM_DATASET;
  const axiomDomain = process.env.AXIOM_DOMAIN;

  if (axiomToken && axiomDataset && axiomDomain) {
    const ingestUrl = `https://${axiomDomain}/v1/ingest/${axiomDataset}`;

    // Fire-and-forget: we do not await this, so we don't block the client response.
    // Netlify functions normally allow background promises to finish shortly after return.
    fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${axiomToken}`
      },
      // Axiom /v1/ingest/:dataset accepts an array of events
      body: JSON.stringify([entry])
    }).catch(err => {
      // Swallow forwarding errors silently to protect core functionality
      console.warn(`[TELEMETRY_WARN] Failed to forward telemetry to Axiom: ${err.message}`);
    });
  }
}
