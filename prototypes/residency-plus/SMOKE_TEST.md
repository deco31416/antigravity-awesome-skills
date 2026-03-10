# Smoke Test (RESIDENCY+)

To verify that the server is running correctly and correctly handles missing client IDs without spamming requests:

1. **Start the dev server**
   ```powershell
   cd prototypes/residency-plus
   $env:SOUNDCLOUD_CLIENT_ID="YOUR_CLIENT_ID"
   netlify dev --offline --dir "." --functions "netlify/functions" --port 8888
   ```

2. **Verify endpoints with curl.exe**
   *(Note: Use `curl.exe -i` to see 400 response bodies in PowerShell, because `curl` alone is an alias to Invoke-WebRequest)*

   ```powershell
   # Health check -> should return 200 with ok: false
   curl.exe -i "http://localhost:8888/.netlify/functions/sc-health"
   ```
   **Expected Behavior:** `sc-health` returns `200 OK` with `{"ok":false,"message":"Missing or placeholder SOUNDCLOUD_CLIENT_ID"}`.

3. **Verify UI Guard**
   - Open `http://localhost:8888`
   - You should see a red banner at the top.
   - The browser network tab should NOT flood with repeated failed searches.

---

## Official OAuth Wrapper Smoke Tests (new — 2026-03-10)

These tests require **real credentials** in `.env` (`SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET`, `ALLOWED_ORIGINS`).

### Start the dev server (with real creds)
```powershell
cd 'C:\Users\sean\antigravity-awesome-skills\prototypes\residency-plus'
# .env must have real credentials
netlify dev --dir "." --functions "netlify/functions" --port 8888
```

### Endpoint Tests (run in a second terminal)
```powershell
# 1. Valid search — expect 200 JSON { collection: [...] }
curl.exe -i "http://localhost:8888/.netlify/functions/sc-official-search?q=ambient&limit=3"

# 2. Missing q — expect 400 JSON { error: "Missing required param: q" }
curl.exe -i "http://localhost:8888/.netlify/functions/sc-official-search"

# 3. Disallowed origin — expect 403 JSON { error: "Origin not permitted." }
curl.exe -i -H "Origin: http://evil.example.com" "http://localhost:8888/.netlify/functions/sc-official-search?q=ambient"

# 4. Valid resolve — expect 200 JSON shaped resource object
curl.exe -i "http://localhost:8888/.netlify/functions/sc-official-resolve?url=https://soundcloud.com/forss/flickermood"

# 5. Missing url — expect 400 JSON { error: "Missing required param: url" }
curl.exe -i "http://localhost:8888/.netlify/functions/sc-official-resolve"

# 6. Invalid url prefix — expect 400 JSON { error: "param 'url' must begin with..." }
curl.exe -i "http://localhost:8888/.netlify/functions/sc-official-resolve?url=http://example.com"
```

### Rate Limit Test (optional — 31 rapid requests)
```powershell
1..31 | ForEach-Object { curl.exe -s -o NUL -w "%{http_code} " "http://localhost:8888/.netlify/functions/sc-official-search?q=test$_" }
# Last request(s) should return 429
```

> **Security check:** confirm no `access_token`, `Authorization`, `client_id`, or `client_secret` appears in any response body or server log output.