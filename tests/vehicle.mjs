import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.argv.find(argument => argument.startsWith('--base-url='))?.slice('--base-url='.length) || process.env.BASE_URL || 'http://localhost:5920';
const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = path.resolve('.artifacts');
const FULL_MODEL = '/assets/models/aventador.glb';
const VEHICLE_PREVIEW = '/assets/models/aventador-preview.webp';
const MODEL_PATHS = new Set([FULL_MODEL]);
const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
const origin = new URL(BASE_URL).origin;

function observe(page) {
  const diagnostics = { errors: [], requests: [], responses: [], previews: [], externalDecoders: [] };
  page.on('request', request => {
    const url = new URL(request.url());
    if (MODEL_PATHS.has(url.pathname)) diagnostics.requests.push(url.pathname);
    if (/^https?:$/.test(url.protocol) && url.origin !== origin && /draco|meshopt|basis|decoder|\.wasm(?:\?|$)/i.test(url.href)) diagnostics.externalDecoders.push(url.href);
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (MODEL_PATHS.has(url.pathname)) diagnostics.responses.push({ path: url.pathname, origin: url.origin, status: response.status() });
    if (url.pathname === VEHICLE_PREVIEW) diagnostics.previews.push({ origin: url.origin, status: response.status() });
  });
  page.on('console', message => {
    if (['error', 'assert'].includes(message.type())) diagnostics.errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => diagnostics.errors.push(`page: ${error.message}`));
  page.on('error', error => diagnostics.errors.push(`crash: ${error.message}`));
  page.on('requestfailed', request => diagnostics.errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
  return diagnostics;
}

async function createPage(browser, viewport) {
  const page = await browser.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(30_000);
  await page.setViewport(viewport);
  return { page, diagnostics: observe(page) };
}

async function openLanding(page) {
  const url = new URL(BASE_URL);
  url.searchParams.set('scene-diagnostics', '1');
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#journey');
  const action = await page.waitForFunction(() => {
    if (!document.querySelector('.preloader')) return 'done';
    const cta = document.querySelector('.entry-cta');
    return cta && !cta.disabled ? 'cta' : false;
  }, { timeout: 20_000 }).then(handle => handle.jsonValue());
  if (action === 'cta') await page.click('.entry-cta');
  await page.waitForSelector('.preloader', { hidden: true, timeout: 15_000 });
  await page.waitForSelector('.scene-loading-label', { hidden: true });
  await page.evaluate(() => document.fonts.ready);
}

async function vehicleState(page) {
  return page.$eval('.experience canvas', canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return {
      count: Number(canvas.dataset.vehicleCount),
      assets: canvas.dataset.vehicleAssets?.split(',').filter(Boolean) || [],
      meshes: Number(canvas.dataset.vehicleMeshes),
      geometries: Number(canvas.dataset.vehicleGeometries),
      quality: canvas.closest('.experience').dataset.quality,
      contextActive: Boolean(gl && !gl.isContextLost()),
      bufferWidth: canvas.width,
      cssWidth: canvas.getBoundingClientRect().width,
      carrier: canvas.dataset.vehicleCarrier,
      position: (canvas.dataset.vehicleWorldPosition || '').split(',').map(Number),
      quaternion: (canvas.dataset.vehicleWorldQuaternion || '').split(',').map(Number),
      visible: canvas.dataset.vehicleVisible === 'true',
      roadProgress: Number(canvas.dataset.vehicleRoadProgress),
      routeAt: Number(canvas.dataset.vehicleRouteAt),
      storyAt: Number(canvas.dataset.worldPosition),
    };
  });
}

async function assertVehicles(page, label) {
  await page.waitForFunction(full => {
    const canvas = document.querySelector('.experience canvas');
    return canvas?.dataset.vehicleAssets === full && canvas.dataset.vehicleCount === '1';
  }, {}, FULL_MODEL);
  const state = await vehicleState(page);
  assert.equal(state.contextActive, true, `${label}: WebGL context must remain active`);
  assert.equal(state.count, 1, `${label}: one physical vehicle must persist throughout the journey`);
  // 15 model meshes, with the shared tyre and rim meshes split into four turning wheels:
  // 13 untouched + body rubber + 4 × (tyre, rim, motion-blur disc) = 26.
  assert.equal(state.meshes, 26, `${label}: the vehicle must keep its 13 body meshes plus four rigged wheels`);
  assert.equal(state.geometries, 26, `${label}: the single model must not duplicate its GPU geometries`);
  assert.ok(state.carrier, `${label}: the actual moving carrier must expose its identity`);
  assert.equal(state.visible, true, `${label}: the physical vehicle must not be hidden between chapters`);
  return state;
}

const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const rotationDistance = (a, b) => {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  // DOM diagnostics may round quaternion components; normalize before comparison.
  return 2 * Math.acos(Math.min(1, Math.abs(dot) / (Math.hypot(...a) * Math.hypot(...b))));
};

function assertCarrier(state, carrier, label) {
  assert.equal(state.carrier, carrier, `${label}: the carrier must not be replaced`);
  assert.equal(state.visible, true, `${label}: vehicle visibility must not change`);
  assert.equal(state.position.length, 3, `${label}: actual world position is required`);
  assert.equal(state.quaternion.length, 4, `${label}: actual world rotation is required`);
  assert.ok([...state.position, ...state.quaternion, state.roadProgress, state.routeAt].every(Number.isFinite), `${label}: carrier diagnostics must be finite`);
  assert.ok(state.roadProgress >= 0 && state.roadProgress <= 1, `${label}: vehicle must remain on the road curve`);
}

async function scrollAt(page, at, duration) {
  await page.evaluate(({ at, duration }) => {
    const journey = document.querySelector('#journey');
    const start = journey.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: start + (journey.offsetHeight - innerHeight) * at / duration, behavior: 'instant' });
  }, { at, duration });
  await page.waitForFunction(expected => {
    const canvas = document.querySelector('.experience canvas');
    return canvas && Math.abs(Number(canvas.dataset.worldPosition) - expected) < .0012;
  }, {}, at);
  // Carrier diagnostics are emitted after its transform update in the same frame.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return vehicleState(page);
}

async function continuousScrollTrace(page, forward) {
  return page.evaluate(async direction => {
    const journey = document.querySelector('#journey');
    const start = journey.getBoundingClientRect().top + window.scrollY;
    const length = journey.offsetHeight - innerHeight;
    const samples = [];
    const started = performance.now();
    const travelMs = 7000;
    await new Promise(resolve => {
      const frame = now => {
        const progress = Math.min(1, (now - started) / travelMs);
        window.scrollTo({ top: start + length * (direction ? progress : 1 - progress), behavior: 'instant' });
        const canvas = document.querySelector('.experience canvas');
        if (canvas) samples.push({
          carrier: canvas.dataset.vehicleCarrier,
          position: (canvas.dataset.vehicleWorldPosition || '').split(',').map(Number),
          quaternion: (canvas.dataset.vehicleWorldQuaternion || '').split(',').map(Number),
          visible: canvas.dataset.vehicleVisible === 'true',
          roadProgress: Number(canvas.dataset.vehicleRoadProgress),
          routeAt: Number(canvas.dataset.vehicleRouteAt),
          stage: Number(journey.dataset.stage),
        });
        if (now - started < travelMs + 1000) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    return samples;
  }, forward);
}

async function testContinuity(page, opening) {
  // Sample halfway once to derive the real timeline duration, rather than coupling
  // the test to the current GSAP duration constant or importing its implementation.
  await page.evaluate(() => {
    const journey = document.querySelector('#journey');
    window.scrollTo({ top: journey.getBoundingClientRect().top + scrollY + (journey.offsetHeight - innerHeight) / 2, behavior: 'instant' });
  });
  await page.waitForFunction(() => Math.abs(Number(document.querySelector('.experience canvas').dataset.progress) - .5) < .0001);
  const duration = await page.$eval('.experience canvas', canvas => Number(canvas.dataset.worldPosition) / Number(canvas.dataset.progress));
  assert.ok(Math.abs(duration - 7.98) < .005, 'The eight-chapter timeline must expose its 7.98-unit duration');
  const first = await scrollAt(page, 0, duration);
  assertCarrier(first, opening.carrier, 'Journey start');

  const boundaries = [1.7, 2, 4.8, 5.8];
  const boundaryResults = [];
  for (const boundary of boundaries) {
    const samples = [];
    for (const offset of [-.04, -.004, .004, .04]) {
      const state = await scrollAt(page, boundary + offset, duration);
      assertCarrier(state, opening.carrier, `Boundary ${boundary} offset ${offset}`);
      samples.push(state);
    }
    const coarseDistance = distance(samples[0].position, samples[3].position);
    const fineDistance = distance(samples[1].position, samples[2].position);
    const coarseRotation = rotationDistance(samples[0].quaternion, samples[3].quaternion);
    const fineRotation = rotationDistance(samples[1].quaternion, samples[2].quaternion);
    assert.ok(fineDistance <= coarseDistance * .35 + .12, `Vehicle jumps across ${boundary}: fine ${fineDistance.toFixed(3)}, coarse ${coarseDistance.toFixed(3)}`);
    assert.ok(fineRotation <= coarseRotation * .35 + .015, `Vehicle heading jumps across ${boundary}`);
    for (let index = 1; index < samples.length; index++) assert.ok(samples[index].roadProgress >= samples[index - 1].roadProgress - .00001, `Vehicle reverses unexpectedly at ${boundary}`);
    // Return across the same old jump point to verify deterministic reverse travel.
    const returned = await scrollAt(page, boundary - .004, duration);
    assertCarrier(returned, opening.carrier, `Reverse boundary ${boundary}`);
    assert.ok(distance(returned.position, samples[1].position) < .35, `Reverse travel does not return to the same road position at ${boundary}`);
    assert.ok(rotationDistance(returned.quaternion, samples[1].quaternion) < .02, `Reverse travel changes vehicle heading at ${boundary}`);
    boundaryResults.push({ boundary, coarseDistance, fineDistance });
  }

  await scrollAt(page, 0, duration);
  for (const forward of [true, false]) {
    // Each directional sweep starts at rest. The existing spring can still be moving
    // forward when the preceding sweep ends; sampling reversal then is not monotonic.
    const endpoint = forward ? 0 : duration;
    await scrollAt(page, endpoint, duration);
    await page.waitForFunction(expected => Math.abs(Number(document.querySelector('.experience canvas').dataset.worldPosition) - expected) < .0001, {}, endpoint);
    const trace = await continuousScrollTrace(page, forward);
    assert.ok(trace.length > 30, `Continuous-scroll regression must sample actual rendered frames (received ${trace.length})`);
    assert.deepEqual([...new Set(trace.map(sample => sample.stage))].sort(), [0, 1, 2, 3, 4, 5, 6, 7], 'Real scrolling must traverse all eight chapters in both directions');
    for (let index = 0; index < trace.length; index++) {
      const current = trace[index];
      assertCarrier(current, opening.carrier, `${forward ? 'Forward' : 'Reverse'} frame ${index}`);
      if (!index) continue;
      const prior = trace[index - 1];
      const step = Math.abs(current.routeAt - prior.routeAt);
      const routeDelta = current.roadProgress - prior.roadProgress;
      assert.ok((forward ? routeDelta : -routeDelta) >= -.00002, 'Physical vehicle route must follow the scroll direction');
      assert.ok(Math.abs(routeDelta) <= step * 2 + .002, 'Physical vehicle must not teleport along the road during a rendered transition');
      assert.ok(distance(current.position, prior.position) <= step * 1000 + 1, 'World-space vehicle position must remain continuous');
      assert.ok(rotationDistance(current.quaternion, prior.quaternion) <= step * 8 + .04, 'Vehicle heading must remain continuous');
    }
    assert.ok(distance(trace[0].position, trace.at(-1).position) > 100, 'The actual car must travel through the world, not remain stationary');
    // The car waits at the roadside from chapter 02 to 07 and is towed only round the bend to the
    // workshop, so the whole story covers about a third of the road (0.13 → 0.465).
    assert.ok(Math.abs(trace.at(-1).roadProgress - trace[0].roadProgress) > .3, 'The car must traverse a meaningful part of the same road');
  }
  const returned = await scrollAt(page, 0, duration);
  assert.ok(distance(first.position, returned.position) < .1, 'Reversing the complete journey must restore the vehicle position');
  assert.ok(rotationDistance(first.quaternion, returned.quaternion) < .01, 'Reversing the complete journey must restore vehicle heading');
  console.log(`[vehicle] Continuous carrier / old jump boundaries / all chapters forward and reverse PASS ${JSON.stringify(boundaryResults)}`);
}

async function goStage(page, stage) {
  await page.click(`.chapter-nav button:nth-child(${stage + 1})`);
  await page.waitForFunction(expected => document.querySelector('#journey')?.dataset.stage === String(expected), {}, stage);
  await sleep(900);
  assert.equal(await page.$$eval('.chapter-nav button[aria-current="step"]', buttons => buttons.length), 1);
  assert.equal(await page.$eval(`.story-panel:nth-child(${stage + 1})`, panel => panel.getAttribute('aria-hidden')), 'false');
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `aventador-${name}.png`), type: 'png' });
}

function assertNetwork(diagnostics, label) {
  assert.deepEqual(diagnostics.previews, [{ origin, status: 200 }], `${label}: all holograms must reuse one local Aventador preview`);
  assert.deepEqual(diagnostics.externalDecoders, [], `${label}: model loading must not depend on remote decoders`);
  assert.deepEqual(diagnostics.errors, [], `${label}: unexpected browser errors`);
  for (const asset of new Set(diagnostics.requests)) {
    assert.equal(diagnostics.requests.filter(request => request === asset).length, 1, `${label}: ${asset} should load once and be reused`);
    const responses = diagnostics.responses.filter(response => response.path === asset);
    assert.equal(responses.length, 1, `${label}: model must have one successful response`);
    assert.equal(responses[0].origin, origin, `${label}: model must be served locally`);
    assert.equal(responses[0].status, 200, `${label}: model response must succeed`);
  }
}

async function testDesktop(browser) {
  const { page, diagnostics } = await createPage(browser, { width: 1440, height: 960, deviceScaleFactor: 1 });
  try {
    await openLanding(page);
    const opening = await assertVehicles(page, 'Desktop opening');
    assert.ok(diagnostics.requests.includes(FULL_MODEL), 'Desktop must initially load the full-detail model');
    await page.evaluate(() => { window.__vehicleTestCanvas = document.querySelector('.experience canvas'); });
    await screenshot(page, 'desktop-hero');
    await testContinuity(page, opening);
    for (const stage of [1, 2, 3, 4, 5, 6, 7, 0]) {
      await goStage(page, stage);
      const state = await assertVehicles(page, `Desktop stage ${stage}`);
      assertCarrier(state, opening.carrier, `Desktop stage ${stage}`);
      assert.equal(await page.evaluate(() => document.querySelector('.experience canvas') === window.__vehicleTestCanvas), true, 'Chapter navigation must preserve the canvas');
      if (stage === 2) await screenshot(page, 'desktop-capture');
      if (stage === 3) await screenshot(page, 'desktop-analysis');
      if (stage === 4) await screenshot(page, 'desktop-unlock');
      if (stage === 5) await screenshot(page, 'desktop-claim');
      if (stage === 6) await screenshot(page, 'desktop-services');
      if (stage === 7) await screenshot(page, 'desktop-resolution');
    }

    await page.click('.motion-control');
    await page.waitForFunction(() => document.querySelector('.app').classList.contains('reduced-motion'));
    const calm = await assertVehicles(page, 'Calm LOD');
    assert.equal(calm.quality, 'low');
    assert.deepEqual(calm.assets, [FULL_MODEL]);
    assertCarrier(calm, opening.carrier, 'Calm LOD carrier');
    await page.click('.motion-control');
    await page.waitForFunction(() => !document.querySelector('.app').classList.contains('reduced-motion'));
    await assertVehicles(page, 'Restored motion LOD');

    await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 1 });
    const narrow = await assertVehicles(page, 'Resize to mobile');
    assert.equal(narrow.quality, 'low');
    assert.deepEqual(narrow.assets, [FULL_MODEL]);
    assertCarrier(narrow, opening.carrier, 'Resize carrier');
    assert.equal(await page.evaluate(() => document.querySelector('.experience canvas') === window.__vehicleTestCanvas), true, 'LOD changes must preserve the canvas');
    await screenshot(page, 'resized-mobile');
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
    await assertVehicles(page, 'Resize back to desktop');
    assertNetwork(diagnostics, 'Desktop');
    console.log(`[vehicle] Desktop / chapter reuse / calm / resize PASS ${JSON.stringify({ opening, requests: diagnostics.requests })}`);
  } finally { await page.close(); }
}

async function testMobile(browser) {
  const { page, diagnostics } = await createPage(browser, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  try {
    await openLanding(page);
    const state = await assertVehicles(page, 'Mobile opening');
    assert.equal(state.quality, 'low');
    assert.deepEqual(state.assets, [FULL_MODEL]);
    assert.ok(state.bufferWidth <= state.cssWidth + 1, 'Mobile must cap DPR at 1');
    assert.deepEqual(diagnostics.requests, [FULL_MODEL], 'The one approved GLB is loaded once for splash and Hero');
    await screenshot(page, 'mobile-hero');
    for (const stage of [1, 2, 3, 4, 5, 6, 7, 0]) {
      await goStage(page, stage);
      const current = await assertVehicles(page, `Mobile stage ${stage}`);
      assertCarrier(current, state.carrier, `Mobile stage ${stage}`);
      if (stage === 2) await screenshot(page, 'mobile-capture');
      if (stage === 3) await screenshot(page, 'mobile-analysis');
      if (stage === 4) await screenshot(page, 'mobile-unlock');
      if (stage === 5) await screenshot(page, 'mobile-claim');
      if (stage === 6) await screenshot(page, 'mobile-services');
      if (stage === 7) await screenshot(page, 'mobile-resolution');
    }
    assertNetwork(diagnostics, 'Mobile');
    console.log(`[vehicle] Mobile environment LOD / full vehicle reuse PASS ${JSON.stringify(state)}`);
  } finally { await page.close(); }
}

async function testAssetFailure(browser) {
  // This fresh page isolates the intentionally failed asset from normal diagnostics.
  const { page, diagnostics } = await createPage(browser, { width: 1280, height: 800, deviceScaleFactor: 1 });
  let intercepted = 0;
  try {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (MODEL_PATHS.has(new URL(request.url()).pathname)) {
        intercepted += 1;
        void request.respond({ status: 404, contentType: 'text/plain', body: 'Intentional vehicle QA failure' });
      } else { void request.continue(); }
    });
    await openLanding(page);
    await page.waitForSelector('.experience--fallback');
    assert.ok(intercepted > 0, 'Failure test must actually intercept the vehicle asset');
    assert.ok(diagnostics.responses.some(response => response.status === 404), 'Expected vehicle 404 must be observed');
    for (const stage of [4, 6, 7, 0]) await goStage(page, stage);
    assert.equal(await page.$eval('main', main => main.inert), false, 'Semantic content must remain available after asset failure');
    await screenshot(page, 'asset-fallback');
    assert.deepEqual(diagnostics.externalDecoders, []);
    const unexpected = diagnostics.errors.filter(error => !/aventador(?:-low)?\.glb|404|Could not load|<CanvasImpl>|<Vehicle>|React will try to recreate|above error occurred/i.test(error));
    assert.deepEqual(unexpected, [], 'Asset failure must not introduce unrelated runtime errors');
    console.log(`[vehicle] Intentional asset 404 / loader exit / chapter fallback PASS (${diagnostics.errors.length} expected error messages isolated)`);
  } finally { await page.close(); }
}

async function main() {
  assert.ok(existsSync(CHROME_PATH), `Chrome not found: ${CHROME_PATH}. Set CHROME_PATH to a Chrome/Chromium executable.`);
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, pipe: true, protocolTimeout: 30_000, args: ['--no-sandbox', '--ignore-gpu-blocklist', ...(process.argv.includes('--software') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])] });
  try {
    for (const test of [testDesktop, testMobile, testAssetFailure]) {
      // Isolate each fresh visit from the previous test's HTTP cache and preferences.
      const context = await browser.createBrowserContext();
      try { await test(context); } finally { await context.close(); }
    }
    console.log(`[vehicle] PASS ${BASE_URL}; screenshots ${ARTIFACT_DIR}/aventador-*.png`);
  } finally {
    await Promise.race([browser.close().catch(() => undefined), sleep(5000)]);
    browser.disconnect();
    const child = browser.process();
    if (child && child.exitCode === null) child.kill('SIGTERM');
  }
}

main().then(() => process.exit(0)).catch(error => { console.error(`[vehicle] FAIL\n${error.stack || error.message}`); process.exit(1); });
