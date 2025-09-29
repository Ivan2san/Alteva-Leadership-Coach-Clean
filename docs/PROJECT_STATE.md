# Project State (living log)

**Last updated:** 2025-09-29T07:28Z (UTC)

## Source of truth
- GitHub main protected; PRs only; linear history; ff-only pulls.
- Secrets never in git. Use Replit Secrets or local .env (gitignored).

## CI
- node-ci: runs typecheck:ci then build.
- Prod Smoke (status.spec.ts): manual (workflow_dispatch) using `PRODUCTION_URL`.

## Release tag
- Current: v0.1.0

## Recent change (human note)
- Add a one-liner here when you cut notable PRs.

## How to update this file
1) Edit on a docs/* branch, open PR to main.
2) Keep entries terse and dated.
