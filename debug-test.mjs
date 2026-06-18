import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// Capture console errors
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    errors.push(`[${msg.type()}] ${msg.text()}`);
  }
});

// Capture page errors
page.on('pageerror', err => {
  errors.push(`[PAGE ERROR] ${err.message}`);
});

await page.goto('http://127.0.0.1:3000', { timeout: 30000 });
console.log('Page loaded, waiting for data...');

try {
  await page.waitForSelector('text=NVDA', { timeout: 90000 });
  console.log('Data loaded!');
} catch (e) {
  console.log('Data not loaded, continuing...');
}

// Take screenshot of initial state
await page.screenshot({ path: '/home/z/my-project/download/dbg-1-initial.png' });

// Check if headers are visible
const headers = await page.locator('thead th').allTextContents();
console.log('Headers found:', headers);

// Try to find the IV header specifically
const ivTh = page.locator('thead th').filter({ hasText: 'IV' });
const ivCount = await ivTh.count();
console.log('IV th count:', ivCount);

if (ivCount > 0) {
  const ivBox = await ivTh.first().boundingBox();
  console.log('IV th bounding box:', ivBox);
}

// Try clicking the IV header using different strategies
console.log('\n--- Strategy 1: Click on th ---');
try {
  await page.locator('thead th').filter({ hasText: 'IV' }).first().click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/z/my-project/download/dbg-2-th-click.png' });
  console.log('th click done');
  
  // Check if a portal popup appeared in the DOM
  const portalPopups = await page.locator('.fixed.z-\\[9999\\]').count();
  console.log('Portal popups found after th click:', portalPopups);
} catch (e) {
  console.log('th click failed:', e.message);
}

// Close any open popup first
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

console.log('\n--- Strategy 2: Click on the Info icon next to IV ---');
try {
  // Find the Info icon inside the IV header
  const ivHeader = page.locator('thead th').filter({ hasText: 'IV' }).first();
  const infoIcon = ivHeader.locator('svg.lucide-info, svg.lucide').first();
  const iconCount = await infoIcon.count();
  console.log('Info icon count in IV header:', iconCount);
  
  if (iconCount > 0) {
    await infoIcon.click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/home/z/my-project/download/dbg-3-icon-click.png' });
    console.log('Info icon click done');
  }
  
  const portalPopups2 = await page.locator('.fixed.z-\\[9999\\]').count();
  console.log('Portal popups found after icon click:', portalPopups2);
} catch (e) {
  console.log('icon click failed:', e.message);
}

// Close any open popup
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

console.log('\n--- Strategy 3: Click directly on "Undl" text ---');
try {
  const undlText = page.locator('thead th').filter({ hasText: 'Undl' }).first().locator('span').first();
  await undlText.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/z/my-project/download/dbg-4-undl-click.png' });
  
  const portalPopups3 = await page.locator('.fixed.z-\\[9999\\]').count();
  console.log('Portal popups found after Undl click:', portalPopups3);
  
  // Check the full body HTML for portal content
  const bodyHTML = await page.evaluate(() => {
    const fixedEls = document.querySelectorAll('.fixed');
    return Array.from(fixedEls).map(el => ({
      className: el.className,
      zIndex: window.getComputedStyle(el).zIndex,
      visible: el.offsetParent !== null || el.style.position === 'fixed',
      rect: el.getBoundingClientRect().toJSON(),
      innerHTML: el.innerHTML.substring(0, 200)
    }));
  });
  console.log('Fixed elements on page:', JSON.stringify(bodyHTML, null, 2));
} catch (e) {
  console.log('Undl text click failed:', e.message);
}

// Print any errors
console.log('\n--- Console Errors ---');
if (errors.length === 0) {
  console.log('No errors!');
} else {
  errors.forEach(e => console.log(e));
}

await browser.close();
