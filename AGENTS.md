# Laptop Mitra — AI Agent Guide & Engineering Rules

This repository integrates **Get Shit Done (GSD Core v1.19)** for spec-driven phase loops and **Ponytail v5.3** for minimal, high-leverage implementation without bloat or over-engineering.

---

## 1. Core Operating Principles

### A. Ponytail: Think Like a Lazy Senior Developer
- **The best code is the code never written.** Solve the whole task with the least new code.
- **Reuse existing:** First inspect existing components, utilities, DTOs, and tokens in this monorepo before writing anything new.
- **Platform over packages:** Platform/standard library APIs beat third-party packages. House components beat external UI widgets.
- **Zero unnecessary abstractions:** No premature wrappers, layers, helper classes, or "for later" boilerplate.
- **Non-negotiables:** Never compromise on validation at trust boundaries, error handling, security, or accessibility.
- **Focused tests:** Any new non-trivial logic (branch, loop, parser, money/payout, state machine, security check) must leave one small focused test.
- **Honest reporting:** Always state in one or two lines what was skipped or unverified and any remaining risks.

### B. GSD: Spec-Driven Phase Loop
- **Discuss ➔ Plan ➔ Execute ➔ Verify ➔ Ship.**
- Keep main context clean. Use fresh subagents for heavy research, deep codebase mapping, and isolated execution waves.
- Never write production code without understanding callers, dependencies, and side effects.

---

## 2. Hard Stops & Non-Negotiable Security Rules

From `rules/01-security-rules.md` and `rules/07-ask-before-doing-this.md`:

### Always Ask Explicit Written Approval Before:
1. **Running database schema migrations or altering tables.**
2. **Deleting or truncating database data, files, or cloud storage objects.**
3. **Modifying authentication, authorization, or role-guard logic.**
4. **Altering financial, billing, withdrawal, or payment calculation logic.**
5. **Force-pushing or rewriting git commit history.**
6. **Installing dependencies with broad network, shell, or filesystem permissions.**

### Mandatory Security Constraints:
- **No hardcoded secrets:** Always use environment variables. Never commit `.env` files.
- **Injection prevention:** Use parameterized Prisma queries and safe argument arrays.
- **Server-side enforcement:** Never trust client-side role or authorization checks.
- **Financial safety:** Payout balances must be guarded with PostgreSQL row locks (`FOR UPDATE`) inside transactions to prevent double-spending or race conditions.
- **Money formatting:** All currencies are in Indian Rupees (₹) as Decimal. Never divide by 100.

---

## 3. Monorepo Architecture & Boundaries

- **Tooling:** Node.js v26+, pnpm v8.15.4, Turborepo.
- **Applications:**
  - `apps/mobile`: Expo (React Native). Strict TypeScript with `exactOptionalPropertyTypes: true`. Consume tokens from `@laptopmitra/tokens` and client from `@laptopmitra/api-client`. **Never import Node.js built-ins (`fs`, `crypto`, `path`) in mobile code.**
  - `apps/web`: Next.js 15 (App Router). Responsive mobile-first design, Vanilla CSS / Tailwind tokens. Respect server vs client component boundaries.
  - `apps/api`: NestJS 11 + Prisma ORM + PostgreSQL. Modules: `auth`, `order`, `discount` (affiliate payouts), `admin`, `product`, `mail`, `notifications`, `support`.
- **Shared Packages:**
  - `packages/types`: Canonical TypeScript interfaces and DTOs.
  - `packages/tokens`: Shared design system colors, typography, spacing, shadows.
  - `packages/api-client`: Universal type-safe fetch client.
  - `packages/env`: Cross-package environment variable validation.
- **Rule:** When modifying shared types or clients, rebuild packages (`pnpm --filter "@laptopmitra/*" build`) before running type checks in `apps/web` or `apps/mobile`.

---

## 4. Workflows

### 1. New Features
1. **Discuss & Spec (GSD):** Use `/gsd-phase` or `/gsd-discuss-phase` to clarify requirements and edge cases.
2. **Minimal Design (Ponytail):** Check what UI components exist in `apps/web/components` and `apps/mobile/src/components`. Extend them with the minimal needed props rather than duplicating.
3. **Contract First:** Add DTOs to `packages/types` and rebuild.
4. **Implement & Test:** Implement the backend and frontend. Add focused unit tests for edge cases.
5. **Verify:** Run `pnpm type-check` and relevant test suites.

### 2. Bug Fixes
1. **Trace Callers:** Grep for every usage of the failing function or endpoint across the monorepo before editing.
2. **Root Cause:** Fix once in the shared core layer rather than adding workarounds in callers.
3. **Smallest Diff:** Keep the diff as small and targeted as possible.
4. **Regression Test:** Add a test covering the bug reproduction before closing.

### 3. JavaScript / Metro Bundling Failures (Mobile)
1. **Clear Bundler Cache:** `npx expo start -c` or `pnpm --filter mobile start -- --clear`.
2. **Check Platform Imports:** Ensure no Node.js runtime APIs (`crypto`, `stream`, `child_process`, `fs`) leaked into mobile bundles.
3. **Shared Package Linking:** Verify `packages/types` and `packages/api-client` are compiled to `dist/`.
4. **Duplicate Dependencies:** Check `pnpm-lock.yaml` for multiple incompatible versions of React or React Native.

### 4. Android EAS Builds
1. **Configuration Preflight:** Verify `app.json` (or `app.config.ts`), `versionCode`, `permissions`, and package name (`com.laptopmitra.app`).
2. **Hermes & Native Modules:** Ensure native Expo packages are compatible with the installed Expo SDK version via `npx expo-doctor`.
3. **Secrets Management:** Ensure production API URLs and Firebase configuration are injected via EAS secrets or build profiles in `eas.json`, never committed in source.

### 5. Repository-Wide Audits
1. Run `/ponytail-audit` or `/gsd-audit-milestone`.
2. Do not run duplicate audit agents simultaneously.
3. Focus audits on:
   - Security vulnerabilities and secret exposure.
   - Dead/unused code and unreferenced exports.
   - Heavy dependencies that can be replaced with standard library APIs.
   - Missing tests on financial or state-machine branches.

### 6. Code Reviews & Regression Testing
1. Review git diff with `/ponytail-review` before committing or creating PRs.
2. Run targeted test suites: `npm test -- <path-to-test>`.
3. Run workspace type-checks: `pnpm type-check`.

---

## 5. Agent Skills & Commands Reference

| Command / Skill | Source | Purpose |
| :--- | :--- | :--- |
| `/ponytail` | Ponytail | Activates lazy senior dev mode (`lite`, `full`, `ultra`). |
| `/ponytail-review` | Ponytail | Reviews current git diff for bugs, load, security, missing tests, and cuts. |
| `/ponytail-audit` | Ponytail | Full repo scan with ranked findings and actionable fixes. |
| `/ponytail-debt` | Ponytail | Harvests and tracks `shortcut:` comments into technical debt ledger. |
| `/ponytail-gain` | Ponytail | Scoreboard showing code deleted, complexity reduced, and tokens saved. |
| `/ponytail-help` | Ponytail | Quick reference card for Ponytail modes and commands. |
| `/gsd-phase` | GSD Core | Executes a structured phase in the milestone loop. |
| `/gsd-plan-phase`| GSD Core | Researches and decomposes a phase into fresh-context plans. |
| `/gsd-execute-phase` | GSD Core | Runs plans across fresh-context worker subagents. |
| `/gsd-verify-work` | GSD Core | Validates phase completion against spec and requirements. |
| `/gsd-help` | GSD Core | Comprehensive help for all GSD lifecycle commands. |
