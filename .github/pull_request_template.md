## Summary
Explain the change in plain English. Mention the user impact.

## Checklist
- [ ] No secrets committed. `.env*` ignored; `.env.example` uses placeholders only.
- [ ] Rebased on latest `main` (`git fetch origin && git rebase origin/main`).
- [ ] Local build green: `npm ci && npm run build`.
- [ ] Scope is tight; commits are clean and descriptive.
- [ ] Tests updated/added if it’s logic, or consciously skipped if UI-only.
- [ ] Docs updated if behaviour/config changed (README, docs/WORKFLOW.md, CONTRIBUTING.md).

## Screenshots / Logs (if UI or errors)
_Paste images or relevant log excerpts._

## Notes for reviewers
Call out risky areas, migrations, feature flags, or follow-ups.
