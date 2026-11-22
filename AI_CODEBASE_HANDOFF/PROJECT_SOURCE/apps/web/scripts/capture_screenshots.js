const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = 'C:\\Users\\shiva\\.gemini\\antigravity\\brain\\6e48cab3-a894-41e1-aa78-1ea799ff4bbb\\screenshots';

const viewports = [
  { name: 'desktop_1920x1080', width: 1920, height: 1080 },
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1366x768', width: 1366, height: 768 },
  { name: 'tablet_1024x768', width: 1024, height: 768 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_430x932', width: 430, height: 932, isMobile: true },
  { name: 'mobile_375x812', width: 375, height: 812, isMobile: true }
];

async function capture() {
  console.log('Launching browser at:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const vp of viewports) {
    console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      isMobile: !!vp.isMobile
    });

    const url = 'http://localhost:3000/products/prod-macbook-air-m1';
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait a brief moment for images and fonts to render
    await new Promise(r => setTimeout(r, 1000));

    // Full page screenshot
    const fullPath = path.join(outputDir, `before_${vp.name}_full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`Saved full page: ${fullPath}`);

    // Initial viewport screenshot
    const viewportPath = path.join(outputDir, `before_${vp.name}_above_fold.png`);
    await page.screenshot({ path: viewportPath, fullPage: false });
    console.log(`Saved above-fold: ${viewportPath}`);
  }

  // Also capture another product (e.g. ASUS ROG) at 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/products/prod-asus-rog-zephyrus-g14', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outputDir, `before_asus_rog_1440x900_full.png`), fullPage: true });
  console.log('Saved ASUS ROG full screenshot');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});

