# Testing Rules (Before Merging)

Use these for any change involving logic, money, auth, or data mutation.

## Minimum Bar
- Any code touching money, authentication, authorization, or data mutation (create/update/delete) needs at least one test covering the happy path and one covering a failure/edge case.
- A task is not "done" just because code was written — it's done once it's been run (tests executed, or the feature manually exercised) and shown to work.

## What to Test
- Core business logic (calculations, state transitions, permission checks).
- Boundary and edge cases: empty input, null/undefined, max length, zero, negative numbers, duplicate submissions.
- Error paths: what happens when a dependency (DB, API, file) fails or times out.
- Security-relevant paths: unauthorized access attempts, invalid tokens, expired sessions.

## What Not to Over-Test
- Don't chase 100% coverage on trivial code (simple getters, static config) at the expense of testing the logic that actually matters.
- Don't write brittle tests tightly coupled to implementation details (internal variable names, exact log text) that break on harmless refactors.

## Test Hygiene
- Tests should be able to run repeatedly without side effects (clean up test data, use isolated test DBs/fixtures, don't hit real third-party APIs/payment providers in automated tests — use sandboxes/mocks).
- Never use production credentials or production data in tests.
- Keep tests fast enough that they'll actually get run regularly, not skipped.

## Before Marking a Task Complete
- Run the test suite (or the relevant subset) and confirm it passes.
- Manually verify the specific feature/change works as described, not just that it compiles/builds.
- If tests can't be run in the current environment, say so explicitly rather than assuming they pass.

## Regression Safety
- When fixing a bug, add a test that reproduces the bug first, then confirm the fix makes it pass — this prevents the same bug reappearing silently later.
