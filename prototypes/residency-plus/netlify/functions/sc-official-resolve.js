/**
 * sc-official-resolve.js — Protected SoundCloud URL resolver via official OAuth API.
 *
 * Endpoint: GET /.netlify/functions/sc-official-resolve
 * Params:
 *   url  (required) — full SoundCloud URL (must begin with https://soundcloud.com)
 *
 * Security:
 *   - Validates Origin against allowlist before processing
 *   - Enforces per-origin rate limiting
 *   - Uses Bearer token (never logged, never in response)
 *   - Returns only safe-shaped fields; never proxies raw upstream
 */

import { getAccessToken, allowOrigin, checkRateLimit, json } from "./sc-auth-lib.js";

const _SAFE_TRACK_FIELDS = ["id", "kind", "title", "permalink_url", "genre", "artwork_url"];
const _SAFE_PLAYLIST_FIELDS = ["id", "kind", "title", "permalink_url", "genre", "artwork_url", "track_count"];
const _SAFE_USER_FIELDS = ["id", "kind", "username", "permalink_url", "avatar_url"];

function shapeResource(raw) {
    if (!raw || typeof raw !== "object") return null;
    const kind = raw.kind ?? "unknown";
    let fields;
    if (kind === "playlist") {
        fields = _SAFE_PLAYLIST_FIELDS;
    } else if (kind === "user") {
        fields = _SAFE_USER_FIELDS;
    } else {
        fields = _SAFE_TRACK_FIELDS;
    }
    const out = { kind };
    for (const f of fields) {
        if (f === "kind") continue;
        out[f] = raw[f] ?? null;
    }
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
    if (origin && !allowed) {
        return json(403, { error: "Origin not permitted." });
    }

    // Rate limit
    const rlKey = allowed || "no-origin";
    const rl = checkRateLimit(rlKey);
    if (!rl.ok) {
        return json(429, { error: "Rate limit exceeded. Try again later.", retryAfter: rl.retryAfter }, allowed);
    }

    // Params
    const reqUrl = new URL(req.url);
    const target = (reqUrl.searchParams.get("url") || "").trim();

    if (!target) {
        return json(400, { error: "Missing required param: url" }, allowed);
    }
    if (!target.startsWith("https://soundcloud.com")) {
        return json(400, { error: "param 'url' must begin with https://soundcloud.com" }, allowed);
    }

    // Fetch token
    let token;
    try {
        token = await getAccessToken();
    } catch (err) {
        return json(400, { error: err.message }, allowed);
    }

    // Call official API
    const apiUrl = new URL("https://api.soundcloud.com/resolve");
    apiUrl.searchParams.set("url", target);

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

    return json(200, shapeResource(data), allowed);
}
