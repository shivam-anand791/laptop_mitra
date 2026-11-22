# Laptop Mitra — Email Transport, Deliverability & Operations Guide

This guide details the complete configuration, DNS record setup, environment variables, Firebase alignment, and operational procedures for outbound email delivery across **Render (API)**, **Vercel (Web)**, and **Mobile**.

---

## 1. Environment Variables Reference

> [!IMPORTANT]
> Never commit live `.env` files or API keys into git. Secrets must be configured exclusively in the Render and Vercel dashboards.

### A. Render (Backend API Web Service: `laptopmitra-api`)

| Environment Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `MAIL_PROVIDER` | `resend` | Active provider. In production/Render, SMTP is blocked; Resend HTTP API is mandatory. |
| `RESEND_API_KEY` | `re_live_xxxxxxxxxxxxxxxxxxxxxxxx` | Production API key generated from the [Resend Dashboard](https://resend.com/api-keys). |
| `MAIL_FROM` | `Laptop Mitra <noreply@mail.laptopmitra.in>` | Branded sender header. **Must be on a verified custom subdomain, NEVER on `@gmail.com`.** |
| `MAIL_REPLY_TO` | `support@laptopmitra.in` | Routes customer replies to your customer support inbox. |
| `APP_PUBLIC_URL` | `https://laptop-mitra.vercel.app` | Base URL used to construct verification and password reset links. Must be `https://` outside localhost. |
| `ENABLE_EMAIL_VERIFICATION` | `true` | Advertises `email-verification` capability on `/health` and activates verification endpoints. |
| `SUPPORT_EMAIL` | `support@laptopmitra.in` | Support contact email embedded in email footers and error states. |
| `SUPPORT_PHONE` | `+91 7701993300` | Support phone number embedded in email templates. |
| `FIREBASE_PROJECT_ID` | `laptop-mitra` | Production Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@laptop-mitra.iam.gserviceaccount.com` | Service account email. |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n..."` | Service account private key formatted with literal `\n`. |

### B. Vercel (Frontend Next.js App: `laptop-mitra`)

| Environment Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://laptopmitra-api.onrender.com` | Base URL of the deployed Render API. |
| `NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION` | `false` (default) or `true` | Enforces email verification gate on checkout (default `false` to avoid blocking purchases). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Web API key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `laptop-mitra.firebaseapp.com` | Firebase Auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `laptop-mitra` | Matches backend Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:...:web:...` | Firebase Web application ID. |

### C. Local Development (`apps/api/.env.development`)

| Environment Variable | Development Default | Description |
| :--- | :--- | :--- |
| `MAIL_PROVIDER` | `stdout` (or `smtp`) | In dev, stdout logs outgoing messages with masked credentials. |
| `ALLOW_REAL_EMAILS` | `false` | When `false`, intercepts and logs emails locally without contacting external providers. |
| `APP_PUBLIC_URL` | `http://localhost:3000` | Local web origin for link generation testing. |

---

## 2. Resend Setup & DNS Configuration

### Why Use a Sending Subdomain (`mail.laptopmitra.in`)?
1. **Zero Collision with Google Workspace / Business Email:**
   If your primary domain (`laptopmitra.in`) uses Google Workspace for staff email, it already has root MX records (`ASPMX.L.GOOGLE.COM`). Adding transactional MX records to the root apex will break incoming business email!
2. **Reputation Isolation:**
   Using a dedicated subdomain (`mail.laptopmitra.in` or `outbound.laptopmitra.in`) isolates transactional notifications (signups, receipts) from general marketing and day-to-day corporate communication.

### Step-by-Step Domain Verification

1. Go to the [Resend Dashboard](https://resend.com/domains) and click **"Add Domain"**.
2. Enter your subdomain: `mail.laptopmitra.in`.
3. Choose your primary region (e.g. `ap-south-1` or `us-east-1`).
4. Add the **3 DNS records** provided by Resend to your DNS manager (Cloudflare, GoDaddy, Namecheap, or Hostinger):

| Record Type | Name / Host | Value / Target | Priority | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **MX** | `mail` (or `mail.laptopmitra.in`) | `feedback-smtp.resend.com` | `10` | Bounce handling and feedback loops. |
| **TXT** | `mail` (or `mail.laptopmitra.in`) | `v=spf1 include:amazonses.com ~all` | — | **SPF:** Authorizes Resend/Amazon SES to send on behalf of the subdomain. |
| **TXT** | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...` | — | **DKIM:** Cryptographic signature proving email authenticity. |

5. Add a **DMARC Record** on your primary apex domain or subdomain:

| Record Type | Name / Host | Value / Content | Purpose |
| :--- | :--- | :--- | :--- |
| **TXT** | `_dmarc` (or `_dmarc.laptopmitra.in`) | `v=DMARC1; p=none; rua=mailto:dmarc-reports@laptopmitra.in; aspf=r;` | **DMARC:** Specifies policy and sends aggregate delivery reports. |

> [!TIP]
> Start with `p=none` (monitoring mode). Once you verify that SPF and DKIM pass consistently on all outbound mail, you can graduate to `p=quarantine` or `p=reject` for strict anti-spoofing enforcement.

6. In the Resend Dashboard, click **"Verify DNS Records"**. Once verified, the domain badge turns green (`Verified`).

---

## 3. Firebase Console Configuration Checklist

1. **Authorized Domains:**
   - In [Firebase Console](https://console.firebase.google.com/) -> **Authentication** -> **Settings** -> **Authorized domains**.
   - Ensure the following origins are added:
     - `laptopmitra.in`
     - `www.laptopmitra.in`
     - `laptop-mitra.vercel.app`
     - `localhost`
   - *Without these, Firebase Auth action links and OAuth handlers will be rejected with an unauthorized domain error.*

2. **Custom Email Sender Domain (Optional for Firebase client emails):**
   - In **Authentication** -> **Templates** -> Click on any email template -> Click the pencil icon next to **From**:
   - Customize the sender address to `noreply@mail.laptopmitra.in`.
   - Complete the Firebase DNS verification (CNAME records for SPF/DKIM) if you wish Firebase's fallback client emails to also use the custom subdomain.

---

## 4. Troubleshooting & Reason Code Matrix

The system emits standardized reason codes across the API, client SDK, and application logs:

| Reason Code / Error | Underlying Root Cause | Resolution Action |
| :--- | :--- | :--- |
| `MAIL_NOT_CONFIGURED` | `RESEND_API_KEY` is missing in production environment variables. | Add `RESEND_API_KEY` to Render Web Service environment variables and trigger redeploy. |
| `MAIL_DOMAIN_NOT_VERIFIED` | `MAIL_FROM` specifies a domain not yet verified in the Resend dashboard. | Verify the domain in Resend Dashboard and ensure DNS MX/TXT records have propagated. |
| `MAIL_RECIPIENT_NOT_ALLOWED` | Resend account is operating in sandbox mode and attempt was made to send to an external recipient. | In sandbox mode, Resend only permits sending to the account owner's email address. Complete domain verification to send to arbitrary recipients. |
| `MAIL_PROVIDER_UNAVAILABLE` | Network timeout (>10s), Render DNS resolution failure, or Resend 5xx service outage. | Check Render outbound internet status. The API automatically retries transient errors up to 3 times with backoff. |
| `MAIL_RATE_LIMITED` | Exceeded Resend free tier rate limit (2 req/sec) or per-user 60s resend cooldown. | Wait for the cooldown timer (indicated in UI) before resending. |
| `TOKEN_WRONG_PROJECT` | Firebase ID token was issued by a different project than configured backend `FIREBASE_PROJECT_ID`. | Ensure `NEXT_PUBLIC_FIREBASE_PROJECT_ID` on Vercel matches `FIREBASE_PROJECT_ID` on Render. |
| `TOKEN_EXPIRED` | User's Firebase ID token has expired (>1 hour). | Client automatically calls `getIdToken(true)` to refresh the session token. |
| `DATABASE_UNAVAILABLE` | PostgreSQL connection pool on Render/Supabase sleeping or exhausted. | Check PostgreSQL service health. Readiness endpoint `/health/ready` returns 503 until connected. |

---

## 5. Seed-Mailbox Deliverability Verification Protocol

Before going live with customer traffic, perform an inbox test using both a **Gmail** and an **Outlook** seed account:

1. **Send Test Message:**
   - Use the Admin test action or request a verification link for `yourname+test@gmail.com` and `yourname+test@outlook.com`.
2. **Inspect Gmail Headers:**
   - Open the email in Gmail web.
   - Click the three vertical dots (More) next to the reply button -> Select **"Show original"**.
   - Check the header summary box at the top:
     - **SPF:** `PASS with IP ...`
     - **DKIM:** `'PASS' with domain mail.laptopmitra.in`
     - **DMARC:** `'PASS'`
   - Confirm that the email landed in the **Primary inbox** (not Spam).
3. **Inspect Outlook / Hotmail Headers:**
   - Open the email in Outlook web.
   - Click the three dots -> **View** -> **View message details**.
   - Search for `Authentication-Results:` in the text.
   - Confirm `spf=pass`, `dkim=pass`, and `dmarc=pass`.

---

## 6. Daily Quota Monitoring & Rate Limits

- **Resend Free Tier Quota:**
  - **100 emails / day** (resets at 00:00 UTC).
  - **3,000 emails / month**.
  - **2 requests / second** max burst rate.
- **Built-in Quota Alarms:**
  - `MailService` tracks daily outbound sends automatically.
  - At **80 sends (80%)**, a warning log `[MailService:QuotaWarning]` is emitted.
  - At **100 sends (100%)**, an error log `[MailService:QuotaExceeded]` is emitted.
  - The health readiness probe (`GET /health/ready`) exposes live `mailMetrics` (sends today, failure count, degraded flag) for external uptime monitors (e.g. BetterStack, UptimeRobot).
- **Plan Upgrade Recommendation:**
  - When daily active signups or transactional orders exceed 50/day, upgrade Resend to the **Pro Plan** ($20/month for 50,000 emails/month with dedicated IP options).

