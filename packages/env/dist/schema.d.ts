import { z } from 'zod';
export declare const BooleanFromString: z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">;
export declare const envSchema: z.ZodEffects<z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["fatal", "error", "warn", "info", "debug", "trace"]>>;
    /** Public origin of the Next.js web app. Used for links in emails and CORS. */
    WEB_APP_URL: z.ZodString;
    /** Public origin of this API. Used to build Razorpay webhook/callback URLs. */
    API_PUBLIC_URL: z.ZodString;
    /** Comma-separated explicit allow-list. Wildcards are rejected in production. */
    CORS_ORIGINS: z.ZodString;
    DATABASE_URL: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    JWT_ACCESS_SECRET: z.ZodEffects<z.ZodString, string, string>;
    JWT_REFRESH_SECRET: z.ZodEffects<z.ZodString, string, string>;
    JWT_ACCESS_TTL: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_TTL: z.ZodDefault<z.ZodString>;
    /** bcrypt cost factor. 12 is a sane 2026 default; below 10 is rejected. */
    BCRYPT_ROUNDS: z.ZodDefault<z.ZodNumber>;
    OTP_LENGTH: z.ZodDefault<z.ZodNumber>;
    OTP_TTL_MINUTES: z.ZodDefault<z.ZodNumber>;
    OTP_MAX_ATTEMPTS: z.ZodDefault<z.ZodNumber>;
    OTP_RESEND_COOLDOWN_SECONDS: z.ZodDefault<z.ZodNumber>;
    RAZORPAY_KEY_ID: z.ZodEffects<z.ZodString, string, string>;
    RAZORPAY_KEY_SECRET: z.ZodEffects<z.ZodString, string, string>;
    /** Required to verify webhook signatures. Never optional — unverified webhooks are forgeable. */
    RAZORPAY_WEBHOOK_SECRET: z.ZodEffects<z.ZodString, string, string>;
    /**
     * Hard stop (rules/07 #3, #5): live payment keys are refused unless this is
     * explicitly set to true AND NODE_ENV=production. Prevents charging real
     * cards from a dev or test run.
     */
    ALLOW_LIVE_PAYMENT_KEYS: z.ZodDefault<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    /** 'console' writes the email to the log instead of sending it. */
    MAIL_DRIVER: z.ZodDefault<z.ZodEnum<["console", "smtp"]>>;
    MAIL_FROM: z.ZodOptional<z.ZodString>;
    SMTP_HOST: z.ZodOptional<z.ZodString>;
    SMTP_PORT: z.ZodOptional<z.ZodNumber>;
    SMTP_USER: z.ZodOptional<z.ZodString>;
    SMTP_PASS: z.ZodOptional<z.ZodString>;
    SMTP_SECURE: z.ZodDefault<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    /**
     * Hard stop (rules/07 #8): sending real email from a non-production
     * environment requires an explicit opt-in.
     */
    ALLOW_REAL_EMAILS: z.ZodDefault<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    /**
     * 'local' exists only for offline development. The migration brief requires
     * that production not use local disk storage, enforced below.
     */
    STORAGE_DRIVER: z.ZodDefault<z.ZodEnum<["cloudinary", "s3", "local"]>>;
    CLOUDINARY_CLOUD_NAME: z.ZodOptional<z.ZodString>;
    CLOUDINARY_API_KEY: z.ZodOptional<z.ZodString>;
    CLOUDINARY_API_SECRET: z.ZodOptional<z.ZodString>;
    CLOUDINARY_UPLOAD_FOLDER: z.ZodDefault<z.ZodString>;
    S3_REGION: z.ZodOptional<z.ZodString>;
    S3_BUCKET: z.ZodOptional<z.ZodString>;
    S3_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    S3_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    S3_PUBLIC_BASE_URL: z.ZodOptional<z.ZodString>;
    /** Upload constraints. Enforced by content sniffing, not by file extension. */
    UPLOAD_MAX_BYTES: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_WINDOW_SECONDS: z.ZodDefault<z.ZodNumber>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
    WEB_APP_URL: string;
    API_PUBLIC_URL: string;
    CORS_ORIGINS: string;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_TTL: string;
    JWT_REFRESH_TTL: string;
    BCRYPT_ROUNDS: number;
    OTP_LENGTH: number;
    OTP_TTL_MINUTES: number;
    OTP_MAX_ATTEMPTS: number;
    OTP_RESEND_COOLDOWN_SECONDS: number;
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    RAZORPAY_WEBHOOK_SECRET: string;
    ALLOW_LIVE_PAYMENT_KEYS: boolean;
    MAIL_DRIVER: "console" | "smtp";
    SMTP_SECURE: boolean;
    ALLOW_REAL_EMAILS: boolean;
    STORAGE_DRIVER: "cloudinary" | "s3" | "local";
    CLOUDINARY_UPLOAD_FOLDER: string;
    UPLOAD_MAX_BYTES: number;
    RATE_LIMIT_WINDOW_SECONDS: number;
    RATE_LIMIT_MAX: number;
    MAIL_FROM?: string | undefined;
    SMTP_HOST?: string | undefined;
    SMTP_PORT?: number | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
    S3_REGION?: string | undefined;
    S3_BUCKET?: string | undefined;
    S3_ACCESS_KEY_ID?: string | undefined;
    S3_SECRET_ACCESS_KEY?: string | undefined;
    S3_PUBLIC_BASE_URL?: string | undefined;
}, {
    WEB_APP_URL: string;
    API_PUBLIC_URL: string;
    CORS_ORIGINS: string;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    RAZORPAY_WEBHOOK_SECRET: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    LOG_LEVEL?: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | undefined;
    JWT_ACCESS_TTL?: string | undefined;
    JWT_REFRESH_TTL?: string | undefined;
    BCRYPT_ROUNDS?: number | undefined;
    OTP_LENGTH?: number | undefined;
    OTP_TTL_MINUTES?: number | undefined;
    OTP_MAX_ATTEMPTS?: number | undefined;
    OTP_RESEND_COOLDOWN_SECONDS?: number | undefined;
    ALLOW_LIVE_PAYMENT_KEYS?: "true" | "false" | undefined;
    MAIL_DRIVER?: "console" | "smtp" | undefined;
    MAIL_FROM?: string | undefined;
    SMTP_HOST?: string | undefined;
    SMTP_PORT?: number | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
    SMTP_SECURE?: "true" | "false" | undefined;
    ALLOW_REAL_EMAILS?: "true" | "false" | undefined;
    STORAGE_DRIVER?: "cloudinary" | "s3" | "local" | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
    CLOUDINARY_UPLOAD_FOLDER?: string | undefined;
    S3_REGION?: string | undefined;
    S3_BUCKET?: string | undefined;
    S3_ACCESS_KEY_ID?: string | undefined;
    S3_SECRET_ACCESS_KEY?: string | undefined;
    S3_PUBLIC_BASE_URL?: string | undefined;
    UPLOAD_MAX_BYTES?: number | undefined;
    RATE_LIMIT_WINDOW_SECONDS?: number | undefined;
    RATE_LIMIT_MAX?: number | undefined;
}>, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
    WEB_APP_URL: string;
    API_PUBLIC_URL: string;
    CORS_ORIGINS: string;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_TTL: string;
    JWT_REFRESH_TTL: string;
    BCRYPT_ROUNDS: number;
    OTP_LENGTH: number;
    OTP_TTL_MINUTES: number;
    OTP_MAX_ATTEMPTS: number;
    OTP_RESEND_COOLDOWN_SECONDS: number;
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    RAZORPAY_WEBHOOK_SECRET: string;
    ALLOW_LIVE_PAYMENT_KEYS: boolean;
    MAIL_DRIVER: "console" | "smtp";
    SMTP_SECURE: boolean;
    ALLOW_REAL_EMAILS: boolean;
    STORAGE_DRIVER: "cloudinary" | "s3" | "local";
    CLOUDINARY_UPLOAD_FOLDER: string;
    UPLOAD_MAX_BYTES: number;
    RATE_LIMIT_WINDOW_SECONDS: number;
    RATE_LIMIT_MAX: number;
    MAIL_FROM?: string | undefined;
    SMTP_HOST?: string | undefined;
    SMTP_PORT?: number | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
    S3_REGION?: string | undefined;
    S3_BUCKET?: string | undefined;
    S3_ACCESS_KEY_ID?: string | undefined;
    S3_SECRET_ACCESS_KEY?: string | undefined;
    S3_PUBLIC_BASE_URL?: string | undefined;
}, {
    WEB_APP_URL: string;
    API_PUBLIC_URL: string;
    CORS_ORIGINS: string;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    RAZORPAY_WEBHOOK_SECRET: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    LOG_LEVEL?: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | undefined;
    JWT_ACCESS_TTL?: string | undefined;
    JWT_REFRESH_TTL?: string | undefined;
    BCRYPT_ROUNDS?: number | undefined;
    OTP_LENGTH?: number | undefined;
    OTP_TTL_MINUTES?: number | undefined;
    OTP_MAX_ATTEMPTS?: number | undefined;
    OTP_RESEND_COOLDOWN_SECONDS?: number | undefined;
    ALLOW_LIVE_PAYMENT_KEYS?: "true" | "false" | undefined;
    MAIL_DRIVER?: "console" | "smtp" | undefined;
    MAIL_FROM?: string | undefined;
    SMTP_HOST?: string | undefined;
    SMTP_PORT?: number | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
    SMTP_SECURE?: "true" | "false" | undefined;
    ALLOW_REAL_EMAILS?: "true" | "false" | undefined;
    STORAGE_DRIVER?: "cloudinary" | "s3" | "local" | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
    CLOUDINARY_UPLOAD_FOLDER?: string | undefined;
    S3_REGION?: string | undefined;
    S3_BUCKET?: string | undefined;
    S3_ACCESS_KEY_ID?: string | undefined;
    S3_SECRET_ACCESS_KEY?: string | undefined;
    S3_PUBLIC_BASE_URL?: string | undefined;
    UPLOAD_MAX_BYTES?: number | undefined;
    RATE_LIMIT_WINDOW_SECONDS?: number | undefined;
    RATE_LIMIT_MAX?: number | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
//# sourceMappingURL=schema.d.ts.map