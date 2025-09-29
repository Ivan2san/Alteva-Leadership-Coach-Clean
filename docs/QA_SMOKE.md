# Alteva – Quick Smoke Test

## Goal
Fast, repeatable sanity check that the built app can install, typecheck, build, start, and serve HTML/assets.

## Prereqs
- Node 20
- No secrets required (MSW disabled by default)

## Steps
1) Install deps  
   `npm ci`

2) Typecheck  
   `npm run typecheck:ci || npx tsc --noEmit`

3) Build  
   `npm run build --if-present`

4) Run built server (prod-lite)  
   `NODE_ENV=production PORT=5050 node dist/index.js &`

5) Verify endpoints  
   - Health: `curl -fsS http://127.0.0.1:5050/health` → `OK`  
   - Root HTML: `curl -fsS -H "Accept: text/html" -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:5050/` → `200 text/html`  
   - Asset:  
     ```
     ASSET=$(basename $(ls dist/public/assets/index-*.js | head -n 1))
     curl -fsSI "http://127.0.0.1:5050/assets/$ASSET" | head -n 1  # HTTP/1.1 200 OK
     ```

6) Stop server  
   `pkill -f "node dist/index.js" || true`

## Notes
- For dev, Replit runs on port 5000 via `npm run dev`. This smoke uses 5050 to avoid clashing with dev.
- CI already builds on PRs (`node-ci`). This smoke is for local verification or troubleshooting.
