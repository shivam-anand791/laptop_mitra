import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { envSchema } from './schema.ts';

/**
 * These tests pin the security guards in the env schema. They are not
 * incidental: each one corresponds to an entry in
 * rules/07-ask-before-doing-this.md that we enforce in code.
 */

const SECRET_A = 'a'.repeat(48);
const SECRET_B = 'b'.repeat(48);

/** A configuration that is expected to be valid. */
const baseEnv = {
  NODE_ENV: 'development',
  WEB_APP_URL: 'http://localhost:3000',
  API_PUBLIC_URL: 'http://localhost:3001',
  CORS_ORIGINS: 'http://localhost:3000',
  DATABASE_URL: 'mysql://user:pass@localhost:3306/laptopmitra_dev',
  JWT_ACCESS_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
  RAZORPAY_KEY_ID: 'rzp_test_abc123',
  RAZORPAY_KEY_SECRET: 'sandbox_secret_value',
  RAZORPAY_WEBHOOK_SECRET: 'webhook_secret_value',
  MAIL_DRIVER: 'console',
  STORAGE_DRIVER: 'cloudinary',
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
} as const;

/** Asserts the parse failed with an issue on `path`, and returns its message. */
function expectIssue(env: Record<string, unknown>, path: string): string {
  const result = envSchema.safeParse(env);
  assert.equal(result.success, false, `expected validation to fail on "${path}"`);
  const issue = result.error!.issues.find((i) => i.path.join('.') === path);
  assert.ok(issue, `expected an issue on "${path}", got: ${JSON.stringify(result.error!.issues)}`);
  return issue.message;
}

describe('env schema — baseline', () => {
  it('accepts a valid sandbox development configuration', () => {
    const result = envSchema.safeParse(baseEnv);
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });

  it('applies documented defaults', () => {
    const env = envSchema.parse(baseEnv);
    assert.equal(env.PORT, 3001);
    assert.equal(env.BCRYPT_ROUNDS, 12);
    assert.equal(env.OTP_LENGTH, 6);
    assert.equal(env.ALLOW_LIVE_PAYMENT_KEYS, false);
    assert.equal(env.ALLOW_REAL_EMAILS, false);
  });
});

describe('hard stop: live Razorpay keys (rules/07 #3, #5)', () => {
  it('rejects a live key in development', () => {
    const msg = expectIssue(
      { ...baseEnv, RAZORPAY_KEY_ID: 'rzp_live_realkey' },
      'RAZORPAY_KEY_ID',
    );
    assert.match(msg, /sandbox key/i);
  });

  it('rejects a live key even when ALLOW_LIVE_PAYMENT_KEYS=true outside production', () => {
    expectIssue(
      { ...baseEnv, RAZORPAY_KEY_ID: 'rzp_live_realkey', ALLOW_LIVE_PAYMENT_KEYS: 'true' },
      'RAZORPAY_KEY_ID',
    );
  });

  it('rejects a live key in production without the explicit opt-in', () => {
    expectIssue(
      {
        ...baseEnv,
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'rzp_live_realkey',
        CORS_ORIGINS: 'https://laptopmitra.com',
      },
      'RAZORPAY_KEY_ID',
    );
  });

  it('allows a live key only in production with the explicit opt-in', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      NODE_ENV: 'production',
      RAZORPAY_KEY_ID: 'rzp_live_realkey',
      ALLOW_LIVE_PAYMENT_KEYS: 'true',
      CORS_ORIGINS: 'https://laptopmitra.com',
    });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });

  it('rejects a malformed key that is neither test nor live', () => {
    expectIssue({ ...baseEnv, RAZORPAY_KEY_ID: 'totally_wrong' }, 'RAZORPAY_KEY_ID');
  });

  it('requires a webhook secret so signatures can be verified', () => {
    const { RAZORPAY_WEBHOOK_SECRET: _omitted, ...withoutSecret } = baseEnv;
    expectIssue(withoutSecret, 'RAZORPAY_WEBHOOK_SECRET');
  });
});

describe('hard stop: sending real email (rules/07 #8)', () => {
  it('rejects smtp in development without the explicit opt-in', () => {
    const msg = expectIssue(
      {
        ...baseEnv,
        MAIL_DRIVER: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '465',
        SMTP_USER: 'u',
        SMTP_PASS: 'p',
        MAIL_FROM: 'no-reply@example.com',
      },
      'MAIL_DRIVER',
    );
    assert.match(msg, /real email/i);
  });

  it('allows smtp in development with ALLOW_REAL_EMAILS=true', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      MAIL_DRIVER: 'smtp',
      ALLOW_REAL_EMAILS: 'true',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_USER: 'u',
      SMTP_PASS: 'p',
      MAIL_FROM: 'no-reply@example.com',
    });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });

  it('requires SMTP settings when the smtp driver is selected', () => {
    expectIssue({ ...baseEnv, MAIL_DRIVER: 'smtp', ALLOW_REAL_EMAILS: 'true' }, 'SMTP_HOST');
  });
});

describe('secrets hygiene', () => {
  it('rejects placeholder values copied from .env.example', () => {
    expectIssue(
      { ...baseEnv, JWT_ACCESS_SECRET: 'changeme_generate_a_48_byte_random_secret_here' },
      'JWT_ACCESS_SECRET',
    );
  });

  it('rejects a placeholder that appears after a valid-looking prefix', () => {
    // Regression: `rzp_test_changeme` from .env.example passed an earlier
    // start-of-string-only placeholder check.
    expectIssue({ ...baseEnv, RAZORPAY_KEY_ID: 'rzp_test_changeme' }, 'RAZORPAY_KEY_ID');
  });

  it('does not flag a legitimate high-entropy secret as a placeholder', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      JWT_ACCESS_SECRET: 'Xk9-vQ2mZp7Lw4Rt8Ns1Bd6Hy3Jc0Ff5Gg_AaEeIiOoUu2Zz',
      JWT_REFRESH_SECRET: 'Qw3-nMb8Kx2Vc5Zl9Pd4Rt7Hy1Jf6Gs0Aa_BbCcDdEeFf3Yy',
    });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    expectIssue({ ...baseEnv, JWT_ACCESS_SECRET: 'tooshort' }, 'JWT_ACCESS_SECRET');
  });

  it('rejects reusing one secret for both access and refresh tokens', () => {
    const msg = expectIssue(
      { ...baseEnv, JWT_REFRESH_SECRET: SECRET_A },
      'JWT_REFRESH_SECRET',
    );
    assert.match(msg, /must differ/i);
  });

  it('rejects a non-mysql DATABASE_URL', () => {
    expectIssue({ ...baseEnv, DATABASE_URL: 'postgres://u:p@localhost/db' }, 'DATABASE_URL');
  });

  it('rejects a bcrypt cost factor below 10', () => {
    expectIssue({ ...baseEnv, BCRYPT_ROUNDS: '4' }, 'BCRYPT_ROUNDS');
  });
});

describe('production configuration guards', () => {
  const prodEnv = {
    ...baseEnv,
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://laptopmitra.com',
  };

  it('rejects wildcard CORS in production', () => {
    const msg = expectIssue({ ...prodEnv, CORS_ORIGINS: '*' }, 'CORS_ORIGINS');
    assert.match(msg, /wildcard/i);
  });

  it('rejects a wildcard hidden in a longer origin list', () => {
    expectIssue({ ...prodEnv, CORS_ORIGINS: 'https://laptopmitra.com, *' }, 'CORS_ORIGINS');
  });

  it('allows wildcard CORS in development', () => {
    const result = envSchema.safeParse({ ...baseEnv, CORS_ORIGINS: '*' });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });

  it('rejects local disk storage in production', () => {
    const msg = expectIssue({ ...prodEnv, STORAGE_DRIVER: 'local' }, 'STORAGE_DRIVER');
    assert.match(msg, /not allowed in production/i);
  });

  it('allows local disk storage in development', () => {
    const result = envSchema.safeParse({ ...baseEnv, STORAGE_DRIVER: 'local' });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });
});

describe('storage driver completeness', () => {
  it('requires Cloudinary credentials when the cloudinary driver is selected', () => {
    const { CLOUDINARY_API_KEY: _omitted, ...withoutKey } = baseEnv;
    expectIssue(withoutKey, 'CLOUDINARY_API_KEY');
  });

  it('requires S3 credentials when the s3 driver is selected', () => {
    expectIssue({ ...baseEnv, STORAGE_DRIVER: 's3' }, 'S3_BUCKET');
  });
});

describe('blank .env entries', () => {
  it('treats an unused optional URL left blank as unset, not as an invalid URL', () => {
    // Regression: dotenv yields '' for `S3_PUBLIC_BASE_URL=` in the template,
    // which previously failed .url() and blocked startup on a valid config.
    const result = envSchema.safeParse({
      ...baseEnv,
      STORAGE_DRIVER: 'local',
      S3_PUBLIC_BASE_URL: '',
      MAIL_FROM: '',
      SMTP_PORT: '',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });

  it('still rejects a blank value for a genuinely required secret', () => {
    expectIssue({ ...baseEnv, JWT_ACCESS_SECRET: '' }, 'JWT_ACCESS_SECRET');
  });

  it('still rejects a non-empty but malformed optional URL', () => {
    expectIssue(
      { ...baseEnv, STORAGE_DRIVER: 'local', S3_PUBLIC_BASE_URL: 'not-a-url' },
      'S3_PUBLIC_BASE_URL',
    );
  });
});
