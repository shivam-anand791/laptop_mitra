# Deployment & Production Rules (Shipping to Staging/Prod)

## Pre-Deploy Checklist
- Confirm debug mode is OFF and verbose/stack-trace error output is disabled for the production build.
- Confirm all secrets are loaded from environment variables/secret manager — not left as defaults or hardcoded fallback values in code.
- Confirm CORS, CSP, and other security headers are set to production-appropriate (restrictive) values, not the permissive dev settings.
- Run the test suite and confirm it passes before deploying.
- Confirm database migrations are backward-compatible or that a migration plan exists (avoid breaking the running app mid-deploy).

## Environment Separation
- Never point a dev/staging environment at the production database.
- Never test destructive operations (bulk delete, schema changes) directly against production — use staging or a copy of the data first.
- Keep separate API keys/credentials per environment (dev/staging/prod) so a leaked dev key can't touch production data.

## Destructive Actions in Production
- NEVER run a destructive command (`DROP TABLE`, bulk `DELETE`, `TRUNCATE`, deleting cloud storage buckets, deleting cloud resources) against production without explicit, separate confirmation from the user — even if it was already confirmed for staging.
- Always confirm before force-deploying, rolling back, or overwriting a production environment variable.
- Prefer soft-deletes or backups before irreversible data operations in production.

## Rollback Readiness
- Before deploying a significant change, confirm there's a rollback path (previous build/tag, DB migration down-script, or feature flag) in case something breaks.
- Don't deploy a schema-breaking migration and new code in a way that leaves no path back if the deploy fails halfway.

## Monitoring & Alerts
- Ensure errors in production are logged somewhere the user will actually see them (error tracking tool, logs, alerts) — not just printed to a console no one watches.
- Don't silently swallow production errors to "keep things running smoothly" — surfacing failures matters more than hiding them.

## Access Control at Deploy Time
- Confirm no admin/debug routes or endpoints are accessible without auth in the deployed build.
- Confirm cloud resource permissions (S3 buckets, DB instances, storage) are not left publicly accessible by default.

## Cost Awareness
- Flag any deployment change that could cause a significant, unexpected cost increase (e.g. always-on expensive compute, unthrottled paid API calls, unbounded storage growth) before applying it.
