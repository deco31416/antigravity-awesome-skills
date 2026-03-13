/**
 * Build-time env injection for Netlify.
 * Replaces %%AUTH_ENABLED%%, %%SUPABASE_URL%%, %%SUPABASE_ANON_KEY%%
 * in index.html with values from process.env (set in Netlify UI).
 * Run from repo root with: node prototypes/residency-plus/scripts/inject-env.js
 * Or from base (prototypes/residency-plus): node scripts/inject-env.js
 */
const fs = require("fs");
const path = require("path");

const baseDir = path.resolve(__dirname, "..");
const indexPath = path.join(baseDir, "index.html");

let html = fs.readFileSync(indexPath, "utf8");
html = html.replace("%%AUTH_ENABLED%%", process.env.AUTH_ENABLED ?? "%%AUTH_ENABLED%%");
html = html.replace("%%SUPABASE_URL%%", process.env.SUPABASE_URL ?? "%%SUPABASE_URL%%");
html = html.replace("%%SUPABASE_ANON_KEY%%", process.env.SUPABASE_ANON_KEY ?? "%%SUPABASE_ANON_KEY%%");
fs.writeFileSync(indexPath, html);
