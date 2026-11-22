import { expect, test } from '@playwright/test';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../scratch/verify-email-audit');

test.describe('Verify Email Page & Graceful Error Recovery', () => {
  test('gracefully handles 404 API rollback and displays friendly error on 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock API /health to return capabilities without email-verification
    await page.route('**/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          service: 'laptopmitra-api',
          version: '1.0.0',
          capabilities: [],
        }),
      });
    });

    // Mock POST /auth/email-verification to return 404
    await page.route('**/auth/email-verification', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Cannot POST /auth/email-verification',
          error: 'Not Found',
          statusCode: 404,
        }),
      });
    });

    await page.goto('/verify-email?sendFailed=1', { waitUntil: 'domcontentloaded' });

    // Header and footer must be visible
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();

    // Verify raw server error text is NOT present
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('Cannot POST');
    expect(bodyText).not.toContain('404');

    // Verify friendly error message is displayed inside card
    const card = page.locator('section');
    const alert = card.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("We couldn't send the email right now. Try again in a few minutes.");

    // Verify Retry button is visible
    const retryBtn = card.getByRole('button', { name: 'Retry' });
    await expect(retryBtn).toBeVisible();

    // Verify Quick Navigation exit links are present and accessible
    await expect(card.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();
    await expect(card.getByRole('link', { name: 'My Account' })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Help Center', exact: true })).toBeVisible();

    // Capture desktop screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'verify-email-1440px-404-handled.png'),
      fullPage: true,
    });
  });

  test('gracefully handles 503 service unavailable and renders on 390px mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.route('**/auth/email-verification', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Verification email could not be sent. Please try again shortly.',
          statusCode: 503,
        }),
      });
    });

    await page.goto('/verify-email?sendFailed=1', { waitUntil: 'domcontentloaded' });

    const card = page.locator('section');
    const alert = card.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("We couldn't send the email right now. Try again in a few minutes.");

    // Header and quick links should be rendered properly in mobile view
    await expect(page.locator('header').first()).toBeVisible();
    await expect(card.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();

    // Capture mobile screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'verify-email-390px-mobile.png'),
      fullPage: true,
    });
  });

  test('renders verified success state properly when email is verified', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Visiting /verify-email without error params shows clean ready view
    await page.goto('/verify-email', { waitUntil: 'domcontentloaded' });

    const card = page.locator('section');
    await expect(card.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Help Center', exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'verify-email-1440px-ready.png'),
      fullPage: true,
    });
  });
});
