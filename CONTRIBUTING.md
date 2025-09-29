# Contributing

## Branches & PRs
- Work on short-lived branches off `main`. Name like `feat/<scope>` `fix/<scope>` `docs/<scope>`.
- Rebase on `main` before opening a PR. Keep history linear.
- Open PRs against `main`. One clear change per PR.
- CI (**node-ci**) must be green and the branch up-to-date. At least 1 approval required.
- Code owners: @Ivan2san is requested automatically.

## Local dev
- Node 20. Use `npm ci` to install.
- Start dev: `npm run dev` (Replit targets port 5000).
- Typecheck: `npm run typecheck:ci || npx tsc --noEmit`
- Build: `npm run build --if-present`
- Test: `npm test --if-present`

## MSW (Mock Service Worker)
- Disabled by default.
- Enable in dev by setting secret: `VITE_ENABLE_MSW=true`.
- App only starts MSW in dev when that secret is set.

## Secrets & env
- Never commit secrets. Use Replit Secrets or a local `.env` (ignored by Git).
- Keep `.env.example` up to date with non-secret keys.
- GitHub is the source of truth; Replit is a working copy.

## Git hygiene
- Always pull fast-forward: `git pull --ff-only`.
- Push branches; do **not** push to `main`. Merges happen via PRs.
- If you must rewrite history on a branch, use `--force-with-lease` (never to `main`).

## Ignore files
- `.gitignore` already excludes `node_modules`, `dist`, logs, and `.env`. Don’t add built artifacts.
