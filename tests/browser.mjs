import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const OFFLINE = process.argv.includes('--offline');
const BASE_URL = OFFLINE ? 'http://drive.local.test' : process.argv.find((argument) => argument.startsWith('--base-url='))?.slice('--base-url='.length) || process.env.BASE_URL || 'http://localhost:5920';
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const DEFAULT_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_PATH = process.env.CHROME_PATH || DEFAULT_CHROME_PATH;
const ARTIFACT_DIR = path.resolve(process.cwd(), '.artifacts');
const SETTLE_MS = 2_500;

class WebGLUnavailableError extends Error {}

const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
const artifactPath = (name) => path.join(ARTIFACT_DIR, name);

function isExternalFontUrl(value = '') {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'fonts.googleapis.com' || hostname === 'fonts.gstatic.com';
  } catch {
    return /fonts\.(?:googleapis|gstatic)\.com/i.test(value);
  }
}

function createDiagnostics() {
  return {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    fontNetworkWarnings: [],
    referenceRequests: [],
  };
}

function observePage(page, label, diagnostics) {
  const baseOrigin = new URL(BASE_URL).origin;

  page.on('request', request => { if (/REFERENSI-GAMBAR|Gambar%20ChatGPT/i.test(request.url())) diagnostics.referenceRequests.push(request.url()); });

  page.on('console', (message) => {
    if (!['error', 'assert'].includes(message.type())) return;

    const location = message.location();
    const detail = `[${label}] ${message.type()}: ${message.text()}${location.url ? ` (${location.url}:${location.lineNumber ?? 0})` : ''}`;
    if (isExternalFontUrl(location.url) || isExternalFontUrl(message.text())) {
      diagnostics.fontNetworkWarnings.push(detail);
    } else {
      diagnostics.consoleErrors.push(detail);
    }
  });

  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push(`[${label}] ${error.stack || error.message}`);
  });

  page.on('error', (error) => {
    diagnostics.pageErrors.push(`[${label}] Browser page crashed: ${error.stack || error.message}`);
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    const reason = request.failure()?.errorText || 'unknown failure';
    const detail = `[${label}] ${request.resourceType()} request failed: ${url} (${reason})`;

    if (isExternalFontUrl(url)) {
      diagnostics.fontNetworkWarnings.push(detail);
      return;
    }

    let sameOrigin = false;
    try {
      sameOrigin = new URL(url).origin === baseOrigin;
    } catch {
      return;
    }

    const criticalTypes = new Set(['document', 'script', 'stylesheet', 'image', 'font', 'xhr', 'fetch']);
    if (sameOrigin && criticalTypes.has(request.resourceType())) {
      diagnostics.requestFailures.push(detail);
    }
  });
}

async function createPage(browser, label, diagnostics, viewport) {
  const page = await browser.newPage();
  observePage(page, label, diagnostics);
  if (OFFLINE) {
    // Fulfil browser requests from the build files. No HTTP server or listening port.
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (url.origin !== BASE_URL) { await request.continue(); return; }
      try {
        const pathname = decodeURIComponent(url.pathname);
        const file = path.resolve(DIST_DIR, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (!file.startsWith(`${DIST_DIR}${path.sep}`)) { await request.respond({ status: 403, body: '' }); return; }
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
        await request.respond({ status: 200, contentType: types[path.extname(file)] || 'application/octet-stream', body: await readFile(file) });
      } catch {
        await request.respond({ status: 404, body: 'Build asset not found' });
      }
    });
  }
  page.setDefaultTimeout(12_000);
  page.setDefaultNavigationTimeout(15_000);
  await page.setViewport(viewport);
  return page;
}

async function openLanding(page) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set('scene-diagnostics', '1');
    await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    throw new Error(`Tidak dapat membuka ${BASE_URL}. ${OFFLINE ? 'Pastikan build dist tersedia.' : 'Pastikan preview aktif.'}\n${error.message}`, { cause: error });
  }

  await page.waitForSelector('#journey');
  await page.waitForSelector('.preloader', { hidden: true, timeout: 10_000 });
  await page.waitForSelector('.scene-loading-label', { hidden: true, timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready);
}

async function cameraPosition(page) {
  return page.$eval('.experience canvas', (canvas) => (canvas.dataset.camera || '').split(',').map(Number));
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} memiliki horizontal overflow: scrollWidth=${dimensions.scrollWidth}, clientWidth=${dimensions.clientWidth}`,
  );
}

async function assertJourneyCanvas(page, diagnostics) {
  await page.waitForFunction(
    () => document.querySelector('.experience canvas') || document.querySelector('.experience--fallback'),
    { timeout: 10_000 },
  );

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('.experience canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;

    const rect = canvas.getBoundingClientRect();
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return {
      cssWidth: rect.width,
      cssHeight: rect.height,
      bufferWidth: canvas.width,
      bufferHeight: canvas.height,
      hasContext: Boolean(gl),
      contextLost: gl?.isContextLost() ?? true,
      renderer: gl ? String(gl.getParameter(gl.RENDERER)) : 'unavailable',
    };
  });

  if (!info) {
    const errors = [...diagnostics.pageErrors, ...diagnostics.consoleErrors];
    const nonWebGLErrors = errors.filter((error) => !/(webgl.*context|context.*webgl|error creating webgl|gpu process)/i.test(error));
    if (nonWebGLErrors.length) {
      throw new Error(`Scene 3D masuk fallback setelah error runtime:\n${nonWebGLErrors.join('\n')}`);
    }
    throw new WebGLUnavailableError('Canvas WebGL tidak tersedia dengan konfigurasi browser saat ini.');
  }

  if (!info.hasContext || info.contextLost) {
    throw new WebGLUnavailableError(`Context WebGL tidak aktif (renderer: ${info.renderer}).`);
  }

  assert.ok(info.cssWidth >= 300 && info.cssHeight >= 300, `Canvas terlalu kecil: ${info.cssWidth}x${info.cssHeight}`);
  assert.ok(info.bufferWidth > 0 && info.bufferHeight > 0, `Drawing buffer kosong: ${info.bufferWidth}x${info.bufferHeight}`);
  return info;
}

async function assertStage(page, expectedStage) {
  const state = await page.evaluate((stageIndex) => {
    const journey = document.querySelector('#journey');
    const panels = [...document.querySelectorAll('.story-panel')];
    const visiblePanels = panels.flatMap((panel, index) => {
      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      const visible = panel.getAttribute('aria-hidden') !== 'true'
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0.5
        && rect.width > 0
        && rect.height > 0;
      return visible ? [index] : [];
    });

    const selectedChapter = document.querySelector('.chapter-nav button[aria-current="step"]');
    const targetChapter = document.querySelectorAll('.chapter-nav button')[stageIndex]?.getBoundingClientRect();
    const hit = targetChapter ? document.elementFromPoint(targetChapter.x + targetChapter.width / 2, targetChapter.y + targetChapter.height / 2) : null;
    return {
      dataStage: journey?.getAttribute('data-stage'),
      selectedLabel: selectedChapter?.getAttribute('aria-label') || '',
      targetHidden: panels[stageIndex]?.getAttribute('aria-hidden'),
      visiblePanels,
      scrollY: window.scrollY,
      hit: hit?.closest('button')?.outerHTML.slice(0, 240),
    };
  }, expectedStage);

  assert.equal(state.dataStage, String(expectedStage), `data-stage belum berpindah ke ${expectedStage}: ${JSON.stringify(state)}`);
  assert.match(state.selectedLabel, new RegExp(`Tahap ${expectedStage + 1}:`), 'Chapter aktif tidak sesuai');
  assert.notEqual(state.targetHidden, 'true', `Panel tahap ${expectedStage + 1} masih aria-hidden`);
  assert.deepEqual(state.visiblePanels, [expectedStage], `Panel yang terlihat tidak tepat: ${state.visiblePanels.join(', ')}`);
}

async function assertProductFaq(page) {
  assert.equal(await page.$$eval('.faq-item', items => items.length), 8, 'FAQ harus memuat delapan penjelasan alur produk');
  const cases = [
    { question: 'Saya punya asuransi.', patterns: [/semua pengguna wajib membayar/i, /termasuk.*berasuransi/i, /hasil umum/i] },
    { question: 'Apakah semua klaim', patterns: [/asuransi harus mengaktifkan/i, /memenuhi aturan produk/i, /peninjauan manual/i] },
    { question: 'Bagaimana bengkel dan towing', patterns: [/klaim disetujui/i, /mitra DRIVE.*terdaftar/i, /terdekat/i, /diperluas bertahap/i] },
    { question: 'Apakah tiket towing', patterns: [/satu tiket layanan untuk towing dan bengkel/i, /QR\/barcode yang sama/i, /kode manual/i] },
  ];
  for (const item of cases) {
    const index = await page.$$eval('.faq-item h3 > button', (buttons, question) => buttons.findIndex(button => button.textContent.includes(question)), item.question);
    assert.ok(index >= 0, `FAQ tidak ditemukan: ${item.question}`);
    const selector = `.faq-item:nth-of-type(${index + 1}) h3 > button`;
    if (await page.$eval(selector, button => button.getAttribute('aria-expanded')) !== 'true') await page.click(selector);
    await page.waitForFunction(buttonSelector => document.querySelector(buttonSelector)?.getAttribute('aria-expanded') === 'true', {}, selector);
    const answerId = await page.$eval(selector, button => button.getAttribute('aria-controls'));
    await page.waitForSelector(`#${answerId}`);
    const answer = await page.$eval(`#${answerId}`, element => element.textContent.replace(/\s+/g, ' '));
    for (const pattern of item.patterns) assert.match(answer, pattern, `Penjelasan FAQ tidak lengkap: ${item.question}`);
  }
}

async function testDesktop(page, diagnostics) {
  await openLanding(page);

  const heroText = await page.$eval('.story-panel--hero h1', (element) => element.textContent?.replace(/\s+/g, ' ').trim() || '');
  assert.match(heroText, /Perjalanan terhenti.*Langkah berikutnya jelas\./, 'Headline hero tidak tampil lengkap');
  assert.equal(await page.$eval('#journey', (element) => element.getAttribute('data-stage')), '0');

  const renderer = await assertJourneyCanvas(page, diagnostics);
  await assertNoHorizontalOverflow(page, 'Desktop');
  await page.mouse.move(700, 150);
  await sleep(700);
  await page.screenshot({ path: artifactPath('desktop-hero.png'), type: 'png' });
  await page.mouse.move(500, 180);
  await sleep(1100);
  const pointerBefore = await cameraPosition(page);
  await page.mouse.move(1260, 760);
  await sleep(1100);
  const pointerAfter = await cameraPosition(page);
  assert.ok(Math.abs(pointerAfter[0] - pointerBefore[0]) > 0.1, 'Pointer tidak menggerakkan camera rig');
  await page.mouse.move(700, 150);

  const chapterCount = await page.$$eval('.chapter-nav button', (buttons) => buttons.length);
  assert.equal(chapterCount, 8, 'Jumlah chapter perjalanan harus delapan');
  await page.evaluate(() => { window.__journeyTestCanvas = document.querySelector('.experience canvas'); });

  const cameras = [];
  const routes = [];
  const performance = [];
  let priorScroll = 0;
  for (let stage = 0; stage < chapterCount; stage += 1) {
    await page.click(`.chapter-nav button:nth-child(${stage + 1})`);
    await sleep(SETTLE_MS);
    await page.waitForFunction(
      (expected) => document.querySelector('#journey')?.getAttribute('data-stage') === String(expected),
      { timeout: 5_000 },
      stage,
    );
    await assertStage(page, stage);
    await page.mouse.move(700, 150);
    const camera = await cameraPosition(page);
    assert.equal(camera.length, 3, 'Kamera harus melaporkan posisi dunia lengkap');
    assert.ok(camera.every(Number.isFinite), 'Posisi kamera harus selalu valid termasuk saat berhenti untuk pemeriksaan');
    assert.equal(await page.evaluate(() => document.querySelector('.experience canvas') === window.__journeyTestCanvas), true, 'Canvas harus tetap sama antar chapter');
    cameras.push(camera);
    routes.push(await page.$eval('.experience canvas', canvas => ({ at: Number(canvas.dataset.worldPosition), road: Number(canvas.dataset.vehicleRoadProgress), carrier: canvas.dataset.vehicleCarrier })));
    performance.push(await page.$eval('.experience canvas', (canvas) => ({ quality: canvas.closest('.experience').dataset.quality, fps: canvas.dataset.fps, drawCalls: canvas.dataset.drawCalls, geometries: canvas.dataset.geometries })));
    await page.screenshot({ path: artifactPath(`stage-${stage + 1}.png`), type: 'png' });
    const currentScroll = await page.evaluate(() => window.scrollY);
    if (stage === 3) {
      // Check real scroll between chapters, in both directions, without recreating Canvas.
      const mid = priorScroll + (currentScroll - priorScroll) * 0.58;
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), mid);
      await sleep(1400);
      const between = await cameraPosition(page);
      assert.ok(between.every(Number.isFinite), 'Kamera transisi harus tetap valid');
      const betweenAt = await page.$eval('.experience canvas', canvas => Number(canvas.dataset.worldPosition));
      assert.ok(betweenAt > routes[2].at && betweenAt < routes[3].at, 'Scroll harus menggerakkan timeline di antara dua tahap');
      assert.equal(await page.evaluate(() => document.querySelector('.experience canvas') === window.__journeyTestCanvas), true, 'Scroll manual tidak boleh membuat ulang Canvas');
      await page.screenshot({ path: artifactPath('cinematic-transition.png'), type: 'png' });
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), currentScroll);
      await sleep(1400);
      await assertStage(page, 3);
    }
    priorScroll = currentScroll;
  }

  assert.ok(Math.hypot(...cameras.at(-1).map((value, index) => value - cameras[0][index])) > 100, 'Kamera harus mengikuti perjalanan dari insiden hingga kembali ke jalan');
  assert.ok(routes.at(-1).road > routes[0].road + .2, 'Kendaraan harus melanjutkan rute dunia pada akhir cerita');
  assert.ok(routes[0].carrier && routes.every(route => route.carrier === routes[0].carrier), 'Kendaraan fisik yang sama harus hadir di semua chapter');

  console.log(`[browser] Camera Z by chapter: ${cameras.map((camera) => camera[2].toFixed(1)).join(' → ')}`);
  console.log(`[browser] Render samples by chapter: ${JSON.stringify(performance)}`);

  await page.click('.motion-control');
  await page.waitForFunction(() => document.querySelector('.app')?.classList.contains('reduced-motion'));
  await sleep(300);
  await assertStage(page, 7);
  const calmCamera = await cameraPosition(page);
  await sleep(600);
  assert.deepEqual(await cameraPosition(page), calmCamera, 'Calm mode harus menghentikan gerakan dekoratif');
  await page.click('.motion-control');
  await sleep(500);
  await assertStage(page, 7);

  await page.click('.desktop-nav button:nth-child(2)');
  await sleep(1600);
  const servicesTop = await page.$eval('#services', element => element.getBoundingClientRect().top);
  assert.ok(servicesTop >= -5 && servicesTop < 130, 'Navigasi pilihan layanan tidak mencapai section');
  assert.equal(await page.$$eval('.service-path', items => items.length), 3);
  await assertNoHorizontalOverflow(page, 'Desktop pilihan layanan');
  await page.screenshot({ path: artifactPath('desktop-services.png'), type: 'png' });
  await page.click('.desktop-nav button:nth-child(3)');
  await sleep(1600);
  assert.equal(await page.$$eval('.role-list article', items => items.length), 4);
  await page.screenshot({ path: artifactPath('desktop-roles.png'), type: 'png' });
  await page.click('.desktop-nav button:nth-child(4)');
  await sleep(1600);
  await assertProductFaq(page);
  await page.screenshot({ path: artifactPath('desktop-faq.png'), type: 'png' });

  await page.$eval('#perspective', (element) => element.scrollIntoView({ block: 'center' }));
  await sleep(700);
  const faqButton = '.faq-item:nth-of-type(2) h3 > button';
  assert.equal(await page.$eval(faqButton, (button) => button.getAttribute('aria-expanded')), 'false');
  await page.click(faqButton);
  await sleep(350);
  assert.equal(await page.$eval(faqButton, (button) => button.getAttribute('aria-expanded')), 'true');
  assert.ok(await page.$eval('#faq-1', (answer) => Boolean(answer.textContent?.trim())), 'Jawaban FAQ tidak tampil');
  await page.click(faqButton);
  await sleep(350);
  assert.equal(await page.$eval(faqButton, (button) => button.getAttribute('aria-expanded')), 'false');
  await page.waitForSelector('#faq-1', { hidden: true });

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' }));
  await sleep(700);
  // Add temporary scroll space so the short closing section can leave the canvas fully offscreen.
  await page.evaluate(() => { const spacer=document.createElement('div'); spacer.id='qa-scroll-spacer'; spacer.style.height='100vh'; document.body.appendChild(spacer); window.scrollTo(0,document.documentElement.scrollHeight); });
  await page.waitForFunction(() => document.querySelector('.experience').dataset.renderMode === 'never');
  await page.evaluate(() => document.querySelector('#qa-scroll-spacer').remove());
  await page.screenshot({ path: artifactPath('desktop-full-page.png'), type: 'png' });
  await assertNoHorizontalOverflow(page, 'Desktop setelah perjalanan');

  return renderer;
}

async function waitForMenuClosed(page) {
  await page.waitForSelector('#mobile-menu', { hidden: true, timeout: 5_000 });
  assert.equal(await page.$eval('.menu-toggle', (button) => button.getAttribute('aria-expanded')), 'false');
}

async function testMobile(page) {
  await openLanding(page);
  await assertNoHorizontalOverflow(page, 'Mobile 390x844');
  await page.screenshot({ path: artifactPath('mobile-hero.png'), type: 'png' });

  await page.click('.menu-toggle');
  await page.waitForSelector('#mobile-menu');
  assert.equal(await page.$eval('.menu-toggle', (button) => button.getAttribute('aria-expanded')), 'true');
  await page.keyboard.press('Escape');
  await waitForMenuClosed(page);
  assert.ok(await page.$eval('.menu-toggle', (button) => button === document.activeElement), 'Focus tidak kembali ke menu toggle setelah Escape');

  await page.click('.menu-toggle');
  await page.waitForSelector('#mobile-menu');
  await page.click('#mobile-menu .menu-close');
  await waitForMenuClosed(page);

  await page.click('.menu-toggle');
  await page.waitForSelector('#mobile-menu');
  const clicked = await page.evaluate(() => {
    const button = [...document.querySelectorAll('#mobile-menu button:not(.menu-close)')]
      .find((candidate) => candidate.textContent?.includes('Plat & asuransi'));
    button?.click();
    return Boolean(button);
  });
  assert.ok(clicked, 'Tombol Plat & asuransi tidak ditemukan pada menu mobile');
  await waitForMenuClosed(page);
  await sleep(SETTLE_MS);
  await assertStage(page, 1);
  await assertNoHorizontalOverflow(page, 'Mobile setelah navigasi chapter');
  for (const stage of [2, 3, 4, 5, 6, 7]) {
    await page.click(`.chapter-nav button:nth-child(${stage + 1})`);
    await sleep(SETTLE_MS);
    await assertStage(page, stage);
    await page.screenshot({ path: artifactPath(`mobile-stage-${stage + 1}.png`), type: 'png' });
  }
  await page.click('.menu-toggle');
  await page.waitForSelector('#mobile-menu');
  await page.click('.mobile-product-links button:first-child');
  await waitForMenuClosed(page);
  await sleep(1600);
  const servicesTop = await page.$eval('#services', element => element.getBoundingClientRect().top);
  assert.ok(servicesTop >= -5 && servicesTop < 130, 'Navigasi layanan mobile tidak mencapai section');
  await assertNoHorizontalOverflow(page, 'Mobile pilihan layanan');
  await page.screenshot({ path: artifactPath('mobile-services.png'), type: 'png' });
  await page.$eval('.service-path:nth-child(3)', element => element.scrollIntoView({ block: 'center' }));
  await sleep(700);
  await page.screenshot({ path: artifactPath('mobile-claim-path.png'), type: 'png' });
  await page.$eval('#roles', element => element.scrollIntoView({ block: 'start' }));
  await sleep(700);
  await page.screenshot({ path: artifactPath('mobile-roles.png'), type: 'png' });
  await page.$eval('#perspective', element => element.scrollIntoView({ block: 'start' }));
  await sleep(700);
  await assertProductFaq(page);
  await assertNoHorizontalOverflow(page, 'Mobile FAQ');
  await page.screenshot({ path: artifactPath('mobile-faq.png'), type: 'png' });
  await page.$eval('#journey', element => element.scrollIntoView({ block: 'start' }));
  await sleep(SETTLE_MS);

  await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 1 });
  await page.click('.chapter-nav button:first-child');
  await sleep(SETTLE_MS);
  await assertStage(page, 0);
  await assertNoHorizontalOverflow(page, 'Mobile 360x640');
  await page.screenshot({ path: artifactPath('mobile-compact.png'), type: 'png' });
  await page.click('.menu-toggle');
  await page.waitForSelector('#mobile-menu');
  await page.screenshot({ path: artifactPath('mobile-compact-menu.png'), type: 'png' });
  await page.click('.mobile-product-links button:nth-child(3)');
  await waitForMenuClosed(page);
  await sleep(1600);
  await assertNoHorizontalOverflow(page, 'Mobile 360px FAQ');

}

async function testReducedMotion(page) {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await openLanding(page);

  await page.waitForFunction(() => (
    document.querySelector('.app')?.classList.contains('reduced-motion')
    && document.querySelector('.experience')?.getAttribute('data-quality') === 'low'
  ));

  const calmMode = await page.$eval('.motion-control', (button) => ({
    text: button.textContent?.replace(/\s+/g, ' ').trim(),
    pressed: button.getAttribute('aria-pressed'),
    disabled: button.hasAttribute('disabled'),
    reducedClass: button.classList.contains('is-reduced'),
  }));

  assert.match(calmMode.text || '', /GERAKAN MINIMAL/, 'Label calm mode tidak tampil');
  assert.equal(calmMode.pressed, 'true');
  assert.equal(calmMode.disabled, true, 'Kontrol system reduced-motion seharusnya tidak dapat dimatikan');
  assert.equal(calmMode.reducedClass, true);
  assert.equal(await page.$eval('.experience', (element) => element.getAttribute('data-quality')), 'low');
  assert.equal(await page.$eval('.experience', (element) => element.dataset.renderMode), 'demand');
  for (const stage of [1, 2, 3, 4, 5, 6, 7, 0]) {
    await page.click(`.chapter-nav button:nth-child(${stage + 1})`);
    await sleep(300);
    await assertStage(page, stage);
  }
  await page.screenshot({ path: artifactPath('reduced-motion.png'), type: 'png' });
  // Losing WebGL must leave the complete semantic journey usable.
  const canLoseContext = await page.evaluate(() => {
    const canvas = document.querySelector('.experience canvas');
    const gl = canvas?.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  });
  assert.ok(canLoseContext, 'WebGL context-loss test tidak tersedia');
  await page.waitForSelector('.experience--fallback');
  await page.waitForSelector('.scene-loading-label', { hidden: true });
  await page.click('.chapter-nav button:nth-child(8)');
  await sleep(300);
  await assertStage(page, 7);
  await page.screenshot({ path: artifactPath('webgl-fallback.png'), type: 'png' });
}

function formatDiagnostics(diagnostics) {
  return [...diagnostics.pageErrors, ...diagnostics.consoleErrors, ...diagnostics.requestFailures].join('\n');
}

function reportFontWarnings(diagnostics) {
  const uniqueWarnings = [...new Set(diagnostics.fontNetworkWarnings)];
  if (!uniqueWarnings.length) {
    console.log('[browser] External font network warnings: none');
    return;
  }

  console.warn(`[browser] External font network warnings (${uniqueWarnings.length}, non-fatal):`);
  uniqueWarnings.forEach((warning) => console.warn(`  ${warning}`));
}

async function runSuite(browser) {
  const diagnostics = createDiagnostics();
  const pages = [];

  try {
    if (process.argv.includes('--reduced-only')) {
      const page = await createPage(browser, 'reduced-motion', diagnostics, { width: 1280, height: 800, deviceScaleFactor: 1 });
      pages.push(page);
      await testReducedMotion(page);
      assert.equal(formatDiagnostics(diagnostics), '');
      console.log('[browser] Reduced motion + fallback PASS');
      return;
    }
    if (process.argv.includes('--motion-only')) {
      const page = await createPage(browser, 'motion', diagnostics, { width: 1440, height: 960, deviceScaleFactor: 1 });
      pages.push(page);
      await openLanding(page);
      await page.click('.chapter-nav button:nth-child(8)');
      await sleep(SETTLE_MS);
      await assertStage(page, 7);
      const state = () => page.evaluate(() => ({ y: window.scrollY, height: document.querySelector('#journey').offsetHeight, stage: document.querySelector('#journey').dataset.stage, progress: document.querySelector('#journey').style.getPropertyValue('--journey-progress') }));
      console.log('[browser] Before calm:', await state());
      await page.click('.motion-control');
      await sleep(500);
      console.log('[browser] After calm:', await state());
      await assertStage(page, 7);
      await page.click('.motion-control');
      await sleep(500);
      await assertStage(page, 7);
      console.log('[browser] Motion toggle PASS');
      return;
    }
    const desktop = await createPage(browser, 'desktop', diagnostics, { width: 1440, height: 960, deviceScaleFactor: 1 });
    pages.push(desktop);
    const renderer = await testDesktop(desktop, diagnostics);

    const medium = await createPage(browser, 'medium', diagnostics, { width: 1024, height: 768, deviceScaleFactor: 2 });
    pages.push(medium);
    await medium.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 }));
    await openLanding(medium);
    await medium.waitForFunction(() => document.querySelector('.experience')?.dataset.quality === 'medium');
    const mediumCanvas = await assertJourneyCanvas(medium, diagnostics);
    assert.ok(mediumCanvas.bufferWidth <= 1024 * 1.25, 'Medium tier harus membatasi DPR');
    await assertNoHorizontalOverflow(medium, 'Medium / tablet');
    await medium.screenshot({ path: artifactPath('medium-tier.png'), type: 'png' });

    const mobile = await createPage(browser, 'mobile', diagnostics, { width: 390, height: 844, deviceScaleFactor: 1 });
    pages.push(mobile);
    await testMobile(mobile);

    const reduced = await createPage(browser, 'reduced-motion', diagnostics, { width: 1280, height: 800, deviceScaleFactor: 1 });
    pages.push(reduced);
    await testReducedMotion(reduced);

    assert.deepEqual(diagnostics.referenceRequests, [], 'Reference art must not be used as production media');
    reportFontWarnings(diagnostics);
    const severeDiagnostics = formatDiagnostics(diagnostics);
    assert.equal(severeDiagnostics, '', `Browser QA menemukan error serius:\n${severeDiagnostics}`);

    console.log(`[browser] PASS ${OFFLINE ? 'local production files (no server)' : BASE_URL}`);
    console.log(`[browser] WebGL renderer: ${renderer.renderer}; canvas ${renderer.bufferWidth}x${renderer.bufferHeight}`);
    console.log(`[browser] Screenshots: ${ARTIFACT_DIR}`);
  } finally {
    await Promise.allSettled(pages.map((page) => Promise.race([page.close(), sleep(3000)])));

  }
}

async function launchBrowser(useSoftwareRendering) {
  const args = ['--no-sandbox', '--ignore-gpu-blocklist'];
  if (useSoftwareRendering) {
    args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  }

  return puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    pipe: true,
    args,
    protocolTimeout: 30_000,
  });
}

async function main() {
  if (!existsSync(CHROME_PATH)) {
    throw new Error(`Chrome tidak ditemukan di ${CHROME_PATH}. Atur CHROME_PATH ke executable Chrome/Chromium.`);
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });

  let browser;
  let usingSoftwareRendering = false;
  try {
    try {
      browser = await launchBrowser(false);
    } catch (error) {
      console.warn(`[browser] Chrome gagal dimulai dengan konfigurasi GPU default; mencoba SwiftShader. ${error.message}`);
      usingSoftwareRendering = true;
      browser = await launchBrowser(true);
    }

    try {
      await runSuite(browser);
    } catch (error) {
      if (!(error instanceof WebGLUnavailableError) || usingSoftwareRendering) throw error;

      console.warn(`[browser] ${error.message} Mengulang suite dengan SwiftShader.`);
      await browser.close();
      usingSoftwareRendering = true;
      browser = await launchBrowser(true);
      await runSuite(browser);
    }
  } finally {
    if (browser) {
      await Promise.race([browser.close().catch(() => undefined), sleep(5000)]);
      browser.disconnect();
      const child = browser.process();
      if (child && child.exitCode === null) child.kill('SIGTERM');
    }
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(`[browser] FAIL\n${error.stack || error.message}`);
  process.exit(1);
});
