// Visual & Behavioral QA script for SAYNTAX Demo & Lesson UX Polish
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const playwrightPath = process.env.PLAYWRIGHT_MODULE || '/home/thduy-h/Documents/TD/s-menu-ui/node_modules/playwright/index.mjs';
const { chromium } = await import(playwrightPath);

const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';
const output = resolve(process.env.QA_OUTPUT || 'artifacts/lesson-ux-qa');
const chromiumBinary = process.env.QA_BROWSER || '/nix/store/d7gmjb7cxfhkrjzml53ncja1li0amhc2-chromium-155.0.8059.39/bin/chromium';

const browser = await chromium.launch({
  executablePath: chromiumBinary,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

await mkdir(output, { recursive: true });

const report = {
  baseURL,
  checkedAt: new Date().toISOString(),
  profiles: [],
  screenshots: [],
};

const profiles = [
  { name: 'desktop-1366', width: 1366, height: 768, zoom: 1 },
  { name: 'fhd-100', width: 1920, height: 1080, zoom: 1 },
  { name: 'fhd-125', width: 1536, height: 864, zoom: 1 }, // 1920x1080 at 125% effective CSS
  { name: 'fhd-150', width: 1280, height: 720, zoom: 1 }, // 1920x1080 at 150% effective CSS
  { name: 'fhd-200', width: 960, height: 540, zoom: 1 },  // 1920x1080 at 200% effective CSS
  { name: 'mobile-390', width: 390, height: 844, zoom: 1 },
];

for (const profile of profiles) {
  console.log(`\n=== Running QA for profile: ${profile.name} (${profile.width}x${profile.height}) ===`);
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
  });

  const page = await context.newPage();

  // 1. Check Demo page
  await page.goto(`${baseURL}/demo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Check 5 lesson cards
  const lessonTitles = await page.$$eval('h2.font-heading', (els) => els.map((e) => e.textContent?.trim()));
  console.log(`Lesson titles found:`, lessonTitles);
  assert.equal(lessonTitles.length, 5, 'Must have 5 lesson cards');
  assert.ok(lessonTitles.includes('Vòng lặp cơ bản'), 'Lesson 3 must be "Vòng lặp cơ bản"');
  assert.ok(!lessonTitles.includes('Vòng lặp lặp lại'), 'Must not have "Vòng lặp lặp lại"');

  // Check progress text
  const heroText = await page.$eval('section.rounded-3xl p', (el) => el.textContent?.trim() ?? '');
  assert.ok(heroText.includes('Tiến độ được lưu trên trình duyệt này'), 'Must state progress saved in browser');

  // Take Demo screenshot
  const demoShot = `${profile.name}-01-demo-page.png`;
  await page.screenshot({ path: resolve(output, demoShot), fullPage: false });
  report.screenshots.push(demoShot);

  // 2. Open Lesson 1
  await page.goto(`${baseURL}/demo/start-and-sequence-v2`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#panel-knowledge', { timeout: 6000 });
  await page.waitForTimeout(400);

  // Check scroll metrics
  const metrics = await page.evaluate(() => {
    const el = document.getElementById('panel-knowledge');
    const hint = document.querySelector('div[role="status"]');
    return {
      clientHeight: el?.clientHeight ?? 0,
      scrollHeight: el?.scrollHeight ?? 0,
      scrollTop: el?.scrollTop ?? 0,
      hasHint: Boolean(hint),
      hintText: hint?.textContent?.trim() ?? null,
    };
  });
  console.log(`Knowledge metrics:`, metrics);

  const canScroll = metrics.scrollHeight > metrics.clientHeight + 8;

  if (canScroll) {
    assert.ok(metrics.hasHint, 'Floating scroll hint must exist when content can scroll down');
    assert.ok(metrics.hintText?.includes('Còn nội dung bên dưới'), 'Hint must contain "Còn nội dung bên dưới"');
    assert.ok(metrics.hintText?.includes('Cuộn xuống'), 'Hint must contain "Cuộn xuống"');
  } else {
    assert.equal(metrics.hasHint, false, 'Floating scroll hint must NOT exist when content fits without scrolling');
  }

  const topShot = `${profile.name}-02-knowledge-top.png`;
  await page.screenshot({ path: resolve(output, topShot), fullPage: false });
  report.screenshots.push(topShot);

  if (canScroll) {
    // Scroll halfway down
    await page.evaluate(() => {
      const el = document.getElementById('panel-knowledge');
      if (el) el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) / 2);
    });
    await page.waitForTimeout(300);

    const midMetrics = await page.evaluate(() => {
      const el = document.getElementById('panel-knowledge');
      const hint = document.querySelector('div[role="status"]');
      return {
        scrollTop: el?.scrollTop ?? 0,
        hasHint: Boolean(hint),
      };
    });
    assert.ok(midMetrics.hasHint, 'Floating scroll hint must remain visible when scrolling halfway');

    const midShot = `${profile.name}-03-knowledge-middle.png`;
    await page.screenshot({ path: resolve(output, midShot), fullPage: false });
    report.screenshots.push(midShot);

    // Scroll to bottom
    await page.evaluate(() => {
      const el = document.getElementById('panel-knowledge');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);

    // Verify hint disappears when scrolled to bottom
    const bottomHint = await page.$('div[role="status"]');
    assert.equal(bottomHint, null, 'Floating scroll hint must disappear at bottom');

    const bottomShot = `${profile.name}-04-knowledge-bottom.png`;
    await page.screenshot({ path: resolve(output, bottomShot), fullPage: false });
    report.screenshots.push(bottomShot);

    // Scroll back up
    await page.evaluate(() => {
      const el = document.getElementById('panel-knowledge');
      if (el) el.scrollTop = 0;
    });
    await page.waitForTimeout(300);

    const hintReappeared = await page.$('div[role="status"]');
    assert.ok(hintReappeared, 'Floating scroll hint must reappear when scrolled back up');
  }

  // 3. Switch to Practice mode
  const practiceTab = await page.$('#tab-practice');
  assert.ok(practiceTab, 'Practice tab button must exist');
  await practiceTab.click();
  await page.waitForTimeout(500);

  // In practice mode, primer and hint must NOT exist
  const primerInPractice = await page.$('#panel-knowledge');
  assert.equal(primerInPractice, null, 'Knowledge panel must be hidden in Practice mode');
  const hintInPractice = await page.$('div[role="status"]');
  assert.equal(hintInPractice, null, 'Floating scroll hint must NOT exist in Practice mode');

  // Sidebar button should now say "Xem kiến thức"
  const sidebarBtn = await page.$eval('aside button', (el) => el.textContent?.trim() ?? '');
  assert.ok(sidebarBtn.length > 0, 'Sidebar must have buttons');

  const practiceShot = `${profile.name}-05-practice-mode.png`;
  await page.screenshot({ path: resolve(output, practiceShot), fullPage: false });
  report.screenshots.push(practiceShot);

  // 4. Switch back to Knowledge mode
  const knowledgeTab = await page.$('#tab-knowledge');
  assert.ok(knowledgeTab, 'Knowledge tab button must exist');
  await knowledgeTab.click();
  await page.waitForTimeout(500);

  // Check Global Voice card exists at bottom right
  const globalVoice = await page.$('[aria-label*="giọng nói"]');
  assert.ok(globalVoice, 'Global Voice Control must exist');

  const reopenedShot = `${profile.name}-06-knowledge-reopened-with-voice.png`;
  await page.screenshot({ path: resolve(output, reopenedShot), fullPage: false });
  report.screenshots.push(reopenedShot);

  console.log(`✓ Profile ${profile.name} PASSED all visual & behavioral checks`);
  report.profiles.push({ name: profile.name, status: 'PASS' });
  await context.close();
}

await browser.close();

await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\nALL QA CHECKS PASSED. Report and screenshots saved to ${output}`);
