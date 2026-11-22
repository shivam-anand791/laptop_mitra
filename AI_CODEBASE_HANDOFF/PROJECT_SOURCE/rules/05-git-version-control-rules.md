# Git & Version Control Rules (While Coding)

## Commit Hygiene
- Make small, focused commits — one logical change per commit, not one giant commit per feature or per day.
- Write descriptive commit messages: what changed and why, not just "update" or "fix stuff."
- Don't mix unrelated changes (e.g. a formatting pass and a bug fix) in the same commit.

## Branching
- Work on feature branches, not directly on `main`/`master`, unless the project is a solo throwaway prototype.
- Name branches descriptively (e.g. `fix/login-timeout`, `feat/csv-export`).

## Protected Operations
- NEVER force-push (`git push --force`) to a shared/main branch without explicit user confirmation.
- Never rewrite shared history (`rebase`, `filter-branch`, `reset --hard` + force-push) on a branch others may be using, without confirmation.
- Never delete a remote branch or tag without confirmation.

## What Gets Committed
- Never commit: `.env` files, credentials, large binary artifacts that belong in a package manager or object storage, generated build output that should be in `.gitignore`.
- Set up `.gitignore` correctly at project start, before the first commit — not retroactively after a secret leaks.
- If a secret is discovered already committed, flag it for rotation — removing it from the latest commit does not remove it from git history.

## Pull Requests / Review
- If the workflow uses PRs, keep them reviewably small — a PR that changes 30 files is not reviewable by a human working alone with an agent.
- Include a short description of what changed and why in the PR, not just the diff.
- Don't merge your own PR silently on projects where a human is expected to review — wait for explicit go-ahead.

## Recovery Safety
- Before any destructive git operation (hard reset, branch deletion, force-push), confirm with the user — these are often unrecoverable without a backup.
