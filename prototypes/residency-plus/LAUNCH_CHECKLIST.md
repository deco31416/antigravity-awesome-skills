# RESIDENCY+ Launch Checklist
_G2 Residency+ — Pre-Launch Verification Checklist_
_Last updated: 2026-03-10_

Use this checklist before any production deploy or after returning to the project after a break.
Check off each item. Do not skip sections.

---

## 1. Environment Variables

Set in **Netlify Dashboard → Site Settings → Environment Variables**.
For local dev, set in `prototypes/residency-plus/.env` (gitignored, never commit).

| Variable | Required | Notes |
|---|---|---|
| `SOUNDCLOUD_CLIENT_ID` | ✅ Required | SoundCloud OAuth2 client ID |
| `SOUNDCLOUD_CLIENT_SECRET` | ✅ Required | OAuth2 client secret — mark as **secret** in Netlify UI |
| `ALLOWED_ORIGINS` | ✅ Required | Comma-separated allowed origins. For production include: `https://www.residencysolutions.net`, `https://residencysolutions.net`, `https://residencysolutions.netlify.app`, `http://localhost:8888` (and any branch/preview URLs if needed). |
| `AXIOM_API_TOKEN` | ⚡ Optional | Axiom ingest token (`xa...` format) — prefixed `xa-`, not `xapt-` |
| `AXIOM_DATASET` | ⚡ Optional | Value: `residency-plus` |
| `AXIOM_DOMAIN` | ⚡ Optional | Value: `us-east-1.aws.edge.axiom.co` |

**Checks:**
- [ ] All Required vars are present and non-empty
- [ ] `SOUNDCLOUD_CLIENT_SECRET` is marked secret (not visible in build logs)
- [ ] `ALLOWED_ORIGINS` includes the production domain
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] No credentials appear in `git log` or browser Network panel

---

## 2. Netlify Site

- [ ] Deploy target: `residencysolutions.netlify.app` (site ID: `03201d30-0c11-4620-a6e4-20d0150c7742`)
- [ ] `netlify.toml` is present in `prototypes/residency-plus/`
- [ ] Functions directory is `netlify/functions/`
- [ ] Latest commit is deployed (`netlify deploy --prod` from the prototype dir)
- [ ] Site loads at `https://residencysolutions.netlify.app` with no banner errors

---

## 3. Wrapper Endpoint Checklist

Two official endpoints are the only SoundCloud access paths. Both use OAuth2 Bearer token.

| Endpoint | Path | Check |
|---|---|---|
| `sc-official-search` | `/.netlify/functions/sc-official-search?q=...` | Returns `{ collection: [...] }` |
| `sc-official-resolve` | `/.netlify/functions/sc-official-resolve?url=...` | Returns track/set metadata |

**Checks:**
- [ ] `curl.exe -i "https://residencysolutions.netlify.app/.netlify/functions/sc-official-search?q=ambient&limit=5"` → HTTP 200 with results
- [ ] `curl.exe -i "https://residencysolutions.netlify.app/.netlify/functions/sc-official-resolve?url=https://soundcloud.com/haszari/ambient-leftfield-dojo-twisted-frequency"` → HTTP 200 with track data
- [ ] A disallowed origin returns 403 (test from a different domain or with `curl.exe -H "Origin: https://evil.com"`)
- [ ] Rate limit blocks requests beyond 30/5min window (best-effort, in-memory)
- [ ] No `Authorization: Bearer ...` headers appear in browser Network panel

---

## 4. Desktop Smoke Test

Order: Search → Resolve → Save → History → Export

- [ ] Open `https://residencysolutions.netlify.app` — no error banner
- [ ] **Shuffle** — button shows `…` while loading, then resolves to a track
- [ ] Track title, artist · bucket, duration pill, upload date all populate
- [ ] Hover track title → tooltip shows full title
- [ ] **Save** → "Saved to crate." flash, count badge increments
- [ ] **Save again** → "Already in your saved crate." toast, no duplicate
- [ ] **Open ↗** → opens SoundCloud URL in new tab
- [ ] **History** — shows recently played tracks with Play / ↗ / Save shortcuts
- [ ] **Copy URLs** → clipboard contains newline-separated SoundCloud URLs
- [ ] **Export** → downloads `residency-crate-<timestamp>.json` with `{ count, tracks: [...] }`
- [ ] **Auto-Dig** → button shows "Digging…", spinner visible, resolves and shuffles
- [ ] Genre filter change → persists after page reload
- [ ] Source filter change → persists after page reload
- [ ] Dig range slider → persists after page reload
- [ ] Crate items persist after page reload (count badge shows correctly)
- [ ] History items persist after page reload

---

## 5. Mobile Smoke Test (375px viewport)

- [ ] Open DevTools → Device Mode → 375px
- [ ] No horizontal scroll bar
- [ ] **Save** and **Open ↗** buttons stretch full-width and are comfortably tappable
- [ ] Genre select and Shuffle button are visible and tappable without zooming
- [ ] Track title fits without overflow (respects `max-width: 100%`)
- [ ] Crate panel and history panel are scrollable and readable
- [ ] Loading state visible during shuffle (`Finding…`, faded italic)
- [ ] Error state renders cleanly (no overflow)

---

## 6. Telemetry / Axiom

Telemetry is **non-blocking** — failures do not affect app behavior.

- [ ] `AXIOM_DATASET`, `AXIOM_API_TOKEN`, `AXIOM_DOMAIN` set in Netlify env
- [ ] `AXIOM_API_TOKEN` is a `xa...` API token (not a `xapt-` personal token)
- [ ] After triggering a search: events appear in `residency-plus` dataset in Axiom within 60s
- [ ] No tokens or Authorization headers appear in events (see `AXIOM_RUNBOOK.md`)
- [ ] Follow `AXIOM_DASHBOARD_BOOTSTRAP_CHECKLIST.md` to build the 5 monitoring panels

---

## 7. Rollback Plan

**If the deploy is broken:**
```bash
# Roll back to previous Netlify deploy
netlify rollback

# Or roll back the git commit
git revert HEAD
git push origin HEAD
netlify deploy --prod
```

**If only one function is broken:**
- Roll back just `netlify/functions/sc-official-search.js` or `sc-official-resolve.js`
- Or disable `SOUNDCLOUD_CLIENT_ID` to show the backend-unavailable banner

**Telemetry rollback:**
- Remove `AXIOM_*` env vars from Netlify dashboard
- App will continue working, just without telemetry forwarding

---

## 8. Known Caveats / Risks

| Caveat | Severity | Notes |
|---|---|---|
| **SoundCloud 429 rate limits** | Medium | SoundCloud can rate-limit requests; app shows friendly error. Wait and retry. No auto-retry in place. |
| **Token cache is cold on first request** | Low | First request fetches a fresh Bearer token — may take a few hundred ms extra. |
| **Netlify cold starts** | Low | Functions may have 200–400ms cold-start latency after periods of inactivity. |
| **ALLOWED_ORIGINS is exact-match** | Medium | Adding new domains requires updating this env var. Dev ports not auto-included. |
| **In-memory rate limiting** | Low | Rate limit counter resets on function cold start — not persistent across instances. |
| **Library cache (IndexedDB)** | Low | User's library is stored in browser IndexedDB (`residencyDB_v16`). Schema version bump wipes it. |
| **Axiom ingestion latency** | Low | Events may take up to 60s to appear in Axiom. Not real-time. |
| **No playlist import** | Low | Crate is manually curated only. No batch import from SoundCloud likes/playlists. |

---

## References

| Doc | Purpose |
|---|---|
| [RESIDENCYSOLUTIONS.md](../../docs/lanes/RESIDENCYSOLUTIONS.md) | Lane overview, local runbook, endpoint docs |
| [SMOKE_TEST.md](SMOKE_TEST.md) | Detailed smoke test scripts |
| [AXIOM_RUNBOOK.md](AXIOM_RUNBOOK.md) | Telemetry pipeline diagnostics |
| [AXIOM_DASHBOARD_BOOTSTRAP_CHECKLIST.md](AXIOM_DASHBOARD_BOOTSTRAP_CHECKLIST.md) | First dashboard setup |
| [ALERT_POLICY.md](ALERT_POLICY.md) | Alert thresholds and response playbooks |
