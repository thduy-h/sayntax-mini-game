// Local browser QA: real browser zoom, speech input mocked, existing executors.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright/test');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';
const output = resolve(process.env.QA_OUTPUT || 'artifacts/visual-refinement-qa/after');
const executablePath = process.env.QA_BROWSER;
const profiles = [
  { name: 'desktop-1366', width: 1366, height: 768, zoom: 1 },
  { name: 'fhd-100', width: 1920, height: 1080, zoom: 1 },
  { name: 'fhd-125', width: 1920, height: 1080, zoom: 1.25 },
  { name: 'fhd-150', width: 1920, height: 1080, zoom: 1.5 },
  { name: 'fhd-200', width: 1920, height: 1080, zoom: 2 },
  { name: 'mobile-390', width: 390, height: 844, zoom: 1 },
];
const report = { checkedAt: new Date().toISOString(), baseURL, profiles: [], screenshots: [], errors: [], zoom: 'Actual browser tab zoom via QA-only extension chrome.tabs.setZoom/getZoom.', voice: 'SpeechRecognition input mock; actual Global Voice routing and workspace executor; real audio/ASR not verified.' };
await mkdir(output, { recursive: true });
const scratch = await mkdtemp(join(tmpdir(), 'sayntax-visual-qa-'));
const extension = join(scratch, 'zoom-extension');
await mkdir(extension);
await writeFile(join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Local SAYNTAX QA zoom', version: '1.0', permissions: ['tabs'], background: { service_worker: 'background.js' } }));
await writeFile(join(extension, 'background.js'), 'chrome.runtime.onInstalled.addListener(() => {});');

async function installSpeechMock(context) {
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
      if (!recognition) throw new Error('Voice must be started with consent.');
      recognition.onresult({ resultIndex: 0, results: [{ 0: { transcript, confidence: 0.99 }, length: 1, isFinal: true }] });
    };
  });
}
async function say(page, text) {
  await page.evaluate(value => window.__qaSay(value), text);
}
async function startVoice(page) {
  assert.equal(await page.evaluate(() => window.__qaSpeech.starts), 0, 'No automatic microphone start');
  await page.getByRole('button', { name: 'Bật micro cho người học', exact: true }).click();
  const consent = page.getByRole('button', { name: 'Đồng ý & Bật micro', exact: true });
  if (await consent.isVisible()) await consent.click();
  const collapse = page.getByRole('button', { name: 'Thu gọn bảng điều khiển giọng nói', exact: true });
  if (await collapse.isVisible()) await collapse.click();
  await expect(page.getByRole('button', { name: 'Dừng nghe micro', exact: true })).toBeVisible();
}
async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: resolve(output, `${name}.png`), fullPage, animations: 'disabled' });
  report.screenshots.push(`${name}.png`);
}
async function geometry(page) {
  return page.evaluate(() => {
    const el = document.querySelector('#panel-knowledge');
    const workspace = document.querySelector('[data-knowledge-workspace]');
    const hint = document.querySelector('[data-knowledge-scroll-hint]');
    const hud = document.querySelector('[data-global-voice-hud]');
    const rect = element => element?.getBoundingClientRect().toJSON();
    return { top: el.scrollTop, height: el.clientHeight, content: el.scrollHeight, panel: rect(el), workspace: rect(workspace), hint: rect(hint), hud: rect(hud), outerScroll: scrollY, innerHeight, hintInsideContent: el.contains(hint) };
  });
}
async function safeHint(page) {
  await expect.poll(async () => {
    const g = await geometry(page);
    return Boolean(g.hint && !g.hintInsideContent && g.hint.y >= g.panel.bottom + 3 && g.hint.bottom < g.workspace.bottom && g.hint.bottom < g.hud.top && g.hint.y > 0 && g.hint.bottom <= g.innerHeight);
  }).toBe(true);
}
async function noHorizontalOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal overflow');
}
async function diagramsFit(page) {
  assert.deepEqual(await page.locator('[data-primer-illustration]').evaluateAll(elements => elements
    .filter(el => el.scrollWidth > el.clientWidth + 1)
    .map(el => el.dataset.primerIllustration)), [], 'Diagrams must fit their own reading pane, including beside the expanded HUD');
}
async function assertUncovered(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect.poll(() => locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
}

let context;
let page;
try {
  for (const profile of profiles.filter(p => !process.env.QA_PROFILE || process.env.QA_PROFILE.split(',').includes(p.name))) {
    context = await chromium.launchPersistentContext(join(scratch, profile.name), {
      ...(executablePath ? { executablePath } : {}), headless: true,
      viewport: { width: profile.width, height: profile.height },
      args: ['--no-sandbox', '--disable-dev-shm-usage', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    await installSpeechMock(context);
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.errors.push(`${profile.name}: ${error.message}`));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await page.goto(baseURL);
    const actualZoom = await worker.evaluate(async ({ url, zoom }) => {
      const tabs = await chrome.tabs.query({ url: `${url}/*` });
      const tab = tabs.at(-1);
      await chrome.tabs.setZoom(tab.id, zoom);
      return chrome.tabs.getZoom(tab.id);
    }, { url: baseURL, zoom: profile.zoom });
    assert.equal(actualZoom, profile.zoom);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(Math.round(profile.width / profile.zoom));
    const hero = page.locator('[data-landing-hero]');
    await expect(hero).toContainText('Học lập trình bằng giọng nói tiếng Việt.');
    await expect(hero.getByRole('link', { name: 'Học thử ngay — Miễn phí →', exact: true })).toHaveCount(1);
    await expect(hero.locator('button')).toHaveCount(0);
    await expect(page.locator('#landing-guidance h3')).toHaveCount(2);
    await expect(page.locator('#landing-guidance dt')).toHaveCount(2);
    await expect(page.locator('#landing-guidance')).not.toContainText('1/3');
    await expect(page.locator('#landing-guidance')).toContainText('không cần bật micro');
    await expect(page.locator('[data-learning-discovery]')).toHaveCount(1);
    await noHorizontalOverflow(page);
    const landing = await hero.evaluate(el => {
      const [left, right] = [...el.children].map(child => {
        const r = child.getBoundingClientRect();
        return { x: r.x, y: r.y, height: r.height, bottom: r.bottom, contentBottom: child.lastElementChild.getBoundingClientRect().bottom };
      });
      return { left, right, columns: getComputedStyle(el).gridTemplateColumns };
    });
    if (profile.width / profile.zoom >= 1024) {
      assert.ok(landing.right.x > landing.left.x, 'Desktop keeps two columns');
      assert.ok(Math.abs(landing.left.height - landing.right.height) < 2);
      assert.ok(Math.abs(landing.left.contentBottom - landing.right.contentBottom) < 100, 'Comparable content density');
    }
    await shot(page, `${profile.name}-landing`);
    if (profile.name === 'mobile-390') await shot(page, `${profile.name}-landing-full`, true);
    await assertUncovered(page, hero.getByRole('link', { name: 'Học thử ngay — Miễn phí →', exact: true }));
    await startVoice(page);
    await say(page, 'Về đầu trang');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await say(page, 'Cuộn xuống');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await say(page, 'Học thử');
    await page.waitForURL(`${baseURL}/demo`);
    await say(page, 'Trợ giúp');
    await page.waitForURL(`${baseURL}/voice-guide`);
    assert.equal(await page.evaluate(() => window.__qaSpeech.starts), 1);

    await page.goto(`${baseURL}/demo/start-and-sequence-v2`);
    const panel = page.locator('#panel-knowledge');
    const hint = page.locator('[data-knowledge-scroll-hint]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel.locator('h3')).toHaveCount(7);
    await expect(panel.getByRole('button')).toHaveCount(0);
    await expect(panel.locator('[data-primer-illustration]')).toHaveCount(5);
    await expect(panel).toContainText('không cần máy in');
    await expect(panel).toContainText('ghép các khối lệnh theo đúng trình tự');
    await expect(hint).toBeVisible();
    await expect(page.locator('[data-knowledge-hint-slot]')).toHaveCount(0);
    await safeHint(page);
    await noHorizontalOverflow(page);
    await diagramsFit(page);
    const top = await geometry(page);
    assert.equal(top.top, 0);
    await shot(page, `${profile.name}-knowledge-top`);
    await startVoice(page);
    const outerScroll = await page.evaluate(() => scrollY);
    const blocks = await page.locator('#panel-practice .blocklyBlockCanvas').first().getAttribute('transform');
    await say(page, 'Cuộn xuống');
    await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    assert.equal(await page.evaluate(() => scrollY), outerScroll);
    assert.equal(await page.locator('#panel-practice .blocklyBlockCanvas').first().getAttribute('transform'), blocks);
    await expect(page.locator('#tab-knowledge')).toHaveAttribute('aria-selected', 'true');
    await say(page, 'câu nói không phải lệnh');
    await expect(panel).toBeVisible();
    await say(page, 'Về đầu trang');
    await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBe(0);
    // Extra screenshot shows the new everyday-to-program visual; middle keeps
    // the same complete-program example as the preceding QA for comparison.
    await panel.evaluate(el => { const figure = el.querySelector('[data-primer-illustration="program"]'); el.scrollTop += figure.getBoundingClientRect().top - el.getBoundingClientRect().top; });
    await safeHint(page);
    await shot(page, `${profile.name}-knowledge-program-visual`);
    await panel.evaluate(el => { const figure = el.querySelector('#primer-complete-example').parentElement.querySelector('figure'); el.scrollTop += figure.getBoundingClientRect().top - el.getBoundingClientRect().top; });
    await expect(hint).toBeVisible();
    await safeHint(page);
    const middle = await geometry(page);
    assert.ok(Math.abs(top.hint.bottom - middle.hint.bottom) < 3, 'Floating hint is anchored to visible workspace');
    await shot(page, `${profile.name}-knowledge-middle`);
    await say(page, 'Xuống cuối trang');
    await expect.poll(async () => { const g = await geometry(page); return g.content - g.height - g.top; }).toBeLessThan(2);
    await expect(hint).toBeHidden();
    await shot(page, `${profile.name}-knowledge-bottom`);
    await say(page, 'Cuộn xuống');
    await expect(page.locator('#tab-knowledge')).toHaveAttribute('aria-selected', 'true');
    await expect(hint).toBeHidden();
    await say(page, 'Về đầu trang');
    await expect(hint).toBeVisible();
    await panel.focus();
    await page.keyboard.press('PageDown');
    await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await say(page, 'Thực hành');
    await expect(panel).toHaveCount(0);
    await expect(hint).toHaveCount(0);
    await expect(page.locator('#tab-practice')).toHaveAttribute('aria-selected', 'true');
    await shot(page, `${profile.name}-practice`);
    await say(page, 'Xem kiến thức');
    await expect(panel).toBeVisible();
    await expect(hint).toBeVisible();
    assert.equal(await page.evaluate(() => window.__qaSpeech.starts), 1, 'Knowledge uses one shared mic session');
    await page.getByRole('button', { name: 'Mở rộng chi tiết trạng thái giọng nói', exact: true }).click();
    // Expanded HUD: read beside it when wide enough; narrow screens suppress
    // the hint while the details overlay is open. The existing collapse and
    // microphone controls stay reachable, and closing restores the hint.
    await expect.poll(async () => {
      const g = await geometry(page);
      if (!await hint.isVisible()) return true;
      return g.hint.right < g.hud.left || g.hint.bottom < g.hud.top;
    }).toBe(true);
    await diagramsFit(page);
    const collapse = page.getByRole('button', { name: 'Thu gọn bảng điều khiển giọng nói', exact: true });
    await assertUncovered(page, collapse);
    await shot(page, `${profile.name}-knowledge-expanded-voice`);
    await collapse.click();
    await expect(hint).toBeVisible();
    await safeHint(page);
    await expect(page.getByRole('button', { name: 'Dừng nghe micro', exact: true })).toBeVisible();
    report.profiles.push({ name: profile.name, passed: true, actualZoom, innerWidth: await page.evaluate(() => innerWidth), landing, top, middle, voiceScroll: true, keyboardScroll: true, singleMicSession: true, expandedHud: true });
    console.log(`PASS ${profile.name}: actual zoom ${actualZoom}, landing/navigation, illustrations, hint, voice/keyboard, practice`);
    await context.close();
    context = undefined;
  }
  // All five lessons: diagrams and original content; in a tall viewport, short
  // primers must not acquire a hint simply because a hint reserves some space.
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox'] });
  try {
    page = await browser.newPage({ viewport: { width: 1920, height: 2400 } });
    report.otherLessons = [];
    for (const slug of ['print-output-v2', 'repeat-loops-v2', 'if-basics-v2', 'variables-basics-v2']) {
      await page.goto(`${baseURL}/demo/${slug}`);
      const panel = page.locator('#panel-knowledge');
      await expect(panel.locator('dd')).toHaveCount(4);
      await expect(panel.locator('[data-primer-illustration]')).toHaveCount(1);
      await expect(panel.getByLabel('Điều cần nhớ')).toBeVisible();
      await expect(page.locator('[data-knowledge-scroll-hint]')).toHaveCount(0);
      const g = await geometry(page);
      assert.ok(g.content <= g.height + 8);
      await shot(page, `${slug}-primer`);
      report.otherLessons.push({ slug, passed: true, illustration: true, noArtificialOverflow: true });
    }
  } finally { await browser.close(); }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack || String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  if (context) await context.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(output, 'index.html'), `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SAYNTAX visual QA</title><style>body{font:16px system-ui;margin:24px;background:#fffdf3;color:#121212}img{max-width:100%;height:auto;border:1px solid #121212}figure{margin:24px 0}figcaption{font-weight:bold}</style><h1>Landing & Knowledge visual QA</h1><p>Actual browser zoom. Speech input mocked, existing command executor. <a href="report.json">Report</a></p>${report.screenshots.map(name => `<figure><figcaption>${name}</figcaption><a href="${name}"><img loading="lazy" src="${name}" alt="${name}"></a></figure>`).join('')}</html>`);
  await rm(scratch, { recursive: true, force: true });
}
