/**
 * search-internet-archive.js — Internet Archive discovery adapter for Residency+.
 * Returns normalized { collection: [{ url, title, artist, durationMs, ... }] }.
 * Stub: returns empty collection until IA search is implemented (e.g. archive.org API).
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

  // TODO: call archive.org search (e.g. /advancedsearch.php or IA API) and map to collection
  const collection = [];
  return json(200, { collection }, allowOrigin(origin) || "*");
};
