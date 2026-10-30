# Database Deployment Guide (PostgreSQL + Prisma)

This document describes the canonical workflow for initializing, migrating, and seeding the LaptopMitra PostgreSQL database.

---

## 1. Local Development Database

The API's `.env` may point at a shared or production database. Do not use it for development migrations, seeds, or database tests. Local DB commands load `apps/api/.env.development` or `.env.test` explicitly and reject the protected Supabase host.

The committed templates are `apps/api/.env.development.example` and `apps/api/.env.test.example`. Local `.env.development` and `.env.test` files are ignored by Git. Start the isolated Docker database and initialize it with:

```powershell
docker compose up -d
pnpm db:dev:migrate
pnpm db:dev:validate
pnpm db:dev:status
pnpm db:dev:diff
pnpm db:dev:seed
pnpm db:dev:history-check
```

`docker-compose.yml` uses the `laptopmitra-dev` project name and a dedicated named volume, so it does not reuse an older default-project volume. `pnpm db:dev:reset -- --confirm-reset` is destructive and must only be used for this local dev database.
The history check runs rollback-safe constraint/trigger assertions. The payout concurrency test keeps append-only audit entries, and the support concurrency test intentionally retains its synthetic tickets, returns, and linked fixtures; do not clean those records with hard deletes.

For loopback URLs, guarded development commands select `laptopmitra_dev_fresh` by default, regardless of the database name in `.env.development`. This is the separate database populated by the canonical seed; it is not renamed. To explicitly select another local database, set `DEV_DATABASE_NAME` in the command's PowerShell session, for example `$env:DEV_DATABASE_NAME='laptopmitra_local'`. Remote development hosts retain their configured database name and still require an explicit host allowlist.

The API and web startup commands verify that the selected database has at least one product. If not, they stop with `Development database is empty; run pnpm db:dev:seed.` The API logs when its runtime product fallback is used; the web product page displays a development warning when it falls back to mock products.

Run the API and web against that database/API with:

```powershell
pnpm dev:api
pnpm dev:web
```

These commands load `.env.development`; web requests use `http://localhost:3001`. Add any required local Firebase credentials to `.env.development` yourself. To switch to a different local database, stop the processes and set `DEV_DATABASE_NAME` before restarting. To switch back to the default fresh database, remove that variable. Do not copy the shared `.env` into dev/test.

Database scripts and Jest global setup validate both `DATABASE_URL` and `DIRECT_URL` against `.db-protected-hosts`. A remote development database is rejected unless its exact host is listed in `ALLOWED_DEV_DB_HOST` in `.env.development`; test runs never accept that allowlist.

## 2.1 Proposed S7 Production Rollout — Approval Required

The local-only migration `20261028120000_support_history_preservation` replaces destructive support/ledger foreign-key actions with `RESTRICT` and adds database triggers that reject `UPDATE` and `DELETE` on `TicketEvent` and `AuditLog`. It has **not** been applied to Supabase or any production database. Do not run these steps without explicit approval.

### Preflight and deployment order

1. Schedule a maintenance window and take a fresh Supabase backup/snapshot. Confirm that the restore point is available before proceeding.
2. Deploy the compatible API and web releases first. The new API exposes archive/unpublish actions instead of hard-deleting help categories/articles; the web UI uses those actions. The migration adds no columns, so this code can run before or after it.
3. Use a direct, non-pooled PostgreSQL URL for the migration. In the migration shell, set `DATABASE_URL` from the approved secret store without pasting it into chat or logs. The current Prisma schema reads `DATABASE_URL`; setting `DIRECT_URL` alone does not change Prisma's migration connection.
4. Confirm the preflight query below returns zero for every relationship. Resolve any orphan rows before continuing; do not bypass the checks.
5. From the repository root, run:

   ```powershell
   pnpm --filter api exec prisma migrate deploy
   pnpm --filter api exec prisma migrate status
   ```

   `migrate deploy` applies pending migrations in order. Never use `migrate dev`, `migrate reset`, or `db push` against Supabase.
6. Verify that migration `20261028120000_support_history_preservation` is applied, all expected foreign keys use `RESTRICT`, and both append-only triggers exist. Confirm support ticket/return reads, exports, and archive actions in production.
7. Remove the temporary migration-shell `DATABASE_URL`. Render continues using its approved runtime API database setting. Vercel receives only `NEXT_PUBLIC_API_URL`; EAS receives only `EXPO_PUBLIC_API_URL`. Do not put database URLs or credentials in Vercel or EAS.

Use the following read-only orphan check before the migration:

```sql
SELECT 'SupportTicket.orderId' AS relation, COUNT(*) AS orphan_count
FROM "SupportTicket" t LEFT JOIN "Order" r ON r.id = t."orderId"
WHERE t."orderId" IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'SupportTicket.orderItemId', COUNT(*)
FROM "SupportTicket" t LEFT JOIN "OrderItem" r ON r.id = t."orderItemId"
WHERE t."orderItemId" IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'SupportTicket.mergedIntoId', COUNT(*)
FROM "SupportTicket" t LEFT JOIN "SupportTicket" r ON r.id = t."mergedIntoId"
WHERE t."mergedIntoId" IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'TicketMessage.ticketId', COUNT(*)
FROM "TicketMessage" t LEFT JOIN "SupportTicket" r ON r.id = t."ticketId"
WHERE r.id IS NULL
UNION ALL
SELECT 'TicketAttachment.ticketId', COUNT(*)
FROM "TicketAttachment" t LEFT JOIN "SupportTicket" r ON r.id = t."ticketId"
WHERE t."ticketId" IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'TicketAttachment.returnRequestId', COUNT(*)
FROM "TicketAttachment" t LEFT JOIN "ReturnRequest" r ON r.id = t."returnRequestId"
WHERE t."returnRequestId" IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'TicketAttachment.messageId', COUNT(*)
FROM "TicketAttachment" t LEFT JOIN "TicketMessage" r ON r.id = t."messageId"
WHERE t."messageId" IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'TicketEvent.ticketId', COUNT(*)
FROM "TicketEvent" t LEFT JOIN "SupportTicket" r ON r.id = t."ticketId"
WHERE r.id IS NULL
UNION ALL
SELECT 'ReturnRequest.ticketId', COUNT(*)
FROM "ReturnRequest" t LEFT JOIN "SupportTicket" r ON r.id = t."ticketId"
WHERE t."ticketId" IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'ReturnItem.returnRequestId', COUNT(*)
FROM "ReturnItem" t LEFT JOIN "ReturnRequest" r ON r.id = t."returnRequestId"
WHERE r.id IS NULL
UNION ALL
SELECT 'DiscountRedemption.orderId', COUNT(*)
FROM "DiscountRedemption" t LEFT JOIN "Order" r ON r.id = t."orderId"
WHERE r.id IS NULL
UNION ALL
SELECT 'ReferralRedemption.orderId', COUNT(*)
FROM "ReferralRedemption" t LEFT JOIN "Order" r ON r.id = t."orderId"
WHERE r.id IS NULL
UNION ALL
SELECT 'AffiliatePaymentDetails.userId', COUNT(*)
FROM "AffiliatePaymentDetails" t LEFT JOIN "User" r ON r.id = t."userId"
WHERE r.id IS NULL
UNION ALL
SELECT 'HelpArticle.categoryId', COUNT(*)
FROM "HelpArticle" t LEFT JOIN "HelpCategory" r ON r.id = t."categoryId"
WHERE r.id IS NULL;
```

### Rollback plan

Prisma Migrate does not automatically roll back an applied migration. Prefer a forward fix and keep the restrictive foreign keys/triggers active. If the migration causes an unrecoverable issue, stop writes and restore the fresh Supabase backup under the approved incident procedure; review any writes made after that snapshot before restoring.

Reverting this migration manually would re-enable destructive deletion behavior. Do not run this rollback as a routine deployment step; require a fresh backup and explicit approval. The reverse DDL is:

```sql
BEGIN;
DROP TRIGGER IF EXISTS "TicketEvent_append_only" ON "TicketEvent";
DROP TRIGGER IF EXISTS "AuditLog_append_only" ON "AuditLog";
DROP FUNCTION IF EXISTS reject_append_only_history_mutation();

ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_orderId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_orderItemId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_mergedIntoId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_mergedIntoId_fkey"
  FOREIGN KEY ("mergedIntoId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TicketMessage" DROP CONSTRAINT "TicketMessage_ticketId_fkey";
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_ticketId_fkey";
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_returnRequestId_fkey";
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_messageId_fkey";
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketEvent" DROP CONSTRAINT "TicketEvent_ticketId_fkey";
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" DROP CONSTRAINT "ReturnRequest_ticketId_fkey";
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnItem" DROP CONSTRAINT "ReturnItem_returnRequestId_fkey";
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscountRedemption" DROP CONSTRAINT "DiscountRedemption_orderId_fkey";
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralRedemption" DROP CONSTRAINT "ReferralRedemption_orderId_fkey";
ALTER TABLE "ReferralRedemption" ADD CONSTRAINT "ReferralRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliatePaymentDetails" DROP CONSTRAINT "AffiliatePaymentDetails_userId_fkey";
ALTER TABLE "AffiliatePaymentDetails" ADD CONSTRAINT "AffiliatePaymentDetails_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpArticle" DROP CONSTRAINT "HelpArticle_categoryId_fkey";
ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
```

## 2. Setup & Migration Commands

For a deployed database, run production migrations only after a fresh backup and explicit approval, using a direct connection URL and `prisma migrate deploy`. Do not use the local development wrappers against production.

### Step 1: Generate Prisma Client
```bash
pnpm --filter api exec prisma generate
```

### Step 2: Deploy Migrations to an Approved Production Database
Applies all pending migrations from `apps/api/prisma/migrations` to the database pointed to by the production connection URL:
```bash
pnpm --filter api exec prisma migrate deploy
```
*(Or run the npm script: `pnpm --filter api run prisma:migrate:deploy`)*

### Step 3: Seed Catalog Data (Idempotent)
Populates initial categories, demo products, and images:
```bash
pnpm --filter api exec prisma db seed
```
> **Note:** The seed is idempotent. Re-running it upserts categories and products and cleanly updates image sets without duplicating rows.

---

## 3. Critical Production Rules

> [!CAUTION]
> **NEVER run the following commands against a production or shared database:**
> - `prisma migrate dev` (attempts to drop/create tables interactively and may wipe data)
> - `prisma migrate reset` (drops the entire schema and deletes all data)
> - `prisma db push` (bypasses migration history tracking and can produce schema drift)
>
> On production and staging, **ONLY** use `prisma migrate deploy`.

---

## 4. Local Developer Database Reset Notice

The migration history was baseline-initialized with `20261005000000_init` representing the single canonical PostgreSQL datamodel.

If you have a local developer database previously initialized with the superseded `20261003180000_firebase_auth` migration, it must be dropped and recreated:

```bash
# In psql or your Postgres client:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Then run migrate deploy and seed:
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed
```

---

## 5. Admin Bootstrap

To grant an initial user administrative access:

### Option A: Using the CLI Script
```bash
# In development:
pnpm --filter api run admin:promote <email>

# In production (requires explicit confirmation flag):
pnpm --filter api run admin:promote <email> --i-know-this-is-prod
```
The script displays the target database host (without credentials) and requests interactive confirmation before modifying the user record.

### Option B: Alternative One-Line SQL
Directly in `psql` or your PostgreSQL console:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = '<email>';
```
*(Ensure `<email>` matches the lowercased email associated with the user's account).*
