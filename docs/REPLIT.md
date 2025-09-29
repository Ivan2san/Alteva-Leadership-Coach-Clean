# Replit Workflow Hygiene

## Source of truth
- GitHub (`main`) is the source of truth. Replit is a working copy.

## Node & scripts
- Node 20.
- Install: `npm ci`
- Dev: `npm run dev` (binds to port **5000**)
- Typecheck: `npm run typecheck:ci || npx tsc --noEmit`
- Build: `npm run build --if-present`
- Test: `npm test --if-present`

## Ports
- Replit exposes port 5000 by default. Keep `PORT=5000` for dev.
- For ad-hoc smoke tests of the built server: `NODE_ENV=production PORT=5050 node dist/index.js`.

## MSW (Mock Service Worker)
- Disabled by default.
- Enable in dev by setting secret: `VITE_ENABLE_MSW=true`.
- The app only starts MSW in dev when that secret is set.

## Secrets & env
- Never commit secrets. Use **Replit Secrets** or a local `.env` ignored by Git.
- Keep `.env.example` up to date with non-secret keys.

## Git hygiene
- Always pull fast-forward: `git pull --ff-only`.
- Create branches off `main`, open PRs to `main`, require green CI (**node-ci**) and at least one approval.
- Do not push to `main`. If you must rewrite branch history: `--force-with-lease` (never to `main`).

## Files to ignore
- `.gitignore` excludes `node_modules`, build outputs (`dist`, `.vite`), logs, and `.env`.

## Replit workflows
- `.replit` may auto-start `npm run dev` on port 5000. If you need to run the built server concurrently, use a different port (e.g. 5050) or temporarily stop the dev task.
