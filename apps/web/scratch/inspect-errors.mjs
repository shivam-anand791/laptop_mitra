import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]`, msg.text());
  });

  page.on('pageerror', err => {
    console.log('[PAGEERROR]', err.message);
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login?next=/account/orders');
  await page.fill('input[type="email"]', 'demo@gmail.com');
  await page.fill('input[type="password"]', 'Asdfg@12');
  await page.click('button:has-text("Sign In to LaptopMitra")');

  await page.waitForURL('**/account/orders');
  console.log('On /account/orders. Waiting 3s for network/errors...');
  await page.waitForTimeout(3000);

  // Click Need Help on first card
  const needHelpBtn = page.locator('button:has-text("Need Help?")').first();
  await needHelpBtn.click();
  console.log('Clicked Need Help.');
  await page.waitForTimeout(2000);

  // Check dialog
  const dialog = page.getByRole('dialog', { name: /Help with this Item/i });
  console.log('Dialog visible:', await dialog.isVisible());

  // Check Next.js error badge content
  const issueBadge = page.locator('[aria-label="Issues"], button:has-text("Issue"), [data-nextjs-toast]');
  if (await issueBadge.count() > 0) {
    console.log('Issue badge found:', await issueBadge.first().innerText());
    await issueBadge.first().click().catch(() => {});
    await page.waitForTimeout(1000);
    const dialogErr = page.locator('[data-nextjs-dialog="true"], .error-overlay');
    if (await dialogErr.count() > 0) {
      console.log('NEXTJS ISSUE TEXT:\n', await dialogErr.first().innerText());
    }
  }

  // List all buttons/links inside dialog
  const actions = dialog.locator('button, a');
  const actionCount = await actions.count();
  console.log('Actions count in dialog:', actionCount);
  for (let i = 0; i < actionCount; i++) {
    const act = actions.nth(i);
    const text = (await act.innerText().catch(() => '')).replace(/\n/g, ' - ');
    const disabled = await act.getAttribute('disabled');
    const href = await act.getAttribute('href');
    console.log(`  Action ${i}: [${disabled !== null ? 'DISABLED' : 'ENABLED'}] ${text} (href: ${href || 'none'})`);
  }

  await browser.close();
}

main().catch(console.error);

