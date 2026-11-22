import { expect, test } from '@playwright/test';

const routes = [
  { name: 'home', path: '/' },
  { name: 'products', path: '/products' },
  { name: 'product-detail', path: '/products/prod-macbook-air-m1' },
  { name: 'cart', path: '/cart' },
  { name: 'login', path: '/login' },
  { name: 'help', path: '/help' },
  { name: 'help-article', path: '/help/general/return-policy' },
  { name: 'account-orders', path: '/account/orders' },
  { name: 'account-tickets', path: '/account/tickets' },
] as const;

const viewports = [
  { name: 'desktop', width: 1440, height: 620 },
  { name: 'mobile', width: 390, height: 620 },
] as const;

for (const viewport of viewports) {
  test.describe(`${viewport.name} storefront theme`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route.name} matches the restored baseline`, async ({ page }) => {
        test.setTimeout(60_000);
        const response = await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        expect(response?.status() ?? 500).toBeLessThan(400);
        await expect(page.locator('header').first()).toBeVisible();
        await expect(page.locator('main').first()).toBeVisible();
        if (route.name.startsWith('account-')) {
          await page.waitForURL((url) => url.pathname === '/login');
          expect(new URL(page.url()).searchParams.get('next')).toBe(route.path);
        }
        if (route.name === 'product-detail') {
          await page.waitForFunction(() => !document.body.innerText.includes('Loading certified laptop specifications...'));
        }
        await page.waitForTimeout(750);
        await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
        await expect(page).toHaveScreenshot(`${route.name}-${viewport.name}.png`);
      });
    }
  });
}

test('Help support surfaces retain the restored navy and blue palette', async ({ page }) => {
  await page.goto('/help', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const surfaces = await page.locator('section').evaluateAll((sections) => {
    const promotion = sections.find((section) => section.textContent?.includes('Have an issue with a recent order or hardware?'));
    const contact = sections.find((section) => section.id === 'contact');
    const hero = sections.find((section) => section.classList.contains('bg-gradient-to-br'));
    return {
      heroGradient: hero ? getComputedStyle(hero).backgroundImage : '',
      promotion: promotion ? getComputedStyle(promotion).backgroundColor : '',
      contact: contact ? getComputedStyle(contact).backgroundColor : '',
    };
  });

  expect(surfaces.heroGradient).toContain('linear-gradient');
  expect(surfaces.promotion).toBe('rgb(11, 31, 75)');
  expect(surfaces.contact).toBe('rgb(11, 31, 75)');
});
