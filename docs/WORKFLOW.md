# GitHub Source of Truth — Workflow Cheat Sheet

## Policies
- GitHub is the source of truth. No direct pushes to main — PRs only.
- Never commit secrets. Use Replit Secrets or a local .env (gitignored).
- Always `git pull --ff-only` before work. Rebase features on main.
- Only force-push with `--force-with-lease`.

## Daily flow (feature work)
```bash
git switch main && git pull --ff-only
git switch -c feature/<short-slug>
git add -A && git commit -m "<type>: <message>"
git fetch origin && git rebase origin/main
git push -u origin HEAD   # then open PR: base=main, compare=feature/<short-slug>