# LaptopMitra — Pre-Launch Security Audit Report

> **Date:** 2026-09-11 | **Auditor:** Application Security Review
> **Scope:** Full monorepo — NestJS API, Next.js Web, React Native Mobile, Prisma schema, configs, legacy PHP
> **Methodology:** Manual code review across all source files, dependency analysis, configuration review

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 8 |
| **High** | 9 |
| **Medium** | 12 |
| **Low** | 8 |
| **Total** | **37** |

**Top 3 risks before launch:**
1. Any registered user can create/delete products (missing admin guard on API)
2. JWT signing falls back to a hardcoded string when env var is misconfigured
3. Legacy PHP files with hardcoded database passwords and admin hash committed to git

---

## CRITICAL Findings

---

### C1. Any Authenticated User Can Create, Update, and Delete Products

| | |
|---|---|
| **File** | `apps/api/src/modules/product/product.controller.ts` :35–59 |
| **Category** | Authorization gap |

**Vulnerable code:**
```typescript
@Post()
@UseGuards(JwtAuthGuard)  // JWT only — NO RolesGuard
create(@Body() data: any) {
  return this.productService.create(data);
}

@Put(':id')
@UseGuards(JwtAuthGuard)  // JWT only — NO RolesGuard
update(@Param('id') id: string, @Body() data: any) {
  return this.productService.update(id, data);
}

@Delete(':id')
@UseGuards(JwtAuthGuard)  // JWT only — NO RolesGuard
remove(@Param('id') id: string) {
  return this.productService.remove(id);
}
```

**How it's exploited:** Any registered user (including low-privilege customers) sends `POST /products` with arbitrary product data, `PUT /products/{id}` to modify any product, or `DELETE /products/{id}` to delete any product. An attacker can deface the entire catalog, inject malicious content into product descriptions (stored XSS in any admin panel that renders them), or wipe all products.

**Fix:**
```typescript
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
create(@Body() data: CreateProductDto) {
  return this.productService.create(data);
}

@Put(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
update(@Param('id') id: string, @Body() data: UpdateProductDto) {
  return this.productService.update(id, data);
}

@Delete(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
remove(@Param('id') id: string) {
  return this.productService.remove(id);
}
```

---

### C2. JWT Signing Falls Back to Hardcoded Secret When Env Var Is Missing

| | |
|---|---|
| **File** | `apps/api/src/auth/auth.module.ts` :18, `apps/api/src/auth/strategies/jwt.strategy.ts` :18 |
| **Category** | Hardcoded secret / Authentication flaw |

**Vulnerable code:**
```typescript
secret: configService.get<string>('JWT_ACCESS_SECRET') ?? 'fallback_secret_for_dev',
```

**Additionally:** `.env.example` defines `JWT_SECRET` but the code reads `JWT_ACCESS_SECRET`. A developer following the example will always hit the fallback.

**How it's exploited:** Attacker reads the source code, crafts a JWT signed with `fallback_secret_for_dev` containing `{ sub: "<victim-id>", role: "ADMIN" }`, and gains full admin access to every API endpoint. This is a complete authentication bypass.

**Fix:**
```typescript
// auth.module.ts and jwt.strategy.ts
const secret = configService.get<string>('JWT_ACCESS_SECRET');
if (!secret) {
  throw new Error('FATAL: JWT_ACCESS_SECRET environment variable is not set');
}

// .env.example — fix the variable name
JWT_ACCESS_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-this-in-production"
```

---

### C3. Payment Endpoint Does Not Verify Order Ownership (IDOR)

| | |
|---|---|
| **File** | `apps/api/src/modules/payments/payment.controller.ts` :18–25, `apps/api/src/modules/payments/payment.service.ts` :37–61 |
| **Category** | Insecure Direct Object Reference |

**Vulnerable code:**
```typescript
// payment.controller.ts
async createRazorpayOrder(
  @GetUser() user: any,
  @Body('amount') amount: number,
  @Body('orderId') orderId: string,  // Attacker-controlled, no ownership check
) {
  return this.paymentService.createOrder(amount, 'INR', receipt);
}
```

**How it's exploited:** Attacker sends `POST /payments/razorpay/order` with `{ "amount": 1, "orderId": "<victim-order-id>" }` to create a Razorpay payment order linked to someone else's order. This corrupts payment records, could allow completing another user's payment, or triggers incorrect webhook processing.

**Fix:**
```typescript
async createRazorpayOrder(
  @GetUser() user: any,
  @Body('amount') amount: number,
  @Body('orderId') orderId: string,
) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id) {
    throw new ForbiddenException('You can only pay for your own orders');
  }
  if (amount <= 0 || amount > order.finalAmount) {
    throw new BadRequestException('Invalid payment amount');
  }
  return this.paymentService.createOrder(amount, 'INR', orderId);
}
```

---

### C4. Math.random() Used for OTP and Referral Code Generation

| | |
|---|---|
| **File** | `apps/api/src/shared/random.service.ts` :5–19 |
| **Category** | Insecure cryptography |

**Vulnerable code:**
```typescript
generateOtp(length = 6): string {
  const chars = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}
```

**How it's exploited:** `Math.random()` is not cryptographically secure. Its internal state can be predicted, allowing an attacker to narrow down OTP values and brute-force verification flows.

**Fix:**
```typescript
import * as crypto from 'crypto';

generateOtp(length = 6): string {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}
```

---

### C5. Admin Panel Has Zero Authentication or Authorization Checks

| | |
|---|---|
| **File** | `apps/web/app/admin/layout.tsx` (entire file), `apps/web/components/Navbar.tsx` :165–169 |
| **Category** | Authorization gap |

**Vulnerable code:**
```tsx
// admin/layout.tsx — no auth check whatsoever
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="...">{children}</div>
  );
}

// Navbar.tsx — shows admin link to ALL logged-in users, not just admins
{user && (
  <Link href="/admin">⚡ Admin Portal</Link>
)}
```

**How it's exploited:** Any visitor navigates to `/admin/users` and can see all user data (email, phone, address), `/admin/products` to modify the catalog, `/admin/orders` to see all customer orders and PII.

**Fix:**
```tsx
// admin/layout.tsx
'use client';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'ADMIN') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return <div className="...">{children}</div>;
}

// Navbar.tsx — guard the admin link
{user && user.role === 'ADMIN' && (
  <Link href="/admin">⚡ Admin Portal</Link>
)}
```

---

### C6. Hardcoded Database Credentials and Admin Password Hash in Committed Git History

| | |
|---|---|
| **File** | `public_html/config/database.php` :3–5, `public_html/database.sql` :41–42 |
| **Category** | Hardcoded secrets / Credential leak |

**Vulnerable code:**
```php
// database.php — committed to git
define('DB_USER', 'xper_u797209756_laptop');
define('DB_PASS', 'Anurag879@');
define('DB_NAME', 'xper_u797209756_laptop');
```

```sql
-- database.sql — committed to git
INSERT INTO `admin_users` VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ...);
```

The bcrypt hash `$2y$10$92IXUNpkjO0rOQ5byMi...` is the well-known hash for the password **"password"**.

**How it's exploited:** Anyone with repo access has the legacy MySQL credentials and can log in as admin with password `password`. Even after deletion, the credentials remain in git history.

**Fix:**
1. Rotate the MySQL password immediately
2. Remove the entire `public_html/` directory from the repository: `git rm -r public_html/`
3. Remove from git history: `git filter-branch --force --index-filter 'git rm -r --cached --ignore-unmatch public_html/' HEAD`
4. Add `public_html/` to `.gitignore`

---

### C7. Real JWT Secrets and Supabase Credentials in .env Files on Disk

| | |
|---|---|
| **File** | `.env` :26,30–31, `apps/api/.env` :26,30–31 |
| **Category** | Secrets management |

**Exposed values:**
```
DATABASE_URL=postgresql://postgres:tFF_uGesNv8j8C3@db.ljghopzlzlkiolzcythh.supabase.co:5432/postgres
JWT_ACCESS_SECRET=O1YBXpuyCDgst7mTRQXRY_p1WvmFI2w5L466A_pdq2C61u3ob1-O8lYPXA2vKqSm
JWT_REFRESH_SECRET=99U0jOHmn-59dDWDzRcvJQ_za74e8oOOy9mPBP4CSdLpkeZx1hYxqVAXkQVw6HLt
```

**Mitigating factor:** Both `.env` files are properly gitignored and NOT tracked by git.

**How it's exploited:** If a developer machine is compromised, backed up insecurely, or shared, these credentials are exposed. Database full compromise. JWT forgery for any user.

**Fix:**
1. Rotate the Supabase password immediately
2. Rotate both JWT secrets immediately
3. Move to a secrets manager (Vault, 1Password, or platform secrets)
4. Delete root `.env` from disk after deploying secrets to a secrets manager

---

### C8. Razorpay Webhook Signature Verification Is Broken and Timing-Unsafe

| | |
|---|---|
| **File** | `apps/api/src/modules/payments/payment.service.ts` :63–91 |
| **Category** | Broken cryptography / Payment security |

**Vulnerable code:**
```typescript
async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return expectedSignature === signature;  // NOT timing-safe
}

async handlePaymentWebhook(payload: any, signature: string) {
  const isValid = await this.verifyWebhookSignature(
    JSON.stringify(payload),  // Re-stringified, NOT the raw body
    signature,
  );
}
```

**Three issues:**
1. `JSON.stringify(payload)` is NOT the same as the raw HTTP body Razorpay signed. Key ordering, whitespace, and encoding differ.
2. `===` is not timing-safe — enables timing side-channel attacks.
3. `RAZORPAY_WEBHOOK_SECRET` is not in `.env.example`, so developers won't configure it.

**How it's exploited:** If the webhook secret is not configured, no webhook ever updates payment status (broken). If configured, the timing attack allows signature forgery, letting an attacker mark arbitrary payments as completed.

**Fix:**
```typescript
// Preserve raw body in NestJS (use raw-body middleware or @Req())
async verifyWebhookSignature(rawBody: Buffer, signature: string): Promise<boolean> {
  const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
  if (!secret) throw new UnauthorizedException('Webhook secret not configured');

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex'),
  );
}
```

Add to `.env.example`:
```
RAZORPAY_WEBHOOK_SECRET="whsec_..."
```

---

## HIGH Findings

---

### H1. `GET /users/:id` Leaks Any User's Profile (IDOR)

| | |
|---|---|
| **File** | `apps/api/src/users/users.controller.ts` :58–65 |
| **Category** | Insecure Direct Object Reference |

**Vulnerable code:**
```typescript
@Get(':id')
async getUserById(@Param('id') id: string) {
  return this.usersService.findById(id);  // No ownership check
}
```

**How it's exploited:** Any authenticated user enumerates UUIDs to read any other user's email, phone, gender, DOB, address, city, state, and pincode.

**Fix:** Restrict to admins only:
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async getUserById(@Param('id') id: string) {
  return this.usersService.findById(id);
}
```

---

### H2. Change Password Does Not Invalidate Existing Refresh Tokens

| | |
|---|---|
| **File** | `apps/api/src/auth/auth.service.ts` :233–275 |
| **Category** | Session management flaw |

**Vulnerable code:**
```typescript
async changePassword(userId: string, data: ChangePasswordDto) {
  // ... verifies and updates password ...
  await this.prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
  // BUG: refresh tokens NOT deleted
  return { message: 'Password changed successfully' };
}
```

**How it's exploited:** Attacker steals a refresh token. Victim changes password thinking they've locked out the attacker. Stolen refresh token continues working for up to 30 days.

**Fix:**
```typescript
async changePassword(userId: string, data: ChangePasswordDto) {
  // ... verify and update password ...

  // Invalidate ALL existing refresh tokens
  await this.prisma.refreshToken.deleteMany({ where: { userId } });

  return { message: 'Password changed successfully. Please log in again.' };
}
```

---

### H3. Rate Limiting Allows 100 Login Attempts Per Minute

| | |
|---|---|
| **File** | `apps/api/src/app.module.ts` :25–30 |
| **Category** | Missing brute force protection |

**Vulnerable code:**
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000, // 1 minute
  limit: 100,  // 100 attempts per minute
}]),
```

**How it's exploited:** 100 login attempts/minute = 1.67/second. With weak passwords or credential lists, this enables effective credential stuffing.

**Fix:**
```typescript
// In auth.controller.ts
@Post('login')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 per minute
async login(@Body() loginDto: LoginDto) { ... }

@Post('register')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 3, ttl: 300000 } })  // 3 per 5 minutes
async register(@Body() registerDto: RegisterDto) { ... }
```

---

### H4. Race Condition: Stock Reduction Without Database Transaction

| | |
|---|---|
| **File** | `apps/api/src/modules/order/order.service.ts` :140–161 |
| **Category** | Race condition / Data integrity |

**Vulnerable code:**
```typescript
for (const item of cart.items) {
  const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
  // NOT ATOMIC — two concurrent requests both read stock=1, both pass check
  const newStock = product.stock - item.quantity;
  await this.prisma.product.update({ where: { id: product.id }, data: { stock: newStock } });
}
```

**How it's exploited:** Two users simultaneously order the last item. Both read `stock = 1`, both pass the check, both write `stock = 0`. One user paid but there's no stock. Negative stock possible with quantity > 1.

**Fix:**
```typescript
const order = await this.prisma.$transaction(async (tx) => {
  for (const item of cart.items) {
    const result = await tx.$queryRaw`
      UPDATE product SET stock = stock - ${item.quantity}
      WHERE id = ${item.productId}::text AND stock >= ${item.quantity}
      RETURNING *
    `;
    if (result.length === 0) {
      throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
    }
    // ... build order items
  }
  return tx.order.create({ data: orderData });
});
```

---

### H5. No Content Security Policy Headers

| | |
|---|---|
| **File** | `apps/web/next.config.ts` (entire file), `apps/api/src/main.ts` |
| **Category** | Missing security headers |

**How it's exploited:** Combined with any XSS vector, the attacker can load arbitrary external scripts, exfiltrate data, or perform crypto-mining. No CSP = XSS payloads run unrestricted.

**Fix** — `apps/web/next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: [
          "default-src 'self'",
          "script-src 'self' https://checkout.razorpay.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' https://images.unsplash.com data:",
          "connect-src 'self' http://localhost:3001",
          "frame-src https://*.razorpay.com",
        ].join('; ') },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
  // ... existing config
};
```

**Fix** — `apps/api/src/main.ts`:
```bash
pnpm add helmet
```
```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

### H6. Swagger API Documentation Exposed Without Environment Check

| | |
|---|---|
| **File** | `apps/api/src/main.ts` :28–35 |
| **Category** | Information disclosure |

**Vulnerable code:**
```typescript
SwaggerModule.setup('api', app, document);  // Always enabled
```

**How it's exploited:** Attacker browses `/api` in production to see every endpoint, parameter, request/response schema, and data model. Full attack surface mapping.

**Fix:**
```typescript
if (configService.get<string>('NODE_ENV') !== 'production') {
  SwaggerModule.setup('api', app, document);
}
```

---

### H7. Hardcoded Razorpay Test Key as Client Fallback

| | |
|---|---|
| **File** | `apps/web/app/checkout/page.tsx` :136 |
| **Category** | Hardcoded secret |

**Vulnerable code:**
```typescript
const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_S3KeoVspM7qt2w';
```

**How it's exploited:** If the env var is not set, the hardcoded key is used. This pattern normalizes hardcoding payment keys and could be copied to production with a live key.

**Fix:**
```typescript
const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
if (!razorpayKey) {
  throw new Error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured');
}
```

---

### H8. Third-Party Razorpay Script Loaded Without Subresource Integrity

| | |
|---|---|
| **File** | `apps/web/app/checkout/page.tsx` :68–75 |
| **Category** | Supply chain risk |

**Vulnerable code:**
```typescript
const script = document.createElement('script');
script.src = 'https://checkout.razorpay.com/v1/checkout.js';
script.async = true;
// No integrity hash, no crossorigin
document.body.appendChild(script);
```

**How it's exploited:** Razorpay CDN compromise or MITM attack injects malicious JS that executes with full page context — stealing auth tokens, payment data, and PII.

**Fix:**
```tsx
import Script from 'next/script';

<Script
  src="https://checkout.razorpay.com/v1/checkout.js"
  integrity="sha384-<actual-hash>"
  crossOrigin="anonymous"
  strategy="lazyOnload"
/>
```

---

### H9. Hardcoded Demo Credentials in Client Bundle

| | |
|---|---|
| **File** | `apps/web/app/login/page.tsx` :32–35 |
| **Category** | Credential exposure |

**Vulnerable code:**
```typescript
const fillDemo = () => {
  setEmail('customer@laptopmitra.com');
  setPassword('Mitra@2026!');
};
```

**How it's exploited:** Attacker reads the JS bundle (always visible in browser source), tries credentials against the real API. If valid, full account takeover.

**Fix:** Remove the `fillDemo` function entirely. If demo mode is needed, only enable in development:
```typescript
{process.env.NODE_ENV === 'development' && (
  <button onClick={fillDemo}>Fill Demo Account</button>
)}
```

---

## MEDIUM Findings

---

### M1. `.env.example` Defines Wrong JWT Variable Name

| | |
|---|---|
| **File** | `apps/api/.env.example` :6 |
| **Category** | Misconfiguration |

`.env.example` defines `JWT_SECRET` but code reads `JWT_ACCESS_SECRET`. Developers will always hit the hardcoded fallback (see C2).

**Fix:** Rename in `.env.example` to `JWT_ACCESS_SECRET`.

---

### M2. No Global Exception Filter — Prisma Errors Leak to Client

| | |
|---|---|
| **File** | `apps/api/src/main.ts` (no filter registered) |
| **Category** | Information disclosure |

Uncaught Prisma errors contain table names, column names, and error codes.

**Fix:** Create `apps/api/src/filters/all-exceptions.filter.ts`:
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      response.status(400).json({ statusCode: 400, message: 'A database error occurred' });
      return;
    }
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    response.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
// In main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

---

### M3. Product Create/Update Uses `@Body() data: any` — No Input Validation

| | |
|---|---|
| **File** | `apps/api/src/modules/product/product.controller.ts` :39, :48 |
| **Category** | Missing input validation |

**Fix:** Create `CreateProductDto` and `UpdateProductDto` with `class-validator` decorators.

---

### M4. Order `shippingAddress` Accepts Arbitrary Unvalidated JSON

| | |
|---|---|
| **File** | `apps/api/src/modules/order/order.controller.ts` :20–26 |
| **Category** | Missing input validation |

**Fix:** Create a validated `ShippingAddressDto` with `class-validator` decorators for all fields.

---

### M5. Discount Code Per-User Usage Limit Checks Total Uses, Not Per-User Uses

| | |
|---|---|
| **File** | `apps/api/src/modules/order/order.service.ts` :60 |
| **Category** | Logic bug |

```typescript
if (dc.maxUsesPerUser && dc.uses >= dc.maxUsesPerUser) { // dc.uses is total, not per-user
```

**Fix:**
```typescript
if (dc.maxUsesPerUser) {
  const userUsageCount = await this.prisma.order.count({
    where: { userId, referralCode: dc.code },
  });
  if (userUsageCount >= dc.maxUsesPerUser) {
    throw new BadRequestException('Discount code usage limit reached for your account');
  }
}
```

---

### M6. Discount Code Usage Increment Is Not Atomic (Race Condition)

| | |
|---|---|
| **File** | `apps/api/src/modules/order/order.service.ts` :57–86 |
| **Category** | Race condition |

**Fix:** Use atomic increment:
```typescript
await this.prisma.discountCode.update({
  where: { id: dc.id },
  data: { uses: { increment: 1 } },
});
```

---

### M7. Wildcard Image Domain Allows SSRF via Next.js Image Optimization

| | |
|---|---|
| **File** | `apps/web/next.config.ts` :7–11 |
| **Category** | SSRF / Open redirect |

```typescript
remotePatterns: [{ protocol: "https", hostname: "**" }]
```

**Fix:**
```typescript
remotePatterns: [
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: 'res.cloudinary.com' },
],
```

---

### M8. Mock Auth Bypass Creates Fake Tokens in localStorage

| | |
|---|---|
| **File** | `apps/web/lib/api.ts` :147–162 |
| **Category** | Authentication flaw |

When the backend is unreachable, login creates fake tokens and user objects locally.

**Fix:** Remove mock auth fallback. Show a clear "Backend unavailable" error instead.

---

### M9. No Account Lockout After Failed Login Attempts

| | |
|---|---|
| **File** | `apps/api/src/auth/auth.service.ts` :64–115 |
| **Category** | Missing brute force protection |

No tracking of failed attempts. No progressive lockout.

**Fix:** Add `failedLoginAttempts` and `lockedUntil` fields to User model. Lock after 5 failures with progressive duration.

---

### M10. Admin `updateUserStatus` Silently Defaults Invalid Status to ACTIVE

| | |
|---|---|
| **File** | `apps/api/src/modules/admin/admin.service.ts` :32 |
| **Category** | Logic bug |

```typescript
const validStatus = ['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status) ? status : 'ACTIVE';
```

**Fix:**
```typescript
if (!['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
  throw new BadRequestException('Invalid status. Must be one of: ACTIVE, SUSPENDED, DELETED');
}
```

---

### M11. API Base URL Defaults to HTTP (Not HTTPS)

| | |
|---|---|
| **File** | `apps/web/lib/api.ts` :4 |
| **Category** | Transport security |

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

**Fix:** Remove the HTTP default. Fail if not configured in production.

---

### M12. No Token Expiration or Refresh Handling on Client

| | |
|---|---|
| **File** | `apps/web/lib/api.ts` :28–38 |
| **Category** | Session management |

No 401 interceptor. When JWT expires, API requests silently fail.

**Fix:** Add 401 handling in the `request` function:
```typescript
if (res.status === 401) {
  localStorage.removeItem('lm_token');
  localStorage.removeItem('lm_user');
  window.location.href = '/login';
  throw new ApiError(401, 'Session expired');
}
```

---

## LOW Findings

---

### L1. Refresh Tokens Stored as Plaintext in Database

| | |
|---|---|
| **File** | `apps/api/src/auth/auth.service.ts` :44–49 |

Store SHA-256 hashes instead of raw tokens. Compromised DB doesn't immediately expose usable tokens.

---

### L2. No Refresh Token Cleanup / Maximum Session Limit

| | |
|---|---|
| **File** | `apps/api/src/auth/auth.service.ts` |

Expired tokens accumulate. Add a periodic cleanup job and limit sessions per user (e.g., 5 active sessions max).

---

### L3. CORS Configuration Has No Production Validation

| | |
|---|---|
| **File** | `apps/api/src/main.ts` :12–16 |

If `CORS_ORIGINS=*` in production, any origin can make authenticated requests. Validate origins against a whitelist at startup.

---

### L4. Logout Does Not Clear All localStorage Keys

| | |
|---|---|
| **File** | `apps/web/lib/api.ts` :216–219 |

```typescript
// Currently only clears:
localStorage.removeItem('lm_token');
localStorage.removeItem('lm_user');
// Missing:
localStorage.removeItem('lm_cart');
localStorage.removeItem('lm_wishlist');
localStorage.removeItem('lm_orders');
```

---

### L5. Razorpay ondismiss Callback Marks Order as Complete

| | |
|---|---|
| **File** | `apps/web/app/checkout/page.tsx` :163–168 |

Closing the Razorpay modal marks the order complete. Only the `handler` (successful payment) callback should do this.

---

### L6. Quantity Has No Upper Bound

| | |
|---|---|
| **File** | `apps/web/app/products/[id]/page.tsx` :287 |

Quantity can be set to 99999. Cap at `product.stock`.

---

### L7. Legacy `public_html/` Directory Contains debug.txt in Web Root

| | |
|---|---|
| **File** | `public_html/debug.txt`, `public_html/send_mail.php` :2 |

`send_mail.php` writes POST data to `debug.txt` which is publicly accessible.

**Fix:** Delete `public_html/` entirely from the repository.

---

### L8. Dual Lock Files and TypeScript Strict Mode Disabled

| | |
|---|---|
| **File** | `package-lock.json` + `pnpm-lock.yaml`, `apps/api/tsconfig.json` :13–16 |

Remove `package-lock.json` (use only `pnpm-lock.yaml`). Enable TypeScript strict mode incrementally.

---

## Clean Areas (No Findings)

The following categories were reviewed and found to be **clean**:

| Category | Assessment |
|----------|-----------|
| **Prisma schema design** | Foreign keys properly defined, relationships correct. Passwords bcrypt-hashed before storage. |
| **Dependency versions** | All npm packages are recent with no known critical CVEs. `bcrypt` ^5.1, `@nestjs/throttler` ^6.5, `razorpay` ^2.9, `passport-jwt` ^4.0 all current. |
| **XSS in React JSX** | React's default JSX escaping handles most XSS. No use of `dangerouslySetInnerHTML`. User input in JSX is properly escaped. |
| **SQL injection via Prisma** | All database queries use Prisma's parameterized query builder. No raw SQL queries with string interpolation (except the recommended fix in H4). |
| **Mobile app token storage** | Uses `expo-secure-store` (encrypted keychain storage) — proper implementation. |
| **Cart/Wishlist context integrity** | localStorage-backed but no security-critical operations. Data is non-sensitive (product IDs, quantities). |

---

## Remediation Priority

### Immediate (Before ANY deployment)
1. **Rotate ALL credentials** — Supabase password, JWT secrets, MySQL password, Razorpay keys (C6, C7)
2. **Fix hardcoded JWT fallback** — throw error if env var missing (C2)
3. **Add admin guard to product endpoints** — `RolesGuard` + `@Roles('ADMIN')` (C1)
4. **Add admin auth gate on web** — `admin/layout.tsx` role check (C5)
5. **Fix payment IDOR** — verify order ownership (C3)
6. **Replace Math.random with crypto.randomInt** (C4)

### Before Beta Launch
7. Add helmet + security headers (H5)
8. Disable Swagger in production (H6)
9. Fix Razorpay webhook verification — timing-safe + raw body (C8)
10. Add stricter rate limiting on auth endpoints (H3)
11. Wrap order creation in Prisma transaction (H4)
12. Invalidate refresh tokens on password change (H2)
13. Restrict `GET /users/:id` to admins (H1)

### Before Production Launch
14. Add CSP headers
15. Remove mock auth fallback
16. Implement account lockout
17. Move tokens from localStorage to httpOnly cookies
18. Add global exception filter
19. Remove `public_html/` from git history
20. Remove hardcoded demo credentials
21. Add SRI to third-party scripts
