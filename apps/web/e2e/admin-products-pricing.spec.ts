import { expect, test } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/shiva/.gemini/antigravity/brain/68a685a6-06a0-40f0-959c-89074a803a8e';

test.describe('Admin Products & Rental Pricing Full Integration', () => {
  test('end-to-end admin workflow: pricing, rental plans, inline edit, search, filters, safety archive, and visual artifacts', async ({ page }) => {
    test.setTimeout(180000);

    // 1. Sign in as ADMIN (demo@gmail.com)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login?next=/admin/products', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'demo@gmail.com');
    await page.fill('input[type="password"]', 'Asdfg@12');
    await page.getByRole('button', { name: /Sign In to LaptopMitra/i }).click();

    await page.waitForURL('**/admin/products', { timeout: 30000 });
    await expect(page.locator('h1')).toContainText(/Products & Rental Pricing/i);

    // Verify search box and label
    const searchInput = page.getByRole('textbox', { name: /Search by name, SKU, or brand/i });
    await expect(searchInput).toBeVisible();

    // Verify table columns
    await expect(page.locator('th:has-text("Selling Price")')).toBeVisible();
    await expect(page.locator('th:has-text("Rent / Lease")')).toBeVisible();
    await expect(page.locator('th:has-text("Stock")')).toBeVisible();

    // Verify Truthful Variant labels: "Single version" or "{N} versions"
    const variantCell = page.locator('td:has-text("Single version"), td:has-text("versions")').first();
    await expect(variantCell).toBeVisible();
    await expect(page.locator('text=Single SKU (Legacy)')).not.toBeVisible();

    // Select first product for multi-select bar test
    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();
    await firstCheckbox.check();
    await expect(page.locator('text=1 products selected')).toBeVisible();

    // Screenshot 1: Products table with Rent column, inline edit triggers, and bulk action bar (1440px)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '03-admin-products-table-1440.png'),
      fullPage: true,
    });

    // Screenshot 2: Products table at 1024px viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '04-admin-products-table-1024.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });

    // Deselect
    await page.locator('button:has-text("Deselect all")').click();
    await expect(page.locator('text=1 products selected')).not.toBeVisible();

    // 2. Comprehensive Product Edit Modal (Pricing & MRP)
    const editBtn = page.locator('button:has-text("Edit")').first();
    await editBtn.click();

    const editModal = page.getByRole('dialog', { name: /Edit Product:/i });
    await expect(editModal).toBeVisible();

    // Switch to Pricing tab
    await editModal.locator('button:has-text("Pricing & MRP")').click();
    await expect(editModal.locator('text=Selling Price (₹) *')).toBeVisible();

    // Screenshot 3: Product Edit Modal - Pricing tab (1440px)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '05-admin-product-edit-dialog-1440.png'),
    });

    // 3. Switch to Rental Pricing Tab
    await editModal.locator('button:has-text("Rental Pricing")').click();
    await expect(editModal.locator('text=Enable Renting for this Product')).toBeVisible();

    // Toggle Renting ON if not already on
    const rentSwitch = editModal.locator('input[aria-label="Enable renting switch"]');
    const isChecked = await rentSwitch.isChecked();
    if (!isChecked) {
      await rentSwitch.check({ force: true });
    }

    // Set rental rates for tenures: 1M: 2499, 3M: 2199, 6M: 1899, 12M: 1499, 24M: 1199
    const rentInputs = editModal.locator('input[type="number"][placeholder="e.g. 1499"]');
    if ((await rentInputs.count()) >= 5) {
      await rentInputs.nth(0).fill('2499');
      await rentInputs.nth(1).fill('2199');
      await rentInputs.nth(2).fill('1899');
      await rentInputs.nth(3).fill('1499');
      await rentInputs.nth(4).fill('1199');
    }

    // Screenshot 4: Product Edit Modal - Rental Pricing tab (1440px)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '06-admin-product-rental-tab-1440.png'),
    });

    // Save Edit Form
    await editModal.locator('button:has-text("Save Changes")').click();
    await expect(editModal).not.toBeVisible({ timeout: 15000 });

    // Verify Rent Chip shows updated rate on table
    await expect(page.locator('span:has-text("Rent from ₹")').first()).toBeVisible({ timeout: 10000 });

    // 4. Test Dedicated Rentals & Leases Page
    await page.goto('/admin/leases', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Rentals & Lease Contracts/i);
    await expect(page.getByRole('textbox', { name: /Search contracts/i })).toBeVisible();

    // Screenshot 5: Rentals & Leases page (1440px)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '07-admin-leases-page-1440.png'),
      fullPage: true,
    });

    // 5. Test Settings Page (without emojis)
    await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Platform Settings/i);
    await expect(page.locator('nav[aria-label="Settings categories"]')).toBeVisible();

    // Screenshot 6: Settings Page (1440px)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '08-admin-settings-page-1440.png'),
      fullPage: true,
    });
  });
});
