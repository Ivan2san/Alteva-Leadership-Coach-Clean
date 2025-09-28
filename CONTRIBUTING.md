# Contributing

This repo treats GitHub as the source of truth. Read the full workflow: [docs/WORKFLOW.md](docs/WORKFLOW.md).

## Quick start
```bash
# Update local main
git switch main && git pull --ff-only

# Branch from main
git switch -c feature/<slug>

# Commit in small chunks
git add -A && git commit -m "<type>: <message>"

# Rebase before PR
git fetch origin
git rebase origin/main

# Push and open PR
git push -u origin HEAD
