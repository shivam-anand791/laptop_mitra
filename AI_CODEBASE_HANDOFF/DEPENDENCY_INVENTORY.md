# LaptopMitra — Dependency Inventory

This document details every package, library, and tool across all workspaces in the LaptopMitra monorepo.

---

## 1. Monorepo Infrastructure & Build Tools

| Package / Tool | Version | Workspace | Purpose |
|---|---|---|---|
| `turbo` | `2.10.12` | Root | Turborepo pipeline orchestration, build caching, task parallelism |
| `pnpm` | `8.15.4` | Root | Fast, disk-space efficient package manager with strict workspace isolation |
| `prisma` | `6.4.1` | Root, API | Prisma CLI for schema management, migrations, client generation |
| `@prisma/client` | `6.4.1` | Root, API | Type-safe database client for PostgreSQL |
| `typescript` | `^5.0.0` / `^6.0.3` | All | Static typing and compilation across packages |
| `globals` | `^17.12.0` | Root, Mobile | ESLint global definitions |
| `puppeteer-core` | `^25.16.0` | Root | Headless browser execution for automated end-to-end verifications |

---

## 2. Backend API (`apps/api`)

### Production Dependencies
| Package | Version | Purpose |
|---|---|---|
| `@nestjs/common` | `^11.0.0` | Core NestJS framework decorators, exceptions, lifecycle hooks |
| `@nestjs/core` | `^11.0.0` | NestJS kernel application engine |
| `@nestjs/platform-express` | `^11.0.0` | Express adapter for HTTP request handling |
| `@nestjs/config` | `^12.0.0` | Environment configuration management |
| `@nestjs/swagger` | `^8.0.0` | Auto-generated OpenAPI/Swagger documentation (`/api`) |
| `@nestjs/throttler` | `^6.5.0` | IP-based request rate limiting (100 req/min) |
| `@prisma/client` | `6.4.1` | Relational database ORM client |
| `class-validator` | `^0.14.0` | Declarative DTO validation |
| `class-transformer` | `^0.5.0` | Object-to-class deserialization for DTOs |
| `dotenv` | `^16.4.7` | Local `.env` loading |
| `firebase-admin` | `^13.10.0` | Server-side Firebase ID token verification, user administration |
| `helmet` | `^8.3.0` | Security headers (CSP, HSTS, X-Frame-Options) |
| `nodemailer` | `^10.2.1` | SMTP email transport |
| `razorpay` | `^2.9.0` | Indian Rupee order creation, subscriptions, refunds, signatures |
| `reflect-metadata` | `^0.2.0` | TypeScript decorator reflection |
| `resend` | `^6.34.1` | Transactional email delivery API |
| `rxjs` | `^7.8.0` | Reactive programming observables |

### Development Dependencies
| Package | Version | Purpose |
|---|---|---|
| `@nestjs/cli` | `^11.0.0` | NestJS code generation CLI |
| `@nestjs/testing` | `^11.0.0` | Mock testing module context for NestJS |
| `jest` / `ts-jest` | `^29.5.0` / `^29.1.0` | Unit & integration test execution |
| `ts-node` | `^10.9.0` | Direct TypeScript execution for migration scripts |

---

## 3. Web Frontend (`apps/web`)

### Production Dependencies
| Package | Version | Purpose |
|---|---|---|
| `next` | `16.3.4` | Next.js 16 App Router framework with React Server Components |
| `react` / `react-dom` | `19.2.8` | Declarative UI rendering |
| `@tanstack/react-query` | `^5.68.0` | Asynchronous data fetching, caching, query invalidation |
| `clsx` / `tailwind-merge` | `^2.1.1` / `^3.0.2` | Conditional class utility and Tailwind conflict resolver |
| `firebase` | `^12.19.0` | Firebase Web client SDK (Authentication, Google OAuth) |
| `lucide-react` | `^1.52.0` | High-quality accessible vector icons |
| `tailwindcss` | `^4.0.0` | Utility-first CSS engine |

### Development Dependencies
| Package | Version | Purpose |
|---|---|---|
| `@playwright/test` | `^1.64.1` | Cross-browser automated visual testing and screenshot regression |
| `eslint-config-next` | `16.3.4` | Next.js standard lint rules |

---

## 4. Mobile Application (`apps/mobile`)

### Production Dependencies
| Package | Version | Purpose |
|---|---|---|
| `expo` | `~57.0.33` | Expo SDK 57 runtime and native module bridge |
| `react` / `react-native` | `19.2.3` / `0.86.3` | React 19 paired with React Native 0.86 |
| `@laptopmitra/types` | `workspace:*` | Shared domain TypeScript interfaces and DTOs |
| `@laptopmitra/tokens` | `workspace:*` | Shared design tokens (colors, typography, spacing) |
| `@laptopmitra/api-client` | `workspace:*` | Shared type-safe API client |
| `@react-navigation/native` | `^7.0.13` | Native app routing container |
| `@react-navigation/native-stack`| `^7.0.13` | Native stack navigation |
| `@react-navigation/bottom-tabs` | `^7.0.13` | Bottom tab bar navigation |
| `@tanstack/react-query` | `^5.68.0` | Query cache and data synchronization |
| `zustand` | `^5.0.15` | Fast, lightweight client-side state store |
| `react-hook-form` | `^7.53.0` | Performant form state controller |
| `zod` | `^3.24.1` | Schema validation |
| `react-native-razorpay` | `^3.0.0` | Native Android/iOS Razorpay checkout bridge |
| `@react-native-async-storage/async-storage`| `^2.2.0` | Persisted key-value storage |
| `expo-secure-store` | `~57.0.4` | Hardware-backed encrypted credential storage |
| `expo-image` | `~57.0.5` | High-performance cached image component |
| `expo-notifications` | `~57.0.25` | Push notification token management |
| `expo-status-bar` | `~57.0.1` | Native status bar styling |
| `react-native-safe-area-context`| `~5.7.0` | Safe area insets handling |
| `react-native-screens` | `~4.26.0` | Native view controllers for navigation memory efficiency |
| `firebase` | `^12.19.0` | Firebase Auth client |

---

## 5. Shared Monorepo Packages (`packages/*`)

| Workspace Package | Version | Internal Dependencies | Scope |
|---|---|---|---|
| `@laptopmitra/types` | `0.0.1` | None | Domain models: User, Order, Product, Category, Service, Ticket, DTOs |
| `@laptopmitra/tokens` | `0.0.1` | None | Design tokens: Colors (brand, status), Typography, Spacing, Shadows, Radius |
| `@laptopmitra/api-client` | `0.0.1` | `@laptopmitra/types` | Universal HTTP client with automatic auth token injection and refresh |
| `@laptopmitra/env` | `0.0.0` | `zod`, `dotenv` | Strict Zod validation schemas for backend environment variables |
| `@laptopmitra/config` | `0.0.1` | None | Base `tsconfig.json` and ESLint configurations |
