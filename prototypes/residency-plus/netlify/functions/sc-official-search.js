/**
 * sc-official-search.js — Protected SoundCloud search via official OAuth API.
 */

const { getAccessToken, allowOrigin, checkRateLimit, json, logTelemetry } = require("./sc-auth-lib.js");

const _SAFE_FIELDS = [
    "id", "title", "permalink_url", "genre", "artwork_url",
    "playback_count", "favoritings_count", "comment_count",
    "duration", "created_at",
    "bpm",
];

function shapeTrack(raw) {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    for (const f of _SAFE_FIELDS) out[f] = raw[f] ?? null;
    out.username = raw.user?.username ?? raw.username ?? null;
    out.user_permalink_url = raw.user?.permalink_url ?? null;
    return out;
}

exports.handler = async function (event, context) {
    const startMs = Date.now();
    const method = event.httpMethod;
    const headers = event.headers || {};
    const origin = headers.origin || headers.Origin;

    // 1. Dev Fixture Mode bypass
    if (process.env.DEV_FIXTURE_MODE === "true") {
        try {
            const fs = require("node:fs");
            const path = require("node:path");
            const fixturePath = path.resolve(process.cwd(), "netlify/functions/fixtures/search-ambient.json");
            const raw = fs.readFileSync(fixturePath, "utf8");
            const data = JSON.parse(raw);
            return json(200, { collection: data.map(shapeTrack).filter(Boolean) }, "*");
        } catch (e) {
            return json(500, { error: "Fixture mode enabled but fixture file missing.", detail: e.message });
        }
    }

    // 2. OPTIONS preflight
    if (method === "OPTIONS") {
        const allowed = allowOrigin(origin);
        if (!allowed) return { statusCode: 204 };
        return {
            statusCode: 204,
            headers: {
                "access-control-allow-origin": allowed,
                "access-control-allow-headers": "content-type",
                "access-control-allow-methods": "GET,OPTIONS",
                "vary": "Origin",
            },
        };
    }

    logTelemetry("sc_search_request", { endpoint: "sc-official-search", origin });

    const allowed = allowOrigin(origin);
    if (origin && !allowed) {
        const status_code = 403;
        logTelemetry("origin_forbidden", { endpoint: "sc-official-search", origin, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Origin not permitted." });
    }

    // 3. Rate limit
    const rlKey = allowed || "no-origin";
    const rl = checkRateLimit(rlKey);
    if (!rl.ok) {
        const status_code = 429;
        logTelemetry("rate_limit_block", { endpoint: "sc-official-search", origin: allowed, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Rate limit exceeded. Try again later.", retryAfter: rl.retryAfter }, allowed);
    }

    // 4. Params
    const q = (event.queryStringParameters.q || "").trim();
    const limit = Math.min(20, Math.max(1, parseInt(event.queryStringParameters.limit || "10", 10)));
    const query_length = q.length;

    if (!q) {
        const status_code = 400;
        logTelemetry("sc_search_error", { endpoint: "sc-official-search", origin: allowed, status_code, query_length, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Missing required param: q" }, allowed);
    }

    // 5. Fetch token
    let token;
    try {
        token = await getAccessToken();
    } catch (err) {
        const status_code = 400;
        logTelemetry("sc_search_error", { endpoint: "sc-official-search", origin: allowed, status_code, query_length, duration_ms: Date.now() - startMs });
        return json(status_code, { error: err.message }, allowed);
    }

    // 6. Call official API
    const apiUrl = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(q)}&limit=${limit}`;

    let upstream;
    try {
        upstream = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json; charset=utf-8",
            },
        });
    } catch (e) {
        const status_code = 502;
        logTelemetry("sc_search_error", { endpoint: "sc-official-search", origin: allowed, status_code, query_length, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Upstream request failed — network error." }, allowed);
    }

    if (upstream.status === 429) {
        return json(429, { error: "Upstream rate limit. Try again later." }, allowed);
    }
    if (!upstream.ok) {
        const status_code = 502;
        logTelemetry("sc_search_error", { endpoint: "sc-official-search", origin: allowed, status_code, query_length, upstream_status: upstream.status, duration_ms: Date.now() - startMs });
        return json(status_code, { error: `Upstream error (HTTP ${upstream.status}).` }, allowed);
    }

    let data;
    try {
        data = await upstream.json();
    } catch (e) {
        const status_code = 502;
        return json(status_code, { error: "Upstream returned invalid JSON." }, allowed);
    }

    const collection = Array.isArray(data) ? data : (data.collection ?? []);
    const shaped = collection.map(shapeTrack).filter(Boolean);

    logTelemetry("sc_search_success", { endpoint: "sc-official-search", origin: allowed, status_code: 200, query_length, upstream_status: 200, duration_ms: Date.now() - startMs });
    return json(200, { collection: shaped }, allowed);
};

