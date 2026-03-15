# Multi-Source Discovery Expansion — NOW / NEXT / LATER

Internal roadmap for Residency+ multi-source vibe search and shuffle.

---

## NOW (implemented in this pass)

- **Entitlements model for sources**
  - `entitlements-lib.js`: `unlockedSources` per plan; `SOURCE_PACKS` for add-ons (social_pack, video_pack, bandcamp_beta).
  - Default: free → `["soundcloud"]`; residency_plus → `["soundcloud","youtube","internet_archive","uploads"]`; packs add instagram/tiktok, vimeo, bandcamp.
  - `get-entitlements` returns `entitlements.unlockedSources`; no DB schema change (plan-only for now).

- **Sources UI**
  - "Discovery sources" section in the existing controls drawer (no new topbar button; no overlap with account or vibe presets).
  - Checkboxes for: SoundCloud, YouTube, Internet Archive, Bandcamp, Vimeo, TikTok, Instagram, User Uploads.
  - Select all / Clear all; saved source presets (save current, apply from dropdown).
  - Locked sources shown disabled with lock; only checked + entitled sources participate in search/shuffle.

- **State and persistence**
  - `enabledDiscoverySources` (UI selection) persisted to `residencyDiscoverySources_v1`; source presets to `residencySourcePresets_v1`.
  - Entitlements from `currentEntitlements.unlockedSources`; selection clamped to unlocked on load and when plan changes.

- **Adapters and discovery**
  - Placeholder adapters for all eight sources; **implemented** (wired, backend stubs): SoundCloud (existing), YouTube, Internet Archive, User Uploads.
  - **Scaffold only** (return empty collection): Bandcamp, Vimeo, TikTok, Instagram.
  - `multiSourceSearch(q, kind, limit)` runs enabled + entitled adapters in parallel; merges results; each item has `_source`.

- **Search and shuffle**
  - `quickFill` and vibe search (`fetchVibeCandidates`, `runVibeSearch`) use `multiSourceSearch`; only checked + entitled sources are queried.
  - Library items carry `_source`; track meta shows source attribution (pill "Source: YouTube", etc.).
  - Non–SoundCloud items skip `scResolve` in `loadItem`; source pill still shown.

- **Defensive**
  - Session reopen and vibe preset apply already use `sanitizeVibePrompt` before setting `vibeInput.value`; no auth/email hydration into vibe input.

---

## NEXT

- **Backend implementation for YouTube, Internet Archive, User Uploads**
  - YouTube: configure `YOUTUBE_API_KEY` (Data API v3), implement search in `search-youtube.js`, normalize to `{ url, title, artist, durationMs, ... }`.
  - Internet Archive: implement search in `search-internet-archive.js` (e.g. advancedsearch or IA API).
  - User Uploads: wire to Supabase storage + metadata table for authenticated user uploads in `search-uploads.js`.

- **Playback for non-SoundCloud**
  - Today only SoundCloud URLs open in the in-app embed. Next: open YouTube/IA/Uploads in new tab or embed where allowed (policy/compliance first).

- **Source presets UX**
  - Optional: name presets when saving; delete/rename in drawer.

- **Add-on packs in billing**
  - Store pack flags (e.g. `social_pack`, `video_pack`, `bandcamp_beta`) in DB (e.g. `users` or `subscriptions`); pass to `getEntitlementsForPlan(plan, addons)` so `unlockedSources` includes pack sources.

---

## LATER

- **Live ingestion for Instagram, TikTok, Bandcamp, Vimeo**
  - Only when compliant backend paths exist (API terms, auth, rate limits). Keep as scaffold (empty collection) until then.

- **Billing UX for source packs**
  - No redesign in this pass; product scaffolding and entitlements are in place so pack purchase can gate `unlockedSources` later.

- **Filter by source in discovery**
  - Optional library/filter UI: "Show only YouTube", "Hide User Uploads", etc., building on existing genre/station filters.
