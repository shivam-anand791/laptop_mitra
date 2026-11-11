import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { FirebaseService } from '../../src/firebase/firebase.service';
import { resetIntegrationDatabase } from './database';

describe('Cart HTTP Integration Tests (Real PostgreSQL)', () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let baseUrl: string;

  const customerUid = `fb-cust-${randomUUID()}`;
  const guestUid = `fb-guest-${randomUUID()}`;
  const unsyncedUid = `fb-unsynced-${randomUUID()}`;

  let customerId: string;
  let guestId: string;
  let categoryId: string;
  let fullProductId: string;
  let fullVariantId: string;
  let bareProductId: string;
  let draftProductId: string;

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
      // keep text
    }
    return { status: res.status, body, headers: res.headers };
  }

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const mockFirebaseService = {
      verifyIdToken: jest.fn(async (token: string) => {
        if (token === 'token-customer') {
          return { uid: customerUid, email: 'cart-cust@example.test', name: 'Cart Customer' };
        }
        if (token === 'token-guest') {
          return { uid: guestUid, email: null, name: 'Guest Shopper' };
        }
        if (token === 'token-unsynced') {
          return { uid: unsyncedUid, email: 'unsynced@example.test', name: 'Unsynced User' };
        }
        const err = new Error('Invalid token');
        (err as any).code = 'auth/invalid-id-token';
        throw err;
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

    // Seed Customer, Guest, Admin, Categories, Products, Variants & Approved RentalPrice
    const [customer, guest, admin, category] = await Promise.all([
      prisma.user.create({
        data: {
          email: `cart-cust-${randomUUID()}@example.test`,
          firebaseUid: customerUid,
          referralCode: `CC${randomUUID().replace(/-/g, '').slice(0, 8)}`,
          name: 'Cart Customer',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      }),
      prisma.user.create({
        data: {
          firebaseUid: guestUid,
          referralCode: `CG${randomUUID().replace(/-/g, '').slice(0, 8)}`,
          name: 'Guest Shopper',
          role: 'GUEST',
          status: 'ACTIVE',
          isGuest: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `cart-admin-${randomUUID()}@example.test`,
          firebaseUid: `fb-admin-${randomUUID()}`,
          referralCode: `CA${randomUUID().replace(/-/g, '').slice(0, 8)}`,
          name: 'Cart Admin',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Integration Test Laptops',
          slug: `int-cat-${randomUUID().slice(0, 8)}`,
        },
      }),
    ]);

    customerId = customer.id;
    guestId = guest.id;
    categoryId = category.id;

    const fullProduct = await prisma.product.create({
      data: {
        name: 'ThinkPad T14 Integration Edition',
        slug: `tp-t14-${randomUUID().slice(0, 8)}`,
        description: 'Integration test laptop',
        price: 45000,
        sku: `LM-INT-${randomUUID().slice(0, 8)}`,
        stock: 25,
        status: 'ACTIVE',
        categoryId,
        images: {
          create: [{ url: 'https://example.test/tp-t14.jpg', isPrimary: true, sortOrder: 0 }],
        },
      },
    });
    fullProductId = fullProduct.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: fullProductId,
        name: '16GB RAM / 512GB SSD',
        sku: `LM-VAR-${randomUUID().slice(0, 8)}`,
        price: 48000,
        stock: 20,
        isDefault: true,
        isActive: true,
        attributes: { ram: '16GB', storage: '512GB' },
      },
    });
    fullVariantId = variant.id;

    await prisma.rentalPrice.create({
      data: {
        productId: fullProductId,
        variantId: fullVariantId,
        tenureMonths: 12,
        monthlyPrice: 2499,
        sellingPriceSnapshot: 48000,
        percentage: 5.21,
        status: 'APPROVED',
        sourceType: 'MANUAL',
        approvedBy: admin.id,
        approvedAt: new Date(),
        auditHistory: {
          create: {
            action: 'APPROVED',
            newMonthlyPrice: 2499,
            newDeposit: 0,
            newDeliveryCharge: 0,
            adminId: admin.id,
            reason: 'Integration test approval',
          },
        },
      },
    });

    // Bare product: NO images, NO variants (tests missing optional relation tolerance)
    const bareProduct = await prisma.product.create({
      data: {
        name: 'Bare Latitude Integration',
        slug: `bare-lat-${randomUUID().slice(0, 8)}`,
        description: 'Product with missing optional images and variants',
        price: 32000,
        sku: `LM-BARE-${randomUUID().slice(0, 8)}`,
        stock: 15,
        status: 'ACTIVE',
        categoryId,
      },
    });
    bareProductId = bareProduct.id;

    const draftProduct = await prisma.product.create({
      data: {
        name: 'Draft Inactive Laptop',
        slug: `draft-lat-${randomUUID().slice(0, 8)}`,
        description: 'Not active for sale',
        price: 28000,
        sku: `LM-DRAFT-${randomUUID().slice(0, 8)}`,
        stock: 10,
        status: 'DRAFT',
        categoryId,
      },
    });
    draftProductId = draftProduct.id;
  });

  afterAll(async () => {
    await prisma?.cartItem.deleteMany({});
    await prisma?.cart.deleteMany({});
    await prisma?.rentalPriceAudit.deleteMany({ where: { rentalPrice: { productId: fullProductId } } });
    await prisma?.rentalPrice.deleteMany({ where: { productId: fullProductId } });
    await prisma?.productVariant.deleteMany({ where: { productId: fullProductId } });
    await prisma?.productImage.deleteMany({ where: { productId: fullProductId } });
    await prisma?.product.deleteMany({
      where: { id: { in: [fullProductId, bareProductId, draftProductId].filter(Boolean) } },
    });
    if (categoryId) {
      await prisma?.category.deleteMany({ where: { id: categoryId } });
    }
    await app?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.$executeRawUnsafe(`DELETE FROM "system_settings"`);
  });

  it('supports GET /cart and POST /cart/items for customer buy flow with server price recomputation and default settings', async () => {
    const empty = await apiRequest('/cart', { token: 'token-customer' });
    expect(empty.status).toBe(200);
    expect(empty.body.items).toEqual([]);
    expect(empty.body.total).toBe(0);
    expect(empty.body.settings.warrantyPricePerUnit).toBe(1999);

    const added = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({
        productId: fullProductId,
        variantId: fullVariantId,
        quantity: 2,
        purchaseMode: 'sell',
        configuration: 'ram-16gb',
        hasWarranty: true,
      }),
    });
    expect(added.status).toBe(201);

    const fetched = await apiRequest('/cart', { token: 'token-customer' });
    expect(fetched.status).toBe(200);
    expect(fetched.body.items).toHaveLength(1);
    expect(fetched.body.items[0].priceAtAdd).toBe(48000);
    expect(fetched.body.items[0].warrantyPrice).toBe(1999);
    expect(fetched.body.items[0].quantity).toBe(2);
    expect(fetched.body.oneTimeTotal).toBe((48000 + 1999) * 2);
    expect(fetched.body.total).toBe((48000 + 1999) * 2);
  });

  it('supports guest cart and products without optional images or variants', async () => {
    const res = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-guest',
      body: JSON.stringify({
        productId: bareProductId,
        quantity: 1,
        purchaseMode: 'sell',
        hasWarranty: false,
      }),
    });
    expect(res.status).toBe(201);

    const cart = await apiRequest('/cart', { token: 'token-guest' });
    expect(cart.status).toBe(200);
    expect(cart.body.userId).toBe(guestId);
    expect(cart.body.items).toHaveLength(1);
    expect(cart.body.items[0].product.images).toEqual([]);
    expect(cart.body.items[0].variant).toBeNull();
    expect(cart.body.total).toBe(32000);
  });

  it('supports lease mode with approved rental tenure and rejects warranty on lease', async () => {
    const badWarranty = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({
        productId: fullProductId,
        variantId: fullVariantId,
        quantity: 1,
        purchaseMode: 'lease',
        tenureMonths: 12,
        hasWarranty: true,
      }),
    });
    expect(badWarranty.status).toBe(400);

    const leaseAdd = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({
        productId: fullProductId,
        variantId: fullVariantId,
        quantity: 2,
        purchaseMode: 'lease',
        tenureMonths: 12,
        hasWarranty: false,
      }),
    });
    expect(leaseAdd.status).toBe(201);

    const cart = await apiRequest('/cart', { token: 'token-customer' });
    expect(cart.status).toBe(200);
    expect(cart.body.monthlyTotal).toBe(2499 * 2);
    expect(cart.body.oneTimeTotal).toBe(0);

    // Mixing sell item into active lease cart returns 400 cleanly
    const mixed = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({
        productId: bareProductId,
        quantity: 1,
        purchaseMode: 'sell',
      }),
    });
    expect(mixed.status).toBe(400);
  });

  it('performs atomic upsert on concurrent double-add for same composite unique key', async () => {
    const payload = JSON.stringify({
      productId: fullProductId,
      variantId: fullVariantId,
      quantity: 1,
      purchaseMode: 'sell',
      configuration: 'default',
      hasWarranty: false,
    });

    const [r1, r2] = await Promise.all([
      apiRequest('/cart/items', { method: 'POST', token: 'token-customer', body: payload }),
      apiRequest('/cart/items', { method: 'POST', token: 'token-customer', body: payload }),
    ]);

    expect([200, 201]).toContain(r1.status);
    expect([200, 201]).toContain(r2.status);

    const cart = await apiRequest('/cart', { token: 'token-customer' });
    expect(cart.status).toBe(200);
    expect(cart.body.items).toHaveLength(1);
    expect(cart.body.items[0].quantity).toBe(2);
  });

  it('reads dynamic warrantyPricePerUnit from system_settings when configured', async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "system_settings" ("key", "value", "updatedAt") VALUES ('warrantyPricePerUnit', '2499', NOW())
       ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"`,
    );

    const add = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({
        productId: bareProductId,
        quantity: 1,
        purchaseMode: 'sell',
        hasWarranty: true,
      }),
    });
    expect(add.status).toBe(201);

    const cart = await apiRequest('/cart', { token: 'token-customer' });
    expect(cart.status).toBe(200);
    expect(cart.body.settings.warrantyPricePerUnit).toBe(2499);
    expect(cart.body.items[0].warrantyPrice).toBe(2499);
  });

  it('returns 401 when user has no synced database row and validates invalid inputs with 400/404', async () => {
    const unsynced = await apiRequest('/cart', { token: 'token-unsynced' });
    expect(unsynced.status).toBe(401);

    const missingAuth = await apiRequest('/cart');
    expect(missingAuth.status).toBe(401);

    const badQtyZero = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({ productId: bareProductId, quantity: 0 }),
    });
    expect(badQtyZero.status).toBe(400);

    const badQtyHuge = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({ productId: bareProductId, quantity: 999 }),
    });
    expect(badQtyHuge.status).toBe(400);

    const forgedPriceField = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({ productId: bareProductId, quantity: 1, priceAtAdd: 1 }),
    });
    expect(forgedPriceField.status).toBe(400);

    const badMode = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({ productId: bareProductId, quantity: 1, purchaseMode: 'rent_forever' }),
    });
    expect(badMode.status).toBe(400);

    const unknownProd = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({ productId: 'non-existent-prod-id', quantity: 1 }),
    });
    expect(unknownProd.status).toBe(404);

    const draftProd = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({ productId: draftProductId, quantity: 1 }),
    });
    expect(draftProd.status).toBe(400);
  });

  it('updates item quantity/warranty via PUT and deletes item / clears cart cleanly', async () => {
    const added = await apiRequest('/cart/items', {
      method: 'POST',
      token: 'token-customer',
      body: JSON.stringify({ productId: bareProductId, quantity: 1, hasWarranty: false }),
    });
    expect(added.status).toBe(201);
    const itemId = added.body.cartItem?.id ?? added.body.id;

    const updated = await apiRequest(`/cart/items/${itemId}`, {
      method: 'PUT',
      token: 'token-customer',
      body: JSON.stringify({ quantity: 3, hasWarranty: true }),
    });
    expect(updated.status).toBe(200);

    const afterPut = await apiRequest('/cart', { token: 'token-customer' });
    expect(afterPut.body.items[0].quantity).toBe(3);
    expect(afterPut.body.items[0].hasWarranty).toBe(true);
    expect(afterPut.body.total).toBe((32000 + 1999) * 3);

    const delItem = await apiRequest(`/cart/items/${itemId}`, {
      method: 'DELETE',
      token: 'token-customer',
    });
    expect(delItem.status).toBe(200);

    const afterDel = await apiRequest('/cart', { token: 'token-customer' });
    expect(afterDel.body.items).toEqual([]);
    expect(afterDel.body.userId).toBe(customerId);
  });
});

