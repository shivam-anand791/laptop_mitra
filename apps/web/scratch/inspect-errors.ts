import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGEERROR]', err.message, err.stack);
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login?next=/account/orders');
  await page.fill('input[type="email"]', 'demo@gmail.com');
  await page.fill('input[type="password"]', 'Asdfg@12');
  await page.click('button:has-text("Sign In to LaptopMitra")');

  await page.waitForURL('**/account/orders');
  console.log('On /account/orders. Waiting 3 seconds for hydration and network...');
  await page.waitForTimeout(3000);

  // Check if Next.js error badge exists
  const nextBadge = page.locator('[data-nextjs-dialog="true"], [data-nextjs-toast="true"], button[aria-label*="Issue"], .nextjs-toast');
  const count = await nextBadge.count();
  console.log('Next.js error/issue badge count:', count);
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      console.log(`Badge ${i} text:`, await nextBadge.nth(i).innerText().catch(() => ''));
    }
  }

  // Click Need Help on first card
  const needHelpBtn = page.locator('button:has-text("Need Help?")').first();
  await needHelpBtn.click();
  console.log('Clicked Need Help.');
  await page.waitForTimeout(2000);

  // Check dialog
  const dialog = page.getByRole('dialog', { name: /Help with this Item/i });
  console.log('Dialog visible:', await dialog.isVisible());

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

