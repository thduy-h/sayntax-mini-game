// Browser regression testing persistent hero guidance and fixed Global Voice Control.
// Exercises real parser, executor, router, persistent state and rendered UI.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const playwrightPath = process.env.PLAYWRIGHT_MODULE || '/home/thduy-h/Documents/TD/s-menu-ui/node_modules/playwright/index.mjs';
const { chromium } = await import(playwrightPath);

const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';
const output = resolve(process.env.QA_OUTPUT || 'artifacts/onboarding-layout-qa');
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
  input: 'Mock SpeechRecognition boundary events; real parser, executor, navigation and rendered UI.',
  profiles: [],
  screenshots: [],
  errors: [],
};

const profiles = [
  { name: 'fhd-100', width: 1920, height: 1080, zoom: 1 },
  { name: 'fhd-125', width: 1920, height: 1080, zoom: 1.25 },
  { name: 'fhd-150', width: 1920, height: 1080, zoom: 1.5 },
  { name: 'desktop-1366', width: 1366, height: 768, zoom: 1 },
  { name: 'mobile-390', width: 390, height: 844, zoom: 1 },
];

async function mockSpeech(context) {
  await context.addInitScript(() => {
    window.__qaSpeech = { starts: 0, instances: [], requests: 0 };
    window.__qaScroll = [];
    const scrollTo = window.scrollTo.bind(window);
    window.scrollTo = (...args) => {
      const before = { y: scrollY, body: document.body.scrollHeight, doc: document.documentElement.scrollHeight, h: innerHeight };
      scrollTo(...args);
      window.__qaScroll.push({ before, args, after: scrollY });
    };
    window.MediaRecorder = undefined;
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = (...args) => {
        window.__qaSpeech.requests++;
        return originalGetUserMedia(...args);
      };
    }
    window.SpeechRecognition = class {
      start() {
        window.__qaSpeech.starts++;
        window.__qaSpeech.instances.push(this);
      }
      stop() { this.onend?.(); }
      abort() {}
    };
    window.__qaSay = (transcript) => {
      const recognition = window.__qaSpeech.instances.at(-1);
      if (!recognition) throw new Error('Microphone has not been explicitly started.');
      recognition.onresult({ resultIndex: 0, results: [{ 0: { transcript, confidence: 0.99 }, length: 1, isFinal: true }] });
    };
  });
}

async function say(page, text) {
  await page.evaluate((command) => window.__qaSay(command), text);
  await page.waitForTimeout(250);
}

async function capture(page, name, fullPage = false) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const previousScroll = await page.evaluate(() => scrollY);
  if (fullPage) await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const filename = `${name}.png`;
  await page.screenshot({ path: resolve(output, filename), fullPage, animations: 'disabled' });
  if (fullPage) await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), previousScroll);
  report.screenshots.push(filename);
}

async function withinViewport(page, locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box, 'Element bounding box must be available');
  assert.ok(
    box.x >= -2 && box.y >= -2 && box.x + box.width <= viewport.width + 2 && box.y + box.height <= viewport.height + 2,
    `Outside viewport: ${JSON.stringify(box)} vs ${JSON.stringify(viewport)}`
  );
  return box;
}

try {
  for (const profile of profiles.filter((p) => !process.env.QA_PROFILE || process.env.QA_PROFILE.split(',').includes(p.name))) {
    console.log(`\n--- Testing profile: ${profile.name} (${profile.width}x${profile.height}, zoom ${profile.zoom}) ---`);
    const viewportWidth = Math.floor(profile.width / profile.zoom);
    const viewportHeight = Math.floor(profile.height / profile.zoom);

    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      deviceScaleFactor: profile.zoom,
    });
    await mockSpeech(context);

    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => report.errors.push(`${profile.name}: ${error.message}`));

    // 1. First Visit — Onboarding 1/3
    await page.goto(baseURL);
    const guide = page.locator('[data-guidance-panel]');
    await guide.waitFor({ state: 'visible' });

    assert.equal(await guide.getAttribute('data-guidance-stage'), '1');
    assert.equal(await guide.getAttribute('data-guidance-status'), 'active');
    assert.ok((await guide.innerText()).includes('1/3'), 'Should display 1/3 indicator');
    assert.ok((await guide.innerText()).includes('Xin chào!'), 'Should display Stage 1 greeting');
    assert.ok((await guide.innerText()).includes('Trợ giúp'), 'Should display prompt to say Trợ giúp');

    // Layout verification: Two columns on desktop
    const isDesktop = viewportWidth >= 1024;
    const heroSection = page.locator('[data-landing-hero]');
    await heroSection.waitFor({ state: 'visible' });
    const heroBox = await heroSection.boundingBox();
    const leftCol = await heroSection.locator('> div').first().boundingBox();
    const rightCol = await guide.boundingBox();

    if (isDesktop) {
      assert.ok(leftCol.x < rightCol.x, 'Left card and right guidance card must be side-by-side on desktop');
      assert.ok(Math.abs(leftCol.y - rightCol.y) < 20, 'Cards should align vertically at the top on desktop');
    } else {
      assert.ok(rightCol.y >= leftCol.y + leftCol.height - 10, 'Cards should stack vertically on mobile');
    }

    // Verify Global Voice Card is fixed at bottom-right
    const voiceHud = page.locator('[data-global-voice-hud]');
    await voiceHud.waitFor({ state: 'visible' });
    const hudBox = await withinViewport(page, voiceHud);
    assert.ok(hudBox.x + hudBox.width > viewportWidth * 0.4, 'Global Voice HUD must be positioned towards the right');
    assert.ok(hudBox.y + hudBox.height > viewportHeight * 0.7, 'Global Voice HUD must be positioned at bottom');

    await capture(page, `${profile.name}-01-onboarding-1-3`);

    // 2. Start Microphone via Global Voice Control
    await page.getByRole('button', { name: 'Mở trạng thái micro', exact: true }).click();
    await page.getByRole('button', { name: 'Đồng ý & Bật micro', exact: true }).click();
    await page.getByRole('button', { name: 'Thu gọn bảng điều khiển giọng nói', exact: true }).click();
    assert.ok((await guide.innerText()).includes('Micro đang nghe'), 'Guide should indicate mic is listening');

    // 3. User says "Trợ giúp" -> Navigates to /voice-guide, Stage advances to 2
    await say(page, 'Trợ giúp');
    await page.waitForURL('**/voice-guide');
    await say(page, 'Trang chủ');
    await page.waitForURL(baseURL.replace(/\/$/, '') + '/');

    // 4. Onboarding 2/3
    await guide.waitFor({ state: 'visible' });
    assert.equal(await guide.getAttribute('data-guidance-stage'), '2');
    assert.equal(await guide.getAttribute('data-guidance-status'), 'active');
    assert.ok((await guide.innerText()).includes('2/3'), 'Should display 2/3 indicator');
    assert.ok((await guide.innerText()).includes('Cuộn xuống'), 'Should prompt to say Cuộn xuống');
    await capture(page, `${profile.name}-02-onboarding-2-3`);

    // 5. User says "Cuộn xuống" -> Scrolls page down, Stage advances to 3
    const scrollBefore = await page.evaluate(() => window.__qaScroll.length);
    await say(page, 'Cuộn xuống');
    assert.ok((await page.evaluate(() => window.__qaScroll.length)) > scrollBefore, 'Page scroll should execute');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    // 6. Onboarding 3/3
    await guide.waitFor({ state: 'visible' });
    assert.equal(await guide.getAttribute('data-guidance-stage'), '3');
    assert.equal(await guide.getAttribute('data-guidance-status'), 'active');
    assert.ok((await guide.innerText()).includes('3/3'), 'Should display 3/3 indicator');
    assert.ok((await guide.innerText()).includes('Tuyệt vời!'), 'Should display ready message');
    assert.ok((await guide.innerText()).includes('Học thử'), 'Should prompt to say Học thử');
    // Ensure NO duplicate CTA "Học thử ngay" in the right card
    assert.equal(await guide.getByRole('link', { name: /Học thử ngay/ }).count(), 0, 'No duplicate CTA link in right card');
    await capture(page, `${profile.name}-03-onboarding-3-3`);

    // 7. Click "Hoàn tất làm quen →" -> Transitions to State 2 (Completed Quick Guidance)
    await page.getByRole('button', { name: 'Hoàn tất làm quen →', exact: true }).click();
    assert.equal(await guide.getAttribute('data-guidance-status'), 'completed');

    // Verify Persistent Quick Guidance Card content
    const guideTextCompleted = await guide.innerText();
    assert.ok(guideTextCompleted.includes('BẠN CÓ THỂ NÓI GÌ VỚI SAYNTAX?'), 'Must have persistent quick guide title');
    assert.ok(guideTextCompleted.includes('Trợ giúp'), 'Must list Trợ giúp');
    assert.ok(guideTextCompleted.includes('Cuộn xuống'), 'Must list Cuộn xuống');
    assert.ok(guideTextCompleted.includes('Học thử'), 'Must list Học thử');
    assert.ok(guideTextCompleted.includes('Làm quen lại từ đầu'), 'Must offer link to restart onboarding');
    assert.equal(await guide.getByRole('link', { name: /Học thử ngay/ }).count(), 0, 'No duplicate CTA in quick guide');

    // Layout check in Completed state: Both columns still present!
    assert.equal(await page.locator('[data-guidance-panel]').count(), 1, 'Right guidance card must remain in completed state');
    await capture(page, `${profile.name}-04-completed`);

    // 8. Test Restart & Skip -> Skipped state
    await page.getByRole('button', { name: 'Làm quen lại từ đầu', exact: true }).click();
    assert.equal(await guide.getAttribute('data-guidance-status'), 'active');
    assert.equal(await guide.getAttribute('data-guidance-stage'), '1');

    await page.getByRole('button', { name: 'Bỏ qua hướng dẫn', exact: true }).click();
    assert.equal(await guide.getAttribute('data-guidance-status'), 'skipped');
    const guideTextSkipped = await guide.innerText();
    assert.ok(guideTextSkipped.includes('BẠN CÓ THỂ NÓI GÌ VỚI SAYNTAX?'), 'Must have persistent quick guide title in skipped state');
    assert.ok(guideTextSkipped.includes('Làm quen lại từ đầu'), 'Must offer link to restart onboarding');
    await capture(page, `${profile.name}-05-skipped`);

    // 9. Returning User: Reload page with existing completed/skipped state
    await page.evaluate(() => {
      localStorage.setItem('sayntax:first-time-guidance', JSON.stringify({ version: 1, status: 'completed', stage: 3 }));
    });
    await page.reload();
    await guide.waitFor({ state: 'visible' });
    assert.equal(await guide.getAttribute('data-guidance-status'), 'completed');
    assert.ok((await guide.innerText()).includes('BẠN CÓ THỂ NÓI GÌ VỚI SAYNTAX?'), 'Returning user sees quick guide');
    await capture(page, `${profile.name}-06-returning-user`);

    // 10. Audit Global Voice Card details in expanded state
    await page.getByRole('button', { name: 'Mở rộng chi tiết trạng thái giọng nói', exact: true }).click();
    await withinViewport(page, voiceHud);
    await capture(page, `${profile.name}-07-global-voice-expanded`);
    await page.getByRole('button', { name: 'Thu gọn bảng điều khiển giọng nói', exact: true }).click();

    // Verify no horizontal scrolling overflow
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');

    report.profiles.push({ name: profile.name, status: 'PASS' });
    console.log(`PASS ${profile.name}: all 6 states verified, 2-column hero stable, Global Voice fixed at bottom right.`);
    await context.close();
  }
} catch (err) {
  report.failure = err.stack || String(err);
  console.error('Test run failed:', err);
  throw err;
} finally {
  await browser.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const gallery = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>SAYNTAX - Visual QA Gallery</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; background: #fffdf3; color: #121212; }
    h1 { font-size: 28px; font-weight: 900; margin-bottom: 8px; }
    p { margin-bottom: 24px; color: #444; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 24px; }
    .card { background: white; border: 2px solid black; border-radius: 16px; padding: 16px; box-shadow: 4px 4px 0 #121212; }
    .card h3 { margin-top: 0; font-size: 14px; font-weight: 800; font-family: monospace; }
    .card img { width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>SAYNTAX — Persistent Hero Guidance & Global Voice Visual QA</h1>
  <p>Chụp tự động tất cả các trạng thái: Onboarding 1/3, 2/3, 3/3, Đã hoàn thành, Bỏ qua, Returning user, Global Voice.</p>
  <div class="grid">
    ${report.screenshots.map(s => `<div class="card"><h3>${s}</h3><a href="${s}" target="_blank"><img src="${s}" alt="${s}" loading="lazy"></a></div>`).join('\n')}
  </div>
</body>
</html>`;
  await writeFile(resolve(output, 'index.html'), gallery + '\n');
}
