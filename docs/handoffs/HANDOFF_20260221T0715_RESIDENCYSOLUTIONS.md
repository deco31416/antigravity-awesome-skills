# HANDOFF: RESIDENCY+ Health Guard

**Lane Selected**: ResidencySolutions (G2 - RESIDENCY+ Prototype)
**Task Shipped**: add SoundCloud env health gate + prevent request spam.

## Changes + Files
- Added `prototypes/residency-plus/netlify/functions/sc-health.js` (Returns 200 `{ ok, message }` depending on `SOUNDCLOUD_CLIENT_ID` presence).
- Patched `prototypes/residency-plus/netlify/functions/sc-search.js` (Added CORS preflight and 400 JSON guard if client ID is missing).
- Patched `prototypes/residency-plus/netlify/functions/sc-resolve.js` (Added CORS preflight and 400 JSON guard).
- Patched `prototypes/residency-plus/netlify/functions/sc-related.js` (Added CORS preflight and 400 JSON guard).
- Patched `prototypes/residency-plus/index.html` (Added `checkHealth()` and red banner logic, replaced IIFE with `DOMContentLoaded` wrapper, and gated manual triggers).
- Updated `docs/lanes/RESIDENCYSOLUTIONS.md` (Added `netlify dev --offline` recommendation, expected 400s, and PowerShell `curl.exe` caveat).
- Updated `prototypes/residency-plus/SMOKE_TEST.md` (Updated curl commands to `curl.exe -i`).

## Commands + Outputs
```text
PS> cd prototypes/residency-plus
PS> $env:SOUNDCLOUD_CLIENT_ID="YOUR_CLIENT_ID"
PS> netlify dev --offline --dir "." --functions "netlify/functions" --port 8888

# Shell 2
PS> curl.exe -i "http://localhost:8888/.netlify/functions/sc-health"
HTTP/1.1 200 OK
content-type: application/json
...
{"ok":false,"message":"Missing SOUNDCLOUD_CLIENT_ID. Set it in your shell or Netlify env vars (see .env.example)."}

PS> curl.exe -i "http://localhost:8888/.netlify/functions/sc-search?q=test&kind=tracks"
HTTP/1.1 400 Bad Request
content-type: application/json
...
{"error":"Missing SOUNDCLOUD_CLIENT_ID. Set it in your shell or Netlify env vars (see .env.example)."}
```

## Risks/Rollback
- **Risk**: Very minimal. If the client ID is present, logic continues perfectly to the SC API.
- **Rollback**: `git revert 9aea877`

## Next Atomic Task
> Checkout `prototypes/residency-plus`. Implement a genuine `SOUNDCLOUD_CLIENT_ID` configuration for local development. Add debounce/rate limit to the UI search triggers using `checkHealth`, plus documentation on where to get the real client ID.
