/**
 * sc-official-search.js — Protected SoundCloud search via official OAuth API.
 *
 * Endpoints: GET /.netlify/functions/sc-official-search
 * Params:
 *   q      (required) — search query
 *   limit  (optional, default 10, max 20)
 *
 * Security:
 *   - Validates Origin against allowlist before processing
 *   - Enforces per-origin rate limiting
 *   - Uses Bearer token (never logged, never in response)
 *   - Returns only safe-shaped fields; never proxies raw upstream
 */

import { getAccessToken, allowOrigin, checkRateLimit, json } from "./sc-auth-lib.js";

const _SAFE_FIELDS = ["id", "title", "permalink_url", "genre", "artwork_url"];

function shapeTrack(raw) {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    for (const f of _SAFE_FIELDS) out[f] = raw[f] ?? null;
    out.username = raw.user?.username ?? raw.username ?? null;
    return out;
}

export default async function handler(req) {
    // OPTIONS preflight
    if (req.method === "OPTIONS") {
        const origin = req.headers.get("origin");
        const allowed = allowOrigin(origin);
        if (!allowed) return new Response("", { status: 204 });
        return new Response("", {
            status: 204,
            headers: {
                "access-control-allow-origin": allowed,
                "access-control-allow-headers": "content-type",
                "access-control-allow-methods": "GET,OPTIONS",
                "vary": "Origin",
            },
        });
    }

    // Origin check
    const origin = req.headers.get("origin");
    const allowed = allowOrigin(origin);
    // Allow requests with no Origin header (direct curl / server-to-server) in dev
    if (origin && !allowed) {
        return json(403, { error: "Origin not permitted." });
    }

    // Rate limit by origin (or "no-origin" for direct requests)
    const rlKey = allowed || "no-origin";
    const rl = checkRateLimit(rlKey);
    if (!rl.ok) {
        return json(429, { error: "Rate limit exceeded. Try again later.", retryAfter: rl.retryAfter }, allowed);
    }

    // Params
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

    if (!q) {
        return json(400, { error: "Missing required param: q" }, allowed);
    }

    // Fetch token (cached in memory — never logged)
    let token;
    try {
        token = await getAccessToken();
    } catch (err) {
        return json(400, { error: err.message }, allowed);
    }

    // Call official API
    const apiUrl = new URL("https://api.soundcloud.com/tracks");
    apiUrl.searchParams.set("q", q);
    apiUrl.searchParams.set("limit", String(limit));

    let upstream;
    try {
        upstream = await fetch(apiUrl.toString(), {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json; charset=utf-8",
            },
        });
    } catch {
        return json(502, { error: "Upstream request failed — network error." }, allowed);
    }

    if (upstream.status === 429) {
        return json(429, { error: "Upstream rate limit. Try again later." }, allowed);
    }
    if (!upstream.ok) {
        return json(502, { error: `Upstream error (HTTP ${upstream.status}).` }, allowed);
    }

    let data;
    try {
        data = await upstream.json();
    } catch {
        return json(502, { error: "Upstream returned invalid JSON." }, allowed);
    }

    // data may be an array or { collection: [] }
    const collection = Array.isArray(data) ? data : (data.collection ?? []);
    const shaped = collection.map(shapeTrack).filter(Boolean);

    return json(200, { collection: shaped }, allowed);
}
