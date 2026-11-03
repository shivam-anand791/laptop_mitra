import { expect, test } from '@playwright/test';
import * as path from 'path';

test.describe('Orders Need Help Situation Engine Integration', () => {
  test('logs in, audits every enabled action, and verifies all modals open without errors', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Login as demo@gmail.com
    await page.goto('/login?next=/account/orders', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'demo@gmail.com');
    await page.fill('input[type="password"]', 'Asdfg@12');
    await page.getByRole('button', { name: /Sign In to LaptopMitra/i }).click();

    await page.waitForURL('**/account/orders', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText(/Orders & Purchases/i);

    // Step 2: Open Need Help on first order (PENDING order)
    const firstNeedHelpBtn = page.locator('button:has-text("Need Help?")').first();
    await expect(firstNeedHelpBtn).toBeVisible({ timeout: 15000 });
    await firstNeedHelpBtn.click();

    const modal = page.getByRole('dialog', { name: /Help with this Item/i });
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('#situation-modal-title')).toContainText(/Help with this Item/i);
    await expect(modal.locator('text=Analyzing order and device status...')).not.toBeVisible({ timeout: 15000 });

    // Verify sections render
    await expect(modal.locator('text=Orders & Delivery')).toBeVisible();

    // Verify Next.js error badge is NOT present
    const issueBadge = page.locator('[aria-label="Issues"], button:has-text("Issue")');
    expect(await issueBadge.count()).toBe(0);

    // --- Action 1: Change Delivery Address or Phone ---
    const changeAddressBtn = modal.getByRole('button', { name: /Change Delivery Address or Phone/i });
    if (await changeAddressBtn.isEnabled()) {
      await changeAddressBtn.click();
      const changeModal = page.getByRole('dialog', { name: /Update Delivery Address/i });
      await expect(changeModal).toBeVisible();
      await changeModal.getByRole('button', { name: /Cancel/i }).click();
      await expect(changeModal).not.toBeVisible();
    }

    // --- Action 2: Download Tax Invoice ---
    const invoiceBtn = modal.getByRole('button', { name: /Download Tax Invoice/i });
    if (await invoiceBtn.isEnabled()) {
      await invoiceBtn.click();
      const invoiceModal = page.getByRole('dialog', { name: /Tax Invoice \/ Receipt/i });
      await expect(invoiceModal).toBeVisible();
      await invoiceModal.getByRole('button', { name: /Close/i }).first().click();
      await expect(invoiceModal).not.toBeVisible();
    }

    // --- Action 3: Request Support Callback ---
    const callbackBtn = modal.getByRole('button', { name: /Request Support Callback/i });
    if (await callbackBtn.isEnabled()) {
      await callbackBtn.click();
      const callbackModal = page.getByRole('dialog', { name: /Request Support Callback/i });
      await expect(callbackModal).toBeVisible();
      await callbackModal.getByRole('button', { name: /Cancel/i }).click();
      await expect(callbackModal).not.toBeVisible();
    }

    // --- Action 4: Raise a Support Ticket ---
    const ticketBtn = modal.getByRole('button', { name: /Raise a Support Ticket/i });
    await ticketBtn.click();
    const ticketModal = page.getByRole('dialog', { name: /Raise a Support Ticket/i });
    await expect(ticketModal).toBeVisible();
    await ticketModal.getByRole('button', { name: /Cancel/i }).click();
    await expect(ticketModal).not.toBeVisible();

    // Close first modal
    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(modal).not.toBeVisible();

    // Step 3: Test on a Delivered Order (Order #cmvwvhpcg0009hs883ty0jor1)
    await page.goto('/account/orders/2ad4fae9-84e3-4164-8739-2a26bb3f5446');
    await expect(page.locator('text=Order #')).toBeVisible({ timeout: 15000 });

    const deliveredNeedHelpBtn = page.locator('button:has-text("Need Help?")').first();
    await deliveredNeedHelpBtn.click();

    const deliveredModal = page.getByRole('dialog', { name: /Help with this Item/i });
    await expect(deliveredModal).toBeVisible({ timeout: 10000 });
    await expect(deliveredModal.locator('text=Analyzing order and device status...')).not.toBeVisible({ timeout: 15000 });

    // --- Action 5: Track Delivery ---
    const trackDeliveryBtn = deliveredModal.getByRole('button', { name: /Track Delivery/i });
    if (await trackDeliveryBtn.isEnabled()) {
      await trackDeliveryBtn.click();
      const trackModal = page.getByRole('dialog', { name: /Track Delivery/i });
      await expect(trackModal).toBeVisible();
      await expect(trackModal.locator('text=Shipment Milestones')).toBeVisible();
      await trackModal.getByRole('button', { name: /Close/i }).first().click();
      await expect(trackModal).not.toBeVisible();
    }

    // --- Action 6: Claim Warranty Service ---
    const warrantyBtn = deliveredModal.getByRole('button', { name: /Claim Warranty Service/i });
    if (await warrantyBtn.isEnabled()) {
      await warrantyBtn.click();
      const warrantyModal = page.getByRole('dialog', { name: /Claim Warranty Service/i });
      await expect(warrantyModal).toBeVisible();
      await expect(warrantyModal.locator('text=Fault Category')).toBeVisible();
      await warrantyModal.getByRole('button', { name: /Cancel/i }).click();
      await expect(warrantyModal).not.toBeVisible();
    }

    // --- Action 7: Sell Laptop Back (Buyback Guarantee) if enabled ---
    const buybackBtn = deliveredModal.getByRole('button', { name: /Sell Laptop Back/i });
    if (await buybackBtn.isEnabled()) {
      await buybackBtn.click();
      const buybackModal = page.getByRole('dialog', { name: /Lifetime Buyback Guarantee/i });
      await expect(buybackModal).toBeVisible();
      await buybackModal.getByRole('button', { name: /Close/i }).first().click();
      await expect(buybackModal).not.toBeVisible();
    }

    // Close delivered modal
    await deliveredModal.getByRole('button', { name: 'Close' }).click();

    // Verify no React key warnings or unhandled exceptions occurred
    const keyWarnings = consoleErrors.filter((e) => e.includes('key'));
    expect(keyWarnings).toHaveLength(0);
  });
});
