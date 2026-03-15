/**
 * search-youtube.js — YouTube discovery adapter for Residency+.
 * Returns normalized { collection: [{ url, title, artist, durationMs, ... }] }.
 * Stub: returns empty collection until YOUTUBE_API_KEY (or Data API v3) is configured.
 */

const { allowOrigin, json } = require("./lib/sc-auth-lib.js");

exports.handler = async function (event) {
  const method = event.httpMethod;
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin;

  if (method === "OPTIONS") {
    const allowed = allowOrigin(origin);
    if (!allowed) return { statusCode: 204 };
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": allowed,
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,OPTIONS",
        vary: "Origin"
      }
    };
  }

  if (method !== "GET") {
    return json(405, { error: "Method not allowed" }, allowOrigin(origin) || "*");
  }

  const q = (event.queryStringParameters?.q || "").trim();
  const limit = Math.min(50, Math.max(1, parseInt(event.queryStringParameters?.limit || "20", 10)));

  // TODO: when YOUTUBE_API_KEY is set, call YouTube Data API v3 search and map to collection
  const collection = [];
  return json(200, { collection }, allowOrigin(origin) || "*");
};
