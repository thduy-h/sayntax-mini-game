// Speech recognition is mocked at its input boundary. The existing Global
// Voice controller, workspace command routing and scroll executor run normally.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright/test');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';
const output = resolve(process.env.QA_OUTPUT || 'artifacts/knowledge-depth-qa');
const profiles = [
  { name: 'desktop-1366', width: 1366, height: 768, zoom: 1 },
  { name: 'fhd-100', width: 1920, height: 1080, zoom: 1 },
  { name: 'fhd-150', width: 1920, height: 1080, zoom: 1.5 },
  { name: 'fhd-200', width: 1920, height: 1080, zoom: 2 },
  { name: 'mobile-390', width: 390, height: 844, zoom: 1 },
];
const report = { baseURL, checkedAt: new Date().toISOString(), profiles: [], screenshots: [], errors: [], input: 'SpeechRecognition input mock; real Global Voice/workspace executor. Real audio not verified.', zoom: 'Viewport reflow and deviceScaleFactor; not browser-toolbar/OS zoom.' };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...(process.env.QA_BROWSER ? { executablePath: process.env.QA_BROWSER } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
async function speechMock(context) {
  await context.addInitScript(() => {
    window.MediaRecorder = undefined;
    window.__qaSpeech = { starts: 0, instances: [] };
    window.SpeechRecognition = class {
      start() { window.__qaSpeech.starts++; window.__qaSpeech.instances.push(this); }
      stop() { this.onend?.(); }
      abort() {}
    };
    window.__qaSay = (transcript) => {
      const recognition = window.__qaSpeech.instances.at(-1);
      if (!recognition) throw new Error('Consent/start required before speech input.');
      recognition.onresult({ resultIndex: 0, results: [{ 0: { transcript, confidence: 0.99 }, length: 1, isFinal: true }] });
    };
  });
}
async function say(page, text) {
  await page.evaluate((value) => window.__qaSay(value), text);
  await page.waitForTimeout(250);
}
async function screenshot(page, name) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled' });
  report.screenshots.push(`${name}.png`);
}
async function geometry(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('#panel-knowledge');
    const workspace = document.querySelector('[data-knowledge-workspace]');
    const hint = document.querySelector('[data-knowledge-scroll-hint]');
    const hud = document.querySelector('[data-global-voice-hud]');
    const rect = (element) => element?.getBoundingClientRect().toJSON();
    return { top: panel.scrollTop, height: panel.clientHeight, content: panel.scrollHeight, panel: rect(panel), workspace: rect(workspace), hint: rect(hint), hud: rect(hud), outerScroll: scrollY, hintInsideContent: panel.contains(hint) };
  });
}
async function hintDoesNotCover(page) {
  await expect.poll(async () => {
    const g = await geometry(page);
    return Boolean(g.hint && g.hint.y >= g.panel.bottom - 1 && g.hint.bottom <= g.workspace.bottom + 1 && g.hint.bottom <= g.hud.top - 4 && g.hint.y >= 0 && g.hint.bottom <= page.viewportSize().height && !g.hintInsideContent);
  }).toBe(true);
}
let currentPage;
try {
  for (const profile of profiles.filter((entry) => !process.env.QA_PROFILE || process.env.QA_PROFILE.split(',').includes(entry.name))) {
    const context = await browser.newContext({ viewport: { width: Math.floor(profile.width / profile.zoom), height: Math.floor(profile.height / profile.zoom) }, deviceScaleFactor: profile.zoom });
    await speechMock(context);
    const page = await context.newPage();
    currentPage = page;
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => report.errors.push(`${profile.name}: ${error.message}`));
    await page.goto(`${baseURL}/demo/start-and-sequence-v2`);
    const panel = page.locator('#panel-knowledge');
    const hint = page.locator('[data-knowledge-scroll-hint]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel.locator('h3')).toHaveCount(7);
    await expect(panel.getByRole('button')).toHaveCount(0);
    await expect(panel).toContainText('Blockly');
    await expect(panel).toContainText('không cần máy in');
    await expect(panel.locator('#primer-complete-example').locator('..').getByRole('figure')).toContainText('Xin chào');
    await expect(hint).toBeVisible();
    await hintDoesNotCover(page);
    const top = await geometry(page);
    assert.ok(top.content > top.height, 'Teaching content naturally requires scrolling');
    assert.equal(top.top, 0);
    const font = await panel.locator('#lesson-primer-desc').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    assert.ok(font >= 16, 'No reduced reading font');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal document overflow');
    await screenshot(page, `${profile.name}-01-top`);

    assert.equal(await page.evaluate(() => window.__qaSpeech.starts), 0);
    await page.getByRole('button', { name: 'Bật micro cho người học', exact: true }).click();
    await page.getByRole('button', { name: 'Đồng ý & Bật micro', exact: true }).click();
    await page.getByRole('button', { name: 'Thu gọn bảng điều khiển giọng nói', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Dừng nghe micro', exact: true })).toBeVisible();
    await say(page, 'Về đầu trang');
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0);
    const outerScroll = await page.evaluate(() => scrollY);
    const blocksBefore = await page.locator('#panel-practice .blocklyBlockCanvas').first().getAttribute('transform');
    await say(page, 'Cuộn xuống');
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator('#tab-knowledge')).toHaveAttribute('aria-selected', 'true');
    assert.equal(await page.evaluate(() => scrollY), outerScroll, 'Voice scroll belongs to knowledge, not the document');
    assert.equal(await page.locator('#panel-practice .blocklyBlockCanvas').first().getAttribute('transform'), blocksBefore, 'Knowledge scroll must not pan Blockly');
    await say(page, 'câu nói không phải lệnh');
    await expect(panel).toBeVisible();
    await say(page, 'Cuộn lên');
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0);

    await panel.evaluate((element) => {
      const example = element.querySelector('#primer-complete-example').parentElement.querySelector('figure');
      element.scrollTop += example.getBoundingClientRect().top - element.getBoundingClientRect().top;
    });
    await expect(hint).toBeVisible();
    await hintDoesNotCover(page);
    const middle = await geometry(page);
    assert.ok(middle.top > 0 && middle.top < middle.content - middle.height);
    assert.ok(Math.abs(middle.hint.y - top.hint.y) < 2, 'Hint stays at the workspace edge as content scrolls');
    await screenshot(page, `${profile.name}-02-middle`);

    await say(page, 'Xuống cuối trang');
    await expect.poll(async () => { const g = await geometry(page); return g.content - g.height - g.top; }).toBeLessThan(2);
    await expect(hint).toBeHidden();
    await expect(page.locator('#tab-knowledge')).toHaveAttribute('aria-selected', 'true');
    await screenshot(page, `${profile.name}-03-bottom`);
    await say(page, 'Cuộn xuống');
    await expect(panel).toBeVisible();
    await expect(hint).toBeHidden();
    await say(page, 'Về đầu trang');
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(hint).toBeVisible();
    // Native keyboard reading remains available alongside the voice flow.
    await panel.focus();
    await page.keyboard.press('PageDown');
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await say(page, 'Thực hành');
    await expect(panel).toHaveCount(0);
    await expect(page.locator('#tab-practice')).toHaveAttribute('aria-selected', 'true');
    await say(page, 'Xem kiến thức');
    await expect(panel).toBeVisible();
    await expect(panel.locator('h3')).toHaveCount(7);
    await expect(panel.getByRole('button')).toHaveCount(0);
    assert.equal(await page.evaluate(() => window.__qaSpeech.starts), 1, 'One shared mic session');
    report.profiles.push({ name: profile.name, passed: true, top, middle, voiceScroll: true, keyboardScroll: true, singleMicSession: true });
    console.log(`PASS ${profile.name}: teaching content, top/middle/bottom hint, no overlap, voice/keyboard scroll, tabs, one mic`);
    await context.close();
    currentPage = undefined;
  }
  // Audit the other four primers in a genuinely tall viewport. Short content
  // must fit naturally without a hint manufacturing overflow by reserving space.
  if (!process.env.QA_PROFILE || process.env.QA_OTHER_LESSONS === 'true') {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1800 } });
    const page = await context.newPage();
    currentPage = page;
    const others = [];
    for (const slug of ['print-output-v2', 'repeat-loops-v2', 'if-basics-v2', 'variables-basics-v2']) {
      await page.goto(`${baseURL}/demo/${slug}`);
      const panel = page.locator('#panel-knowledge');
      await expect(panel).toBeVisible();
      await expect(panel.locator('dd')).toHaveCount(4);
      await expect(panel.getByRole('button')).toHaveCount(0);
      await expect(page.locator('[data-knowledge-scroll-hint]')).toHaveCount(0);
      const metrics = await geometry(page);
      assert.ok(metrics.content <= metrics.height + 8);
      others.push({ slug, passed: true, shortContentHasNoHint: true });
    }
    report.otherLessons = others;
    await context.close();
    currentPage = undefined;
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack || String(error);
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(output, 'index.html'), `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Knowledge Primer QA</title><style>body{font:16px system-ui;margin:24px;background:#fffdf3;color:#121212}img{max-width:100%;height:auto;border:1px solid #121212}figure{margin:24px 0}figcaption{font-weight:bold}</style><h1>Knowledge Primer — đầu, giữa, cuối</h1><p>Speech input mocked; real command execution. Zoom uses viewport reflow. <a href="report.json">Report</a></p>${report.screenshots.map((name) => `<figure><figcaption>${name}</figcaption><a href="${name}"><img loading="lazy" src="${name}" alt="${name}"></a></figure>`).join('')}</html>`);
  await browser.close();
}
