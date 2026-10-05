# Database Deployment Guide (PostgreSQL + Prisma)

This document describes the canonical workflow for initializing, migrating, and seeding the LaptopMitra PostgreSQL database.

---

## 1. Setup & Migration Commands

Run all commands from the repository root:

### Step 1: Generate Prisma Client
```bash
pnpm --filter api exec prisma generate
```

### Step 2: Deploy Migrations to Database
Applies all pending migrations from `apps/api/prisma/migrations` to the database pointed to by `DATABASE_URL`:
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

## 2. Critical Production Rules

> [!CAUTION]
> **NEVER run the following commands against a production or shared database:**
> - `prisma migrate dev` (attempts to drop/create tables interactively and may wipe data)
> - `prisma migrate reset` (drops the entire schema and deletes all data)
> - `prisma db push` (bypasses migration history tracking and can produce schema drift)
>
> On production and staging, **ONLY** use `prisma migrate deploy`.

---

## 3. Local Developer Database Reset Notice

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
