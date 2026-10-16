import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const base = process.env.BASE_URL || 'http://127.0.0.1:5921';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--ignore-gpu-blocklist'],
});
await mkdir('.artifacts', { recursive: true });
const errors = [];
async function newPage(width = 1440, height = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    // Observe the exact reveal, before any later scroll can conceal a bad restoration.
    new MutationObserver(() => {
      if (document.querySelector('[data-expired="true"]')) window.__entryExpired = true;
      if (!window.__readyAt && document.querySelector('[data-destination-ready="true"]')) window.__readyAt = performance.now();
      const app = document.querySelector('.app[data-booted="true"]');
      if (app && !window.__entryReveal) window.__entryReveal = {
        y: scrollY, stage: document.querySelector('#journey')?.dataset.stage,
        cameraStage: document.querySelector('.experience canvas')?.dataset.worldPosition,
        time: performance.now(), expired: !!window.__entryExpired, readyAt: window.__readyAt,
      };
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-booted', 'data-expired', 'data-destination-ready'] });
  });
  return page;
}
async function boot(page) {
  const action = await page.waitForFunction(() => {
    if (!document.querySelector('.preloader')) return 'done';
    const cta = document.querySelector('.entry-cta');
    return cta && !cta.disabled ? 'cta' : false;
  }, { timeout: 25000 }).then(handle => handle.jsonValue());
  if (action === 'cta') await page.click('.entry-cta');
  await page.waitForSelector('.app[data-booted="true"]');
  assert.equal(await page.$('.preloader'), null);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-booting')), false);
}
async function entryVehicleState(page) {
  return page.$eval('.experience canvas', canvas => ({
    carrier: canvas.dataset.vehicleCarrier,
    position: (canvas.dataset.vehicleWorldPosition || '').split(',').map(Number),
    heading: Number(canvas.dataset.vehicleHeading),
    turn: Number(canvas.dataset.entryTurn),
    state: canvas.dataset.entryState,
    noseX: Number(canvas.dataset.vehicleNoseScreenX),
    tailX: Number(canvas.dataset.vehicleTailScreenX),
    camera: (canvas.dataset.camera || '').split(',').map(Number),
    target: (canvas.dataset.target || '').split(',').map(Number),
    fov: Number(canvas.dataset.fov),
  }));
}
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
async function goStage(page, index) {
  await page.click(`.chapter-nav button:nth-child(${index + 1})`);
  await page.waitForFunction(expected => sessionStorage.getItem('drive:lastSection') === expected, {}, ['incident','coverage','scan','assessment','unlock','claim','services','resolution'][index]);
  await sleep(450);
}
try {
  const page = await newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto(`${base}/?scene-diagnostics=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.entry-loader--first');
  await page.waitForSelector('.experience');
  assert.match(await page.$eval('.entry-content', el => el.textContent), /Pahami kerusakan/);
  assert.equal(await page.$eval('.entry-brand', image => new URL(image.src).pathname), '/assets/brand/drive-logo.svg');
  const reveal = await page.evaluate(() => new Promise(resolve => {
    const samples = [];
    const started = performance.now();
    const sample = () => {
      const loader = document.querySelector('.entry-loader');
      const experience = document.querySelector('.experience');
      const logo = document.querySelector('.entry-brand');
      samples.push({
        phase: loader?.dataset.entryPhase,
        world: Number(getComputedStyle(experience).opacity),
        logo: Number(getComputedStyle(logo).opacity),
      });
      if (loader?.dataset.entryPhase === 'waiting' || performance.now() - started > 12000) resolve(samples);
      else requestAnimationFrame(sample);
    };
    sample();
  }));
  const firstWorldReveal = reveal.find(sample => sample.world > .05);
  assert.ok(reveal.some(sample => sample.world > .15 && sample.world < .85), 'Vehicle canvas fades in continuously');
  assert.ok(firstWorldReveal?.logo > .9, 'The official logo resolves before the vehicle appears');
  await page.mouse.wheel({ deltaY: 900 });
  assert.equal(await page.evaluate(() => scrollY), 0, 'Scroll locked during splash');
  await page.waitForSelector('[data-entry-phase="waiting"]');
  assert.ok(requests.some(url => url.includes('/assets/models/aventador.glb')), 'Approved GLB requested');
  assert.equal(requests.filter(url => url.includes('/assets/models/aventador.glb')).length, 1, 'Approved GLB loads only once');
  assert.equal(await page.$$eval('canvas', els => els.length), 1, 'Splash and Hero share one canvas');
  await page.evaluate(() => { window.__entryCanvas = document.querySelector('.experience canvas'); });
  const opening = await entryVehicleState(page);
  assert.equal(opening.state, 'waiting');
  await page.screenshot({ path: '.artifacts/entry-desktop-waiting.png', type: 'png' });
  await page.click('.entry-cta');
  const handoffSamples = page.evaluate(() => new Promise(resolve => {
    const samples = [];
    let settledFrames = 0;
    const sample = () => {
      const experience = document.querySelector('.experience');
      const app = document.querySelector('.app');
      samples.push({
        world: Number(experience ? getComputedStyle(experience).opacity : 0),
        booted: app?.dataset.booted,
        loader: Boolean(document.querySelector('.entry-loader')),
      });
      settledFrames = app?.dataset.booted === 'true' && !document.querySelector('.entry-loader') ? settledFrames + 1 : 0;
      if (settledFrames >= 3) resolve(samples);
      else requestAnimationFrame(sample);
    };
    sample();
  }));
  await page.waitForSelector('[data-entry-phase="turning"]');
  assert.equal(await page.$eval('.entry-cta', button => button.disabled), true, 'CTA disables immediately');
  await page.mouse.wheel({ deltaY: 900 });
  assert.equal(await page.evaluate(() => scrollY), 0, 'Scroll remains locked through turnaround');
  await page.waitForFunction(() => {
    const value = Number(document.querySelector('.experience canvas')?.dataset.entryTurn);
    return value > .44 && value < .56;
  });
  const side = await entryVehicleState(page);
  assert.equal(side.carrier, opening.carrier, 'The same vehicle carrier reaches the side profile');
  assert.ok(distance(side.position, opening.position) > 2, 'The vehicle follows a spatial arc');
  assert.ok(angleDistance(side.heading, opening.heading) > 1.2, 'The vehicle body performs the turn');
  assert.ok(side.noseX < side.tailX, `At mid-turn the nose must point screen-left: ${JSON.stringify(side)}`);
  const veil = await page.$eval('.entry-world-veil', element => Number(getComputedStyle(element).opacity));
  assert.ok(veil > 0 && veil < 1, 'Hero environment reveals progressively during the turn');
  await page.screenshot({ path: '.artifacts/entry-desktop-left-profile.png', type: 'png' });
  await boot(page);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const hero = await entryVehicleState(page);
  const completedHandoff = await handoffSamples;
  assert.ok(completedHandoff.every(sample => sample.world > .98), `Canvas must not blink during handoff: ${JSON.stringify(completedHandoff.filter(sample => sample.world <= .98))}`);
  assert.equal(hero.carrier, opening.carrier, 'The Hero retains the same vehicle carrier');
  assert.equal(await page.evaluate(() => document.querySelector('.experience canvas') === window.__entryCanvas), true, 'The Hero retains the same canvas');
  assert.equal(hero.state, 'hero');
  assert.ok(angleDistance(hero.heading, opening.heading) > 3.1, 'The turnaround completes approximately 180 degrees');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('drive:introSeen')), '1');
  assert.equal(await page.$$eval('canvas', els => els.length), 1);
  assert.equal(await page.$('.scene-grain'), null, 'The full-screen grain layer stays removed');
  console.log('[loading] One-canvas CTA turnaround, left profile, arc, scroll lock PASS');

  // The hero and both a middle and late story chapter restore on real browser reloads.
  for (const [index, label] of [[0,'BERANDA'],[3,'ANALISIS KERUSAKAN'],[6,'BENGKEL & TOWING']]) {
    if (index) await goStage(page, index);
    requests.length = 0;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.entry-loader--refresh');
    assert.equal(await page.$eval('.entry-restore-label', el => el.textContent), label);
    await boot(page);
    const reveal = await page.evaluate(() => window.__entryReveal);
    assert.equal(reveal.expired, false, 'Healthy refresh must use real scene readiness');
    assert.equal(reveal.stage, String(index), 'Correct chapter at reveal');
    assert.ok(Math.abs(Number(reveal.cameraStage) - (index ? index + .08 : 0)) < .02, `Camera restored: ${JSON.stringify(reveal)}`);
    assert.ok(!requests.some(url => /SplashVehicle/.test(url)), 'Refresh never imports splash renderer');
    assert.equal(await page.$$eval('canvas', els => els.length), 1);
    if (index === 0) {
      const restoredHero = await entryVehicleState(page);
      assert.ok(distance(restoredHero.position, hero.position) < .001, 'Turn endpoint equals the existing Hero vehicle position');
      assert.ok(angleDistance(restoredHero.heading, hero.heading) < .001, 'Turn endpoint equals the existing Hero heading');
      assert.deepEqual(restoredHero.camera, hero.camera, 'Turn endpoint equals the existing Hero camera');
      assert.deepEqual(restoredHero.target, hero.target, 'Turn endpoint equals the existing Hero target');
      assert.equal(restoredHero.fov, hero.fov, 'Turn endpoint equals the existing Hero FOV');
    }
    console.log(`[loading] Reload ${label} PASS (${Math.round(reveal.time)} ms total; ${Math.round(reveal.time - reveal.readyAt)} ms after scene ready)`);
  }
  await goStage(page, 0);
  await page.evaluate(() => {
    const journey = document.getElementById('journey');
    window.scrollTo({ top: (journey.offsetHeight - innerHeight) * 3.4 / 7.98, behavior: 'instant' });
  });
  await page.waitForFunction(() => sessionStorage.getItem('drive:lastSection') === 'assessment');
  console.log('[loading] Native scroll persists after story spring settles PASS');
  await page.click('.desktop-nav button:nth-child(2)');
  await page.waitForFunction(() => sessionStorage.getItem('drive:lastSection') === 'page:services');
  assert.equal(await page.$('.preloader'), null, 'Internal navigation has no loader');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.entry-loader--refresh');
  assert.equal(await page.$eval('.entry-restore-label', el => el.textContent), 'PILIHAN LAYANAN');
  await boot(page);
  assert.ok(Math.abs(await page.$eval('#services', el => el.getBoundingClientRect().top) - 82) < 3);
  console.log('[loading] Product section restoration and internal navigation PASS');
  // Fonts resolving just before the deadline must not restart an active reveal.
  await page.evaluateOnNewDocument(() => {
    const ready = new Promise(resolve => setTimeout(resolve, 9500));
    Object.defineProperty(document.fonts, 'ready', { get: () => ready });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.entry-loader--refresh');
  await boot(page);
  assert.equal(await page.evaluate(() => window.__entryReveal.expired), false);
  console.log('[loading] Late font readiness does not restart the handoff PASS');
  await page.close();

  const mobile = await newPage(390, 844);
  await mobile.goto(base, { waitUntil: 'domcontentloaded' });
  await mobile.waitForSelector('.entry-loader--first');
  await mobile.waitForSelector('[data-entry-phase="waiting"]');
  await mobile.screenshot({ path: '.artifacts/entry-mobile-waiting.png', type: 'png' });
  await boot(mobile);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Real mobile section navigation; no desktop controls.
  await mobile.click('.chapter-nav button:nth-child(4)');
  await mobile.waitForFunction(() => sessionStorage.getItem('drive:lastSection') === 'assessment');
  await mobile.reload({ waitUntil: 'domcontentloaded' });
  await mobile.waitForSelector('.entry-loader--refresh');
  await boot(mobile);
  assert.equal(await mobile.$eval('#journey', el => el.dataset.stage), '3');
  await mobile.close();
  console.log('[loading] New tab first visit, mobile sizing and restoration PASS');

  const reduced = await newPage();
  await reduced.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await reduced.goto(base, { waitUntil: 'domcontentloaded' });
  await reduced.waitForSelector('.entry-loader--reduced');
  await boot(reduced);
  await reduced.reload({ waitUntil: 'domcontentloaded' });
  await reduced.waitForSelector('.entry-loader--refresh.entry-loader--reduced');
  await boot(reduced);
  await reduced.close();
  console.log('[loading] Reduced motion first visit and refresh PASS');

  const storage = await newPage();
  await storage.evaluateOnNewDocument(() => Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage denied'); } }));
  await storage.goto(base, { waitUntil: 'domcontentloaded' });
  await boot(storage);
  await storage.close();
  assert.deepEqual(errors, []);
  console.log('[loading] Denied storage PASS; no uncaught browser errors');

  const failure = await newPage();
  await failure.setRequestInterception(true);
  failure.on('request', request => request.url().endsWith('.glb') ? request.abort() : request.continue());
  await failure.goto(base, { waitUntil: 'domcontentloaded' });
  await boot(failure);
  assert.ok(await failure.$('main:not([inert])'));
  await failure.close();
  console.log('[loading] Failed model graceful recovery PASS');

  const stalled = await newPage();
  await stalled.setRequestInterception(true);
  stalled.on('request', request => { if (!request.url().endsWith('.glb')) void request.continue(); });
  await stalled.goto(base, { waitUntil: 'domcontentloaded' });
  await stalled.waitForSelector('.entry-loader--first');
  assert.match(await stalled.$eval('.entry-content', el => el.textContent), /Pahami kerusakan/);
  await boot(stalled);
  assert.equal(await stalled.evaluate(() => window.__entryReveal.expired), true, 'Stalled models must exit via deadline');
  assert.ok(await stalled.$('main:not([inert])'));
  await stalled.close();
  console.log('[loading] DOM before model and stalled asset deadline PASS');
} finally { await browser.close(); }
