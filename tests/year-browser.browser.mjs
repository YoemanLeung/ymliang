import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const summary = JSON.parse(await readFile(new URL('../src/data/observing-summary.json',import.meta.url),'utf8'));

import {serveOutput} from '../scripts/serve-output.mjs';

const server = process.env.TEST_BUILT_OUTPUT === '1' ? await serveOutput('dist', process.env.SITE_BASE || '/') : null;
const base = (server?.url || process.env.TEST_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/, '');
let browser;
const errors = [];

async function checkYear(panel, year) {
  assert.equal(await panel.locator('[data-controls]').isVisible(), true, 'Year controls must initialize visibly');
  const visible = panel.locator('[data-year]:not([hidden])');
  assert.equal(await visible.count(), 1, 'Only one year should be displayed');
  assert.equal(await visible.getAttribute('data-year'), year);
  assert.equal(await panel.locator('select').inputValue(), year);
  assert.match(await panel.locator('[data-status]').innerText(), new RegExp('^' + year + ' ·'));
}

try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {}),
  });
  const page = await browser.newPage({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/#talks', {waitUntil: 'networkidle'});
  const talks = page.locator('year-browser[data-prefix="talk-year-"]');
  const papers = page.locator('year-browser[data-prefix="year-"]');
  const proposals = page.locator('#proposals');
  assert.equal(await proposals.locator('year-browser').count(),0);
  assert.deepEqual(await proposals.locator('[data-facility]').evaluateAll(rows=>rows.map(row=>row.dataset.facility)),summary.facilities.map(row=>row.id));
  assert.equal(await page.locator('[data-proposal-id]').count(),0);
  assert.equal(await page.locator('#cv #chandra-support').count(),1);
  assert.equal(await proposals.locator('#chandra-support').count(),0);
  if(process.env.QA_OUTPUT_DIR){
    await mkdir(process.env.QA_OUTPUT_DIR,{recursive:true});
    await proposals.screenshot({path:join(process.env.QA_OUTPUT_DIR,'summary-desktop.png')});
  }
  await checkYear(talks, '2026');
  await checkYear(papers, '2026');
  assert.equal(await talks.locator('[data-newer]').isDisabled(), true);
  await talks.locator('[data-older]').click();
  await checkYear(talks, '2025');
  await checkYear(papers, '2026');
  assert.equal(new URL(page.url()).hash, '#talk-year-2025');
  await talks.locator('[data-newer]').click();
  await checkYear(talks, '2026');

  // Exercise every actual year in the browser, including the single-entry years.
  const ids = [];
  for (const year of await talks.locator('option').evaluateAll(options => options.map(option => option.value))) {
    await talks.locator('select').selectOption(year);
    await checkYear(talks, year);
    ids.push(...await talks.locator('[data-year]:not([hidden]) [data-talk-id]').evaluateAll(items => items.map(item => item.dataset.talkId)));
  }
  assert.equal(ids.length, 58);
  assert.equal(new Set(ids).size, 58);
  assert.equal(await talks.locator('[data-older]').isDisabled(), true);

  await talks.locator('select').selectOption('2025');
  await talks.locator('.publication-scroll').evaluate(element => { element.scrollTop = 250; });
  await talks.locator('[data-older]').click();
  await checkYear(talks, '2024');
  assert.equal(await talks.locator('.publication-scroll').evaluate(element => element.scrollTop), 0);
  await papers.locator('select').selectOption('2023');
  await checkYear(papers, '2023');
  await checkYear(talks, '2024');

  // Direct links, standalone route, and narrow screen use the same working controls.
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base + '/talks/#talk-year-2020', {waitUntil: 'networkidle'});
  await checkYear(talks, '2020');
  await talks.locator('[data-newer]').click();
  await checkYear(talks, '2021');
  const frame = await talks.locator('.publication-scroll').evaluate(element => ({
    height: element.clientHeight, contentHeight: element.scrollHeight,
    overflow: getComputedStyle(element).overflowY,
  }));
  assert.ok(frame.height >= 320 && frame.height <= 544, 'The year panel stays bounded on mobile');
  assert.equal(frame.overflow, 'auto');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.goto(base + '/publications/#year-2024', {waitUntil: 'networkidle'});
  await checkYear(papers, '2024');
  await papers.locator('[data-newer]').click();
  await checkYear(papers, '2025');
  await page.goto(base + '/proposals/#proposal-year-2024',{waitUntil:'networkidle'});
  await page.waitForURL(base + '/#proposals');
  assert.equal(await proposals.locator('[data-facility]').count(),summary.facilities.length);
  assert.equal(await proposals.locator('year-browser').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  const bounds=await proposals.locator('table').boundingBox();
  assert.ok(bounds.x>=0 && bounds.x+bounds.width<=390,'Summary fits the mobile width');
  if(process.env.QA_OUTPUT_DIR) await proposals.screenshot({path:join(process.env.QA_OUTPUT_DIR,'summary-mobile.png')});
  await page.goto(base+'/cv/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('script').count(),0);
  assert.equal(await page.locator('[data-proposal-id]').count(),0);
  assert.equal(await page.locator('[data-facility]').count(),summary.facilities.length);
  assert.equal(await page.locator('.cv-block #chandra-support').count(),1);
  const portrait=page.locator('.cv-top img');
  assert.ok((await portrait.getAttribute('src')).endsWith('yongming-liang-suit.jpg'));
  await page.emulateMedia({media:'print'});
  assert.ok((await portrait.boundingBox()).width>=125,'Printed CV portrait is enlarged');
  assert.deepEqual(errors, [], 'Browser initialization and navigation must not throw');
  console.log('Browser checks passed: 15 telescope totals, no detailed proposals, legacy redirect, enlarged CV portrait, funding placement, 58 presentations, independent year controls, deep links, and mobile layout.');
} finally {
  await browser?.close();
  await server?.close();
}
