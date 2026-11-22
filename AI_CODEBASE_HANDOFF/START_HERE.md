# LaptopMitra — AI Agent Quickstart & Handoff Entrypoint

Welcome to the **LaptopMitra Codebase Handoff Package**.

This curated package contains all essential source code, configurations, database schemas, and documentation required for an AI coding agent or senior engineer to understand, run, debug, modify, and extend the project without prior context.

---

## 1. Quick Navigation: Where to Read First

| Step | Document | Purpose |
|---|---|---|
| **1** | [AI_AGENT_INSTRUCTIONS.md](AI_HANDOFF_DOCUMENTATION/AI_AGENT_INSTRUCTIONS.md) | **Start here.** Core engineering rules, hard stops, file inspection map, and conventions. |
| **2** | [PROJECT_OVERVIEW.md](AI_HANDOFF_DOCUMENTATION/PROJECT_OVERVIEW.md) | Executive summary, business purpose, tech stack versions, and architecture diagram. |
| **3** | [ARCHITECTURE.md](AI_HANDOFF_DOCUMENTATION/ARCHITECTURE.md) | Monorepo structure, request lifecycle, data flow, and module boundaries. |
| **4** | [DATABASE_DOCUMENTATION.md](AI_HANDOFF_DOCUMENTATION/DATABASE_DOCUMENTATION.md) | 37 Prisma/PostgreSQL models, relationships, concurrency locks, and sequence generators. |
| **5** | [API_DOCUMENTATION.md](AI_HANDOFF_DOCUMENTATION/API_DOCUMENTATION.md) | Complete endpoint catalog: methods, routes, controllers, payloads, and auth requirements. |
| **6** | [BUSINESS_LOGIC_AND_WORKFLOWS.md](AI_HANDOFF_DOCUMENTATION/BUSINESS_LOGIC_AND_WORKFLOWS.md) | Step-by-step flows: Orders, 15m reservations, Razorpay, AMC service, Buyback, and Mitra payouts. |
| **7** | [ENVIRONMENT_AND_SETUP.md](AI_HANDOFF_DOCUMENTATION/ENVIRONMENT_AND_SETUP.md) | Commands to install, build, migrate, test, and run the applications locally. |

---

## 2. Five-Minute Local Setup

```bash
# 1. Navigate into the source code directory
cd PROJECT_SOURCE

# 2. Install dependencies across all workspaces
pnpm install

# 3. Build the core shared packages (MANDATORY before type checking)
pnpm --filter "@laptopmitra/*" build

# 4. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# 5. Run database migrations & seed test catalog
pnpm db:dev:migrate
pnpm db:dev:seed

# 6. Start the development servers
pnpm dev
# -> Web frontend runs on http://localhost:3000
# -> API gateway runs on http://localhost:3001
# -> Swagger docs run on http://localhost:3001/api
```

---

## 3. High-Priority Engineering Rules

1. **Ask explicit permission** before running destructive database commands (`migrate reset`, `db push`), deleting storage, or modifying payment calculations.
2. **Never divide/multiply by 100** on stored monetary values. All currency values are in Indian Rupees (₹) as `Decimal(10, 2)`.
3. **Always rebuild shared packages** (`pnpm --filter "@laptopmitra/*" build`) after altering types in `packages/types` or tokens in `packages/tokens`.
4. **No Node.js APIs in Mobile**: `apps/mobile` runs in React Native Hermes/JSC; never import `fs`, `path`, `crypto`, or `child_process`.
5. **Always add a focused unit test** when introducing or modifying non-trivial business logic.
