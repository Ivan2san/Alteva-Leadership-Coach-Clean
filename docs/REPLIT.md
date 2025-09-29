# Replit workflow hygiene

## Run + Dev
- Use the big **Run** button. It runs `npm run dev` as configured in `.replit`.
- Node 20 only. Repo enforces `"engines": { "node": ">=20 <21" }` and `.nvmrc` is `20`.

## Env & secrets
- Never commit secrets. Keep them in **Replit → Secrets**.
- `.env` and `.env.*` are gitignored. `.env.example` uses placeholders only.

## Git rules (Replit)
- Always `git pull --ff-only` before changes.
- Branch off `main`. No direct pushes to `main` (blocked by hooks + rules).
- Open a PR; CI must be green; 1 approval required; linear history enforced.

## Files to avoid committing
- `attached_assets/` (screenshots/dumps from the editor) are ignored by `.gitignore`.
- Build outputs (`dist/`, `.vite/`, etc.) and logs are ignored.

## Useful commands
- Install deps: `npm ci`
- Build prod: `npm run build`
- Type check: `npm run check` (tsc)
- Smoke status (GitHub): manual workflow **Prod Smoke Status**

## Snapshots (if needed)
- If you must capture a workspace snapshot, zip your tree locally and keep zips out of git.
- Use branches like `snapshot/*` only for deliberate comparisons, then delete.

## Common fixes
- Port in use: `kill -9 $(lsof -ti :5000,:5173) 2>/dev/null || true` then Run.
- Stale deps: `npm ci` then `npm run build`.
