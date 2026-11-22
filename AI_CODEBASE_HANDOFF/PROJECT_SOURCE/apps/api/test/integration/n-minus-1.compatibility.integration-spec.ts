import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { FirebaseService } from '../../src/firebase/firebase.service';
import { assertSafeDatabaseTarget } from '../../src/common/database-safety';

const REPO_MIGRATION_TO_EXCLUDE = '20261111000000_reconcile_cart_discount_otp_drift';
const N_MINUS_1_DB = 'laptopmitra_n_minus_1_test';

describe('N-1 Schema Compatibility CI Gate', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const apiRoot = resolve(__dirname, '../..');
  let nMinus1Url: string;
  let nMinus1Prisma: PrismaClient;
  let tempWorkDir: string;
  let app: INestApplication;
  let baseUrl: string;

  const customerUid = `nminus1-cust-${randomUUID()}`;
  const syncOnlyUid = `nminus1-sync-${randomUUID()}`;
  let activeProductId: string;

  async function apiRequest(
    path: string,
    init: RequestInit & { token?: string } = {},
  ): Promise<{ status: number; body: any; headers: Headers }> {
    const { token, headers, ...rest } = init;
    const res = await fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string> | undefined),
      },
    });
    const text = await res.text();
    let body: any = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // keep raw text
    }
    return { status: res.status, body, headers: res.headers };
  }

  beforeAll(async () => {
    const baseTarget = new URL(originalDatabaseUrl || '');
    if (!['localhost', '127.0.0.1', '::1'].includes(baseTarget.hostname)) {
      throw new Error('Safety stop: N-1 compatibility test requires loopback DATABASE_URL.');
    }

    const adminUrl = new URL(baseTarget);
    adminUrl.pathname = '/postgres';
    const targetUrl = new URL(baseTarget);
    targetUrl.pathname = `/${N_MINUS_1_DB}`;
    nMinus1Url = targetUrl.toString();

    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    try {
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${N_MINUS_1_DB}' AND pid <> pg_backend_pid()`,
      );
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${N_MINUS_1_DB}"`);
      await admin.$executeRawUnsafe(`CREATE DATABASE "${N_MINUS_1_DB}"`);
    } finally {
      await admin.$disconnect();
    }

    // Build an isolated Prisma workspace containing ONLY the N-1 migrations (excluding newest drift migration)
    tempWorkDir = mkdtempSync(resolve(tmpdir(), 'lm-n-minus-1-'));
    const tempPrismaDir = resolve(tempWorkDir, 'prisma');
    const tempMigrationsDir = resolve(tempPrismaDir, 'migrations');
    mkdirSync(tempMigrationsDir, { recursive: true });
    cpSync(resolve(apiRoot, 'prisma/schema.prisma'), resolve(tempPrismaDir, 'schema.prisma'));
    const lockFile = resolve(apiRoot, 'prisma/migrations/migration_lock.toml');
    if (existsSync(lockFile)) {
      cpSync(lockFile, resolve(tempMigrationsDir, 'migration_lock.toml'));
    }

    const sourceMigrationsDir = resolve(apiRoot, 'prisma/migrations');
    const migrationDirs = readdirSync(sourceMigrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== REPO_MIGRATION_TO_EXCLUDE)
      .map((d) => d.name)
      .sort();

    for (const dirName of migrationDirs) {
      cpSync(resolve(sourceMigrationsDir, dirName), resolve(tempMigrationsDir, dirName), {
        recursive: true,
      });
    }

    process.env.DATABASE_URL = nMinus1Url;
    assertSafeDatabaseTarget();

    const migrateResult = spawnSync(
      process.execPath,
      [
        require.resolve('prisma'),
        'migrate',
        'deploy',
        '--schema',
        resolve(tempPrismaDir, 'schema.prisma'),
      ],
      {
        cwd: apiRoot,
        env: { ...process.env, DATABASE_URL: nMinus1Url },
        stdio: 'pipe',
        shell: false,
      },
    );
    if (migrateResult.error) throw migrateResult.error;
    if (migrateResult.status !== 0) {
      throw new Error(
        `N-1 migrate deploy failed: ${migrateResult.stderr?.toString() || migrateResult.stdout?.toString()}`,
      );
    }

    nMinus1Prisma = new PrismaClient({ datasources: { db: { url: nMinus1Url } } });
    await nMinus1Prisma.$connect();

    const category = await nMinus1Prisma.category.create({
      data: {
        name: 'N-1 Laptops',
        slug: `nminus1-cat-${randomUUID().slice(0, 8)}`,
      },
    });
    const product = await nMinus1Prisma.product.create({
      data: {
        name: 'Dell Latitude N-1 Test',
        slug: `nminus1-lat-${randomUUID().slice(0, 8)}`,
        description: 'Compatible N-1 product',
        price: 34999,
        sku: `LM-NM1-${randomUUID().slice(0, 8)}`,
        stock: 20,
        status: 'ACTIVE',
        categoryId: category.id,
      },
    });
    activeProductId = product.id;

    await nMinus1Prisma.user.create({
      data: {
        email: `nminus1-cust-${randomUUID()}@example.test`,
        firebaseUid: customerUid,
        referralCode: `NM${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        name: 'N-1 Customer',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    const mockFirebaseService = {
      verifyIdToken: jest.fn(async (token: string) => {
        if (token === 'token-nminus1-cust') {
          return { uid: customerUid, email: 'nminus1-cust@example.test', name: 'N-1 Customer' };
        }
        if (token === 'token-nminus1-sync') {
          return { uid: syncOnlyUid, email: `sync-${randomUUID()}@example.test`, name: 'Sync User' };
        }
        throw new Error('Unauthorized');
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');
    const addr = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await app?.close();
    await nMinus1Prisma?.$disconnect();
    process.env.DATABASE_URL = originalDatabaseUrl;

    if (tempWorkDir && existsSync(tempWorkDir)) {
      rmSync(tempWorkDir, { recursive: true, force: true });
    }

    if (originalDatabaseUrl) {
      const adminUrl = new URL(originalDatabaseUrl);
      adminUrl.pathname = '/postgres';
      const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
      try {
        await admin.$executeRawUnsafe(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${N_MINUS_1_DB}' AND pid <> pg_backend_pid()`,
        );
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${N_MINUS_1_DB}"`);
      } finally {
        await admin.$disconnect();
      }
    }
  });

  it('surfaces MIGRATIONS_PENDING on /health/ready while /health remains 200', async () => {
    const health = await apiRequest('/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');

    const ready = await apiRequest('/health/ready');
    expect(ready.status).toBe(503);
    expect(ready.body.code).toBe('MIGRATIONS_PENDING');
    expect(ready.body.pendingMigrations).toEqual([REPO_MIGRATION_TO_EXCLUDE]);
  });

  it('keeps non-drifted critical endpoints (products, auth/sync, wishlist, orders) operational at schema N-1', async () => {
    const products = await apiRequest('/products');
    expect(products.status).toBe(200);
    expect(products.body.products.length).toBeGreaterThanOrEqual(1);

    const detail = await apiRequest(`/products/${activeProductId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(activeProductId);

    const sync = await apiRequest('/auth/sync', {
      method: 'POST',
      token: 'token-nminus1-sync',
      body: JSON.stringify({ name: 'Sync User' }),
    });
    expect([200, 201]).toContain(sync.status);

    const addWishlist = await apiRequest('/wishlist/items', {
      method: 'POST',
      token: 'token-nminus1-cust',
      body: JSON.stringify({ productId: activeProductId }),
    });
    expect(addWishlist.status).toBe(201);

    const getWishlist = await apiRequest('/wishlist', { token: 'token-nminus1-cust' });
    expect(getWishlist.status).toBe(200);

    const getOrders = await apiRequest('/orders', { token: 'token-nminus1-cust' });
    expect(getOrders.status).toBe(200);

    const createOrder = await apiRequest('/orders', {
      method: 'POST',
      token: 'token-nminus1-cust',
      body: JSON.stringify({
        paymentMethod: 'cod',
        shippingAddress: {
          fullName: 'N-1 Customer',
          phone: '9876543210',
          line1: '123 Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
        cartItems: [
          {
            productId: activeProductId,
            quantity: 1,
            purchaseMode: 'sell',
            configuration: 'default',
            hasWarranty: false,
          },
        ],
      }),
    });
    expect(createOrder.status).toBe(201);
  });

  it('gates schema-drifted routes (cart, coupons, otp) cleanly with 503 MIGRATIONS_PENDING instead of raw 500', async () => {
    const cartGet = await apiRequest('/cart', { token: 'token-nminus1-cust' });
    expect(cartGet.status).toBe(503);
    expect(cartGet.body.code).toBe('MIGRATIONS_PENDING');
    expect(cartGet.headers.get('x-request-id')).toBeTruthy();

    const cartPost = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-nminus1-cust',
      body: JSON.stringify({ productId: activeProductId, quantity: 1 }),
    });
    expect(cartPost.status).toBe(503);
    expect(cartPost.body.code).toBe('MIGRATIONS_PENDING');

    const discounts = await apiRequest('/discounts/available', {
      method: 'POST',
      token: 'token-nminus1-cust',
      body: JSON.stringify({ items: [{ productId: activeProductId, quantity: 1, price: 34999 }] }),
    });
    expect(discounts.status).toBe(503);
    expect(discounts.body.code).toBe('MIGRATIONS_PENDING');

    const otpForgot = await apiRequest('/auth/otp/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nminus1-cust@example.test' }),
    });
    expect(otpForgot.status).toBe(503);
    expect(otpForgot.body.code).toBe('MIGRATIONS_PENDING');
  });
});

