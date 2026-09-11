# Development & Code Quality Rules (While Coding)

Use these during active implementation, every session.

## Readability Over Cleverness
- Write clear, boring code over clever one-liners — vibe-coded projects are often maintained by people (or future agent sessions) who didn't write the original logic.
- Use descriptive names for variables, functions, and files. Avoid single-letter names outside tight loops.
- Keep functions small and single-purpose. Split "do everything" functions agents tend to drift toward.

## Efficiency Without Premature Optimization
- Avoid obvious performance traps: N+1 database queries, nested loops over API calls, loading entire datasets into memory when pagination is available.
- Don't optimize prematurely for scale that isn't a stated requirement — correctness and clarity come first.
- Use appropriate data structures for the operation (e.g. don't use a list for repeated membership checks when a set/dict fits).

## Consistency
- Follow the existing codebase's conventions (naming, folder structure, formatting) rather than introducing a new style mid-project.
- Use a linter/formatter (ESLint/Prettier, Black/Ruff, etc.) and keep the codebase passing it.
- Don't reformat or restructure unrelated code while making a small fix — keep diffs focused.

## Error Handling
- Handle expected failure cases explicitly (network failure, empty results, invalid input) rather than letting exceptions propagate uncaught.
- Don't swallow errors silently (empty `catch`/`except` blocks) — at minimum log them.

## Comments & Self-Documentation
- Comment *why*, not *what* — the code should already say what it does.
- Add a comment where a non-obvious workaround or business-logic exception exists, so it isn't "fixed" by a future agent that doesn't know why it's there.

## Reuse Before Rewrite
- Check for existing utilities/functions in the codebase before writing a new one that duplicates it.
- Avoid introducing a new library for something a currently-used library already does.

## Explainability
- Before/after a non-trivial change, briefly explain in plain language what changed and why — this is often the user's only real code review.
- Flag anything the agent is unsure about or had to guess, rather than presenting a guess as a confirmed fact.

## Scope Discipline
- Implement what was asked. If a "nice to have" improvement is spotted along the way, mention it rather than silently expanding scope.
