const puppeteer = require('c:/vloume d/laptopmitra/node_modules/puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/login?next=/admin', { waitUntil: 'networkidle0' });
  const title = await page.title();
  const emailInput = await page.$('input[type="email"]');
  const passwordInput = await page.$('input[type="password"]');

  console.log('BROWSER_VERIFIED:', JSON.stringify({
    title,
    hasEmailInput: !!emailInput,
    hasPasswordInput: !!passwordInput,
    consoleErrorsCount: consoleErrors.length,
    consoleErrors
  }));

  await browser.close();
})();

