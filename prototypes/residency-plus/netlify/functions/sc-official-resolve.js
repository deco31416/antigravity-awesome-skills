/**
 * sc-official-resolve.js — Protected SoundCloud URL resolver via official OAuth API.
 */

const { getAccessToken, allowOrigin, checkRateLimit, json, logTelemetry } = require("./sc-auth-lib.js");

const _SAFE_TRACK_FIELDS = [
    "id", "kind", "title", "permalink_url", "genre", "artwork_url",
    "playback_count", "favoritings_count", "comment_count",
    "duration", "created_at",
    "bpm",
];
const _SAFE_PLAYLIST_FIELDS = ["id", "kind", "title", "permalink_url", "genre", "artwork_url", "track_count", "duration", "created_at"];
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
    out.user_permalink_url = raw.user?.permalink_url ?? null;
    return out;
}

exports.handler = async function (event, context) {
    const startMs = Date.now();
    const method = event.httpMethod;
    const headers = event.headers || {};
    const origin = headers.origin || headers.Origin;

    // 1. Dev Fixture Mode
    if (process.env.DEV_FIXTURE_MODE === "true") {
        try {
            const fs = require("node:fs");
            const path = require("node:path");
            const fixturePath = path.resolve(process.cwd(), "netlify/functions/fixtures/resolve-sample.json");
            const raw = fs.readFileSync(fixturePath, "utf8");
            const data = JSON.parse(raw);
            return json(200, shapeResource(data), "*");
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

    logTelemetry("sc_resolve_request", { endpoint: "sc-official-resolve", origin });

    const allowed = allowOrigin(origin);
    if (origin && !allowed) {
        const status_code = 403;
        logTelemetry("origin_forbidden", { endpoint: "sc-official-resolve", origin, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Origin not permitted." });
    }

    // 3. Rate limit
    const rlKey = allowed || "no-origin";
    const rl = checkRateLimit(rlKey);
    if (!rl.ok) {
        const status_code = 429;
        logTelemetry("rate_limit_block", { endpoint: "sc-official-resolve", origin: allowed, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Rate limit exceeded. Try again later.", retryAfter: rl.retryAfter }, allowed);
    }

    // 4. Params
    const scUrl = (event.queryStringParameters.url || "").trim();
    if (!scUrl) {
        const status_code = 400;
        logTelemetry("sc_resolve_error", { endpoint: "sc-official-resolve", origin: allowed, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Missing required param: url" }, allowed);
    }

    if (!scUrl.startsWith("https://soundcloud.com/")) {
        const status_code = 400;
        logTelemetry("sc_resolve_error", { endpoint: "sc-official-resolve", origin: allowed, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Invalid SoundCloud URL. Must start with https://soundcloud.com/" }, allowed);
    }

    // 5. Fetch token
    let token;
    try {
        token = await getAccessToken();
    } catch (err) {
        const status_code = 400;
        logTelemetry("sc_resolve_error", { endpoint: "sc-official-resolve", origin: allowed, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: err.message }, allowed);
    }

    // 6. Call official API
    const apiUrl = `https://api.soundcloud.com/resolve?url=${encodeURIComponent(scUrl)}`;

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
        logTelemetry("sc_resolve_error", { endpoint: "sc-official-resolve", origin: allowed, status_code, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Upstream request failed — network error." }, allowed);
    }

    if (upstream.status === 404) {
        logTelemetry("sc_resolve_404", { endpoint: "sc-official-resolve", origin: allowed, status_code: 404, duration_ms: Date.now() - startMs });
        return json(404, { error: "SoundCloud resource not found." }, allowed);
    }

    if (!upstream.ok) {
        const status_code = 502;
        logTelemetry("sc_resolve_error", { endpoint: "sc-official-resolve", origin: allowed, status_code, upstream_status: upstream.status, duration_ms: Date.now() - startMs });
        return json(status_code, { error: `Upstream error (HTTP ${upstream.status}).` }, allowed);
    }

    let data;
    try {
        data = await upstream.json();
    } catch (e) {
        const status_code = 502;
        logTelemetry("sc_resolve_error", { endpoint: "sc-official-resolve", origin: allowed, status_code, upstream_status: upstream.status, duration_ms: Date.now() - startMs });
        return json(status_code, { error: "Upstream returned invalid JSON." }, allowed);
    }

    logTelemetry("sc_resolve_success", { endpoint: "sc-official-resolve", origin: allowed, status_code: 200, upstream_status: 200, duration_ms: Date.now() - startMs });
    return json(200, shapeResource(data), allowed);
};

