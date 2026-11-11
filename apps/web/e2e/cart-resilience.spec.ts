import { expect, test } from '@playwright/test';

function createFakeJwt(uid: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://securetoken.google.com/laptopmitra-e2e',
      aud: 'laptopmitra-e2e',
      auth_time: now,
      user_id: uid,
      sub: uid,
      iat: now,
      exp: now + 3600,
      email,
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    }),
  ).toString('base64url');
  return `${header}.${payload}.`;
}

const E2E_PRODUCT = {
  id: 'prod-e2e-1',
  name: 'Lenovo ThinkPad X1 Carbon Gen 10 (E2E)',
  slug: 'thinkpad-x1-e2e',
  description: 'Certified enterprise laptop for cart resilience testing',
  shortDescription: 'Core i7, 16GB RAM, 512GB SSD',
  price: 54999,
  compareAtPrice: 112000,
  sku: 'LM-TPX1-E2E',
  stock: 10,
  status: 'ACTIVE',
  isFeatured: true,
  isNewArrival: false,
  categoryId: 'cat-business',
  category: { id: 'cat-business', name: 'Business Laptops', slug: 'business' },
  images: [],
  variants: [],
  rentalPlans: [],
};

function isAppRequest(route: { request: () => { url: () => string; resourceType: () => string } }): boolean {
  const req = route.request();
  if (req.resourceType() === 'document') return true;
  try {
    const parsed = new URL(req.url());
    return parsed.port === '3002' || parsed.searchParams.has('_rsc');
  } catch {
    return false;
  }
}

test.describe('Cart Resilience E2E (Guest, Customer, Failure Injection & Retry Reconciliation)', () => {
  test('guest can add a product to cart without auth errors', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.route('**/health', async (route) => {
      if (isAppRequest(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', capabilities: [] }),
      });
    });

    await page.route('**/products/prod-e2e-1*', async (route) => {
      if (isAppRequest(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(E2E_PRODUCT),
      });
    });

    await page.route('**/products?*', async (route) => {
      if (isAppRequest(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [E2E_PRODUCT], total: 1 }),
      });
    });

    await page.route('**/products', async (route) => {
      if (isAppRequest(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [E2E_PRODUCT], total: 1 }),
      });
    });

    await page.goto('/products/prod-e2e-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /ThinkPad X1 Carbon Gen 10/i })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: /Add to Cart/i }).first().click();
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(E2E_PRODUCT.name)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Proceed to Secure Checkout/i })).toBeVisible();
  });

  test('customer cart failure shows retry banner, preserves local item, and reconciles on recovery', async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 800 });

    const uid = 'e2e-customer-uid';
    const email = 'customer-e2e@laptopmitra.test';
    const fakeJwt = createFakeJwt(uid, email);

    let failCartApi = true;
    const serverCartItems: any[] = [];

    // Mock Firebase Identity Toolkit REST endpoints so Firebase SDK completes login hermetically
    await page.route('**/identitytoolkit.googleapis.com/**/accounts:signInWithPassword*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#VerifyPasswordResponse',
          localId: uid,
          email,
          displayName: 'E2E Customer',
          idToken: fakeJwt,
          registered: true,
          refreshToken: 'e2e-refresh-token',
          expiresIn: '3600',
        }),
      });
    });

    await page.route('**/identitytoolkit.googleapis.com/**/accounts:lookup*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#GetAccountInfoResponse',
          users: [
            {
              localId: uid,
              email,
              emailVerified: true,
              displayName: 'E2E Customer',
            },
          ],
        }),
      });
    });

    await page.route('**/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', capabilities: [] }),
      });
    });

    await page.route('**/auth/sync', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'db-user-e2e-1',
            firebaseUid: uid,
            email,
            name: 'E2E Customer',
            role: 'CUSTOMER',
            status: 'ACTIVE',
            referralCode: 'E2ECUST1',
            emailVerified: true,
          },
        }),
      });
    });

    await page.route('**/support/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ returnWindowDays: 7, standardWarrantyDays: 180 }),
      });
    });

    await page.route('**/discounts/available', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ offers: [] }),
      });
    });

    await page.route('**/products/prod-e2e-1*', async (route) => {
      if (isAppRequest(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(E2E_PRODUCT),
      });
    });

    await page.route('**/products?*', async (route) => {
      if (isAppRequest(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [E2E_PRODUCT], total: 1 }),
      });
    });

    await page.route('**/cart/items', async (route) => {
      if (isAppRequest(route)) return route.continue();
      if (failCartApi) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 503,
            code: 'MIGRATIONS_PENDING',
            message: 'This feature is temporarily unavailable while a database update is pending.',
            requestId: 'req-e2e-503',
          }),
        });
        return;
      }

      const body = route.request().postDataJSON() as any;
      const existing = serverCartItems.find((item) => item.productId === body.productId);
      if (existing) {
        existing.quantity += body.quantity || 1;
      } else {
        serverCartItems.push({
          id: 'server-ci-1',
          cartId: 'server-cart-1',
          productId: body.productId,
          quantity: body.quantity || 1,
          purchaseMode: body.purchaseMode || 'sell',
          configuration: body.configuration || 'default',
          hasWarranty: !!body.hasWarranty,
          warrantyPrice: body.hasWarranty ? 1999 : 0,
          priceAtAdd: E2E_PRODUCT.price,
          product: E2E_PRODUCT,
        });
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ cartItem: serverCartItems[0], ...serverCartItems[0] }),
      });
    });

    await page.route('**/cart', async (route) => {
      if (isAppRequest(route)) return route.continue();
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'server-cart-1',
            userId: 'db-user-e2e-1',
            items: serverCartItems,
            total: serverCartItems.reduce(
              (acc, it) => acc + Number(it.priceAtAdd) * Number(it.quantity),
              0,
            ),
            itemCount: serverCartItems.reduce((acc, it) => acc + Number(it.quantity), 0),
          }),
        });
        return;
      }
      await route.continue();
    });

    // Sign in via /login
    await page.goto('/login?next=/products/prod-e2e-1', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.getByRole('button', { name: /Sign In to LaptopMitra/i }).click();

    await page.waitForURL('**/products/prod-e2e-1', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /ThinkPad X1 Carbon Gen 10/i })).toBeVisible({
      timeout: 15000,
    });

    // Trigger Add to Cart while POST /cart/items returns 503
    await page.getByRole('button', { name: /Add to Cart/i }).first().click();

    const banner = page.getByTestId('cart-sync-error-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText("We couldn't update your cart. Try again.");
    await expect(banner.getByRole('button', { name: 'Retry' })).toBeVisible();

    const pageText = await page.innerText('body');
    expect(pageText).not.toContain('503');
    expect(pageText).not.toContain('MIGRATIONS_PENDING');
    expect(pageText).not.toContain('Prisma');

    // Navigate to /cart and confirm local cart item was preserved (not lost)
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(E2E_PRODUCT.name)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('cart-sync-error-banner')).toBeVisible();

    // Recover API and click Retry
    failCartApi = false;
    await page.getByTestId('cart-sync-error-banner').getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByTestId('cart-sync-error-banner')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(E2E_PRODUCT.name)).toBeVisible();
    await expect(page.getByRole('link', { name: /Proceed to Secure Checkout/i })).toBeVisible();
  });
});

