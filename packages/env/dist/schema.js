import { z } from 'zod';
/**
 * Environment schema for the LaptopMitra backend.
 *
 * Design rules (see rules/01-security-rules.md and rules/07-ask-before-doing-this.md):
 *  - No secret has a default value. A missing secret is a startup failure, never
 *    a silent fallback to something insecure.
 *  - Several entries encode "ask before doing this" hard stops as runtime guards,
 *    so an unsafe configuration cannot start the process by accident.
 */
const nonEmpty = (label) => z.string().min(1, `${label} must not be empty`);
/** Rejects the placeholder values shipped in .env.example. */
const notPlaceholder = (value) => !/^(changeme|change_me|replace[-_]?me|your[-_]|xxx+|todo|placeholder)/i.test(value.trim());
export const BooleanFromString = z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .describe('literal string "true" or "false"');
export const envSchema = z
    .object({
    // ---------------------------------------------------------------------
    // Runtime
    // ---------------------------------------------------------------------
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(3001),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    /** Public origin of the Next.js web app. Used for links in emails and CORS. */
    WEB_APP_URL: z.string().url(),
    /** Public origin of this API. Used to build Razorpay webhook/callback URLs. */
    API_PUBLIC_URL: z.string().url(),
    /** Comma-separated explicit allow-list. Wildcards are rejected in production. */
    CORS_ORIGINS: nonEmpty('CORS_ORIGINS'),
    // ---------------------------------------------------------------------
    // Database
    // ---------------------------------------------------------------------
    DATABASE_URL: z
        .string()
        .refine((v) => v.startsWith('mysql://'), 'DATABASE_URL must be a mysql:// connection string')
        .refine(notPlaceholder, 'DATABASE_URL still contains a placeholder value'),
    // ---------------------------------------------------------------------
    // Auth / JWT
    // ---------------------------------------------------------------------
    JWT_ACCESS_SECRET: z
        .string()
        .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
        .refine(notPlaceholder, 'JWT_ACCESS_SECRET still contains a placeholder value'),
    JWT_REFRESH_SECRET: z
        .string()
        .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
        .refine(notPlaceholder, 'JWT_REFRESH_SECRET still contains a placeholder value'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('30d'),
    /** bcrypt cost factor. 12 is a sane 2026 default; below 10 is rejected. */
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    // ---------------------------------------------------------------------
    // OTP
    // ---------------------------------------------------------------------
    OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
    OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(600).default(60),
    // ---------------------------------------------------------------------
    // Payments — Razorpay
    // ---------------------------------------------------------------------
    RAZORPAY_KEY_ID: nonEmpty('RAZORPAY_KEY_ID').refine(notPlaceholder, 'RAZORPAY_KEY_ID still contains a placeholder value'),
    RAZORPAY_KEY_SECRET: nonEmpty('RAZORPAY_KEY_SECRET').refine(notPlaceholder, 'RAZORPAY_KEY_SECRET still contains a placeholder value'),
    /** Required to verify webhook signatures. Never optional — unverified webhooks are forgeable. */
    RAZORPAY_WEBHOOK_SECRET: nonEmpty('RAZORPAY_WEBHOOK_SECRET').refine(notPlaceholder, 'RAZORPAY_WEBHOOK_SECRET still contains a placeholder value'),
    /**
     * Hard stop (rules/07 #3, #5): live payment keys are refused unless this is
     * explicitly set to true AND NODE_ENV=production. Prevents charging real
     * cards from a dev or test run.
     */
    ALLOW_LIVE_PAYMENT_KEYS: BooleanFromString.default('false'),
    // ---------------------------------------------------------------------
    // Mail
    // ---------------------------------------------------------------------
    /** 'console' writes the email to the log instead of sending it. */
    MAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
    MAIL_FROM: z.string().email().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().max(65535).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: BooleanFromString.default('true'),
    /**
     * Hard stop (rules/07 #8): sending real email from a non-production
     * environment requires an explicit opt-in.
     */
    ALLOW_REAL_EMAILS: BooleanFromString.default('false'),
    // ---------------------------------------------------------------------
    // File storage
    // ---------------------------------------------------------------------
    /**
     * 'local' exists only for offline development. The migration brief requires
     * that production not use local disk storage, enforced below.
     */
    STORAGE_DRIVER: z.enum(['cloudinary', 's3', 'local']).default('cloudinary'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_UPLOAD_FOLDER: z.string().default('laptopmitra'),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().url().optional(),
    /** Upload constraints. Enforced by content sniffing, not by file extension. */
    UPLOAD_MAX_BYTES: z.coerce
        .number()
        .int()
        .positive()
        .default(5 * 1024 * 1024),
    // ---------------------------------------------------------------------
    // Rate limiting
    // ---------------------------------------------------------------------
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
})
    // -----------------------------------------------------------------------
    // Cross-field guards
    // -----------------------------------------------------------------------
    .superRefine((env, ctx) => {
    const isProd = env.NODE_ENV === 'production';
    // --- Hard stop: live Razorpay keys outside production -----------------
    const looksLive = env.RAZORPAY_KEY_ID.startsWith('rzp_live_') || !env.RAZORPAY_KEY_ID.startsWith('rzp_test_');
    if (looksLive && !(isProd && env.ALLOW_LIVE_PAYMENT_KEYS)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['RAZORPAY_KEY_ID'],
            message: 'Refusing to start: RAZORPAY_KEY_ID is not a rzp_test_ sandbox key. ' +
                'Live keys require NODE_ENV=production AND ALLOW_LIVE_PAYMENT_KEYS=true. ' +
                'See rules/07-ask-before-doing-this.md — this is a stop-and-confirm action.',
        });
    }
    // --- Hard stop: real email sending outside production -----------------
    if (env.MAIL_DRIVER === 'smtp' && !isProd && !env.ALLOW_REAL_EMAILS) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['MAIL_DRIVER'],
            message: 'Refusing to start: MAIL_DRIVER=smtp outside production would send real email to real ' +
                'addresses. Use MAIL_DRIVER=console, or set ALLOW_REAL_EMAILS=true to override.',
        });
    }
    if (env.MAIL_DRIVER === 'smtp') {
        for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']) {
            if (!env[key]) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [key],
                    message: `${key} is required when MAIL_DRIVER=smtp`,
                });
            }
        }
    }
    // --- Storage driver completeness -------------------------------------
    if (env.STORAGE_DRIVER === 'cloudinary') {
        for (const key of [
            'CLOUDINARY_CLOUD_NAME',
            'CLOUDINARY_API_KEY',
            'CLOUDINARY_API_SECRET',
        ]) {
            if (!env[key]) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [key],
                    message: `${key} is required when STORAGE_DRIVER=cloudinary`,
                });
            }
        }
    }
    if (env.STORAGE_DRIVER === 's3') {
        for (const key of [
            'S3_REGION',
            'S3_BUCKET',
            'S3_ACCESS_KEY_ID',
            'S3_SECRET_ACCESS_KEY',
        ]) {
            if (!env[key]) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [key],
                    message: `${key} is required when STORAGE_DRIVER=s3`,
                });
            }
        }
    }
    if (env.STORAGE_DRIVER === 'local' && isProd) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['STORAGE_DRIVER'],
            message: 'STORAGE_DRIVER=local is not allowed in production. Use cloudinary or s3 — the ' +
                'migration brief requires moving off local disk storage.',
        });
    }
    // --- CORS: never wildcard in production ------------------------------
    if (isProd && env.CORS_ORIGINS.split(',').some((o) => o.trim() === '*')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: 'Wildcard CORS origin "*" is not allowed in production. The API sends credentials, and ' +
                '"*" combined with credentials is an account-takeover vector. Use an explicit allow-list.',
        });
    }
    // --- Distinct JWT secrets --------------------------------------------
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['JWT_REFRESH_SECRET'],
            message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET. Reusing one secret lets an ' +
                'access token be replayed as a refresh token.',
        });
    }
});
//# sourceMappingURL=schema.js.map