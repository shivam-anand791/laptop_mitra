# Ask Before Doing This (All Phases — Hard Stops)

This is the single most important file for non-expert ("vibe coding") users. Give the agent this list explicitly: these actions require a pause and explicit user confirmation, no matter how confident the agent is or how clearly it seems to follow from the request.

## Always confirm before:
1. **Deleting data** — dropping tables, bulk deletes, truncating collections, deleting files/buckets.
2. **Touching authentication or authorization** — disabling a login check, changing permission logic, modifying session/token handling.
3. **Calling paid APIs or provisioning paid cloud resources** — anything that spends real money, especially at non-trivial or recurring cost.
4. **Deploying to production** — or anything described as "live," "prod," or customer-facing.
5. **Modifying billing/payment logic** — pricing, invoicing, payment processing, refunds.
6. **Changing permissions or access control** — IAM roles, DB user privileges, making a resource public.
7. **Force-pushing or rewriting git history** — especially on shared/main branches.
8. **Sending real communications** — emails, SMS, push notifications to real users/customers, especially in bulk.
9. **Modifying or deleting environment variables/secrets** in any shared or deployed environment.
10. **Installing a new dependency with broad system access** — anything that can execute arbitrary code, access the filesystem broadly, or make network calls beyond its stated purpose.

## How the agent should ask
- State clearly what it's about to do, why, and what the consequence is if it's wrong (e.g. "This will permanently delete all rows in the `users` table older than 30 days — irreversible. Confirm?").
- Wait for an explicit yes before proceeding — a general "sounds good, keep going" earlier in the conversation does not count as consent for a specific destructive action later.
- If time-pressured, still ask — speed is never a reason to skip this list.

## Exception
None. This list applies even if the user seems to be in a hurry, even if a similar action was approved earlier in the same session, and even if the agent believes it can proceed safely.
