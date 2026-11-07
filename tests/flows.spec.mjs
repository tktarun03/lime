// Browser flows. Run: npx playwright test
import { test, expect } from '@playwright/test';

const errorsOf = (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/GL Driver|GPU stall|WebGL/.test(m.text())) errs.push(m.text()); });
  return errs;
};

async function noHorizontalScroll(page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, 'page scrolls sideways').toBeLessThanOrEqual(0);
}

async function footerVisible(page, sel) {
  const box = await page.locator(sel).boundingBox();
  const vh = page.viewportSize().height;
  expect(box, `${sel} missing`).not.toBeNull();
  expect(box.y + box.height, `${sel} cut off`).toBeLessThanOrEqual(vh + 1);
}

async function onboard(page, opts = {}) {
  await page.goto('/');
  await page.click('[data-skip]');
  await page.fill('#ob-name', opts.name || 'Sam');
  await page.click('[data-continue]');
  await page.click(`[data-opt="${opts.goal || 'muscle'}"]`);
  await page.click(`[data-opt="${opts.level || 'intermediate'}"]`);
  for (const e of opts.equipment || ['dumbbell']) await page.click(`[data-opt="${e}"]`);
  await page.click('[data-continue]');
  await page.click(`[data-opt="${opts.days || 3}"]`);
  await page.click('[data-continue]');
  await page.click('[data-opt="30"]');
  await page.click('[data-continue]');
  if (opts.bw) await page.fill('#ob-bw', String(opts.bw));
  await page.click('[data-continue]');
  await expect(page.locator('h1')).toContainText('Your plan');
  await footerVisible(page, '[data-continue]');
  await page.click('[data-continue]');
  await expect(page).toHaveURL(/#\/home/);
}

test('intro → sign-up keeps values when going back → home', async ({ page }) => {
  const errs = errorsOf(page);
  await page.goto('/');
  await expect(page.locator('.intro')).toBeVisible();
  await noHorizontalScroll(page);
  await page.click('[data-skip]');
  await page.fill('#ob-name', 'Sam');
  await page.click('[data-continue]');
  await page.click('[data-opt="strength"]');
  await expect(page.locator('h1')).toContainText('level');
  await page.click('[data-back]');
  await expect(page.locator('[data-opt="strength"]')).toHaveClass(/on/);
  await page.click('[data-back]');
  await expect(page.locator('#ob-name')).toHaveValue('Sam');
  await footerVisible(page, '[data-continue]');
  expect(errs).toEqual([]);
});

test('full onboarding builds a plan and a correct home screen', async ({ page }) => {
  const errs = errorsOf(page);
  await onboard(page, { days: 4, bw: 80 });
  await expect(page.locator('.hero')).toContainText('Upper');
  await expect(page.locator('.plan-day')).toHaveCount(4);
  await expect(page.locator('.ring text')).toHaveText('0/4');
  await expect(page.locator('.checklist .item.done')).toHaveCount(2); // profile + weight logged
  await noHorizontalScroll(page);
  await footerVisible(page, '#tabbar');
  const s = await page.evaluate(() => LIME.store.state);
  expect(s.profile.name).toBe('Sam');
  expect(s.bodyLog.length).toBe(1);
  expect(errs).toEqual([]);
});

test('workout: log sets, rest, swap with undo, finish saves a session', async ({ page }) => {
  const errs = errorsOf(page);
  await onboard(page, { equipment: ['dumbbell'] });
  await page.click('[data-start]');
  await page.locator('.countdown').click();
  await footerVisible(page, '.pl-foot .btn-primary');
  await noHorizontalScroll(page);
  // warm-up (timed) — finish early
  await page.click('[data-timer]');
  await page.waitForTimeout(1100);
  await page.click('[data-timer]');
  await expect(page.locator('.rest')).toBeVisible();
  await page.click('.rest [data-add="15"]');
  await page.click('.rest [data-skip]');
  // first main exercise: change reps, log
  await page.click('[data-rep="1"]');
  const name = await page.locator('.pl-name').textContent();
  await page.click('[data-done]');
  await page.click('.rest [data-skip]');
  // swap with undo
  await page.click('[data-more]');
  await page.locator('[data-swap]').first().click();
  await expect(page.locator('.toast')).toContainText('Swapped to');
  await page.click('.toast .t-btn');
  await expect(page.locator('.pl-name')).toHaveText(name);
  // quit → finish & save
  await page.click('[data-quit]');
  await page.click('[data-save]');
  await expect(page.locator('.done-screen')).toContainText('done');
  const s = await page.evaluate(() => LIME.store.state);
  expect(s.sessions.length).toBe(1);
  expect(s.sessions[0].sets.length).toBe(2);
  expect(s.active).toBeNull();
  expect(s.plan.next).toBe(1);
  await page.click('[data-home]');
  await expect(page.locator('.ring text')).toHaveText('1/3');
  expect(errs).toEqual([]);
});

test('workout in progress survives a reload', async ({ page }) => {
  await onboard(page);
  await page.click('[data-start]');
  await page.locator('.countdown').click();
  await page.click('[data-timer]');
  await page.click('[data-timer]');
  await page.reload();
  await expect(page).toHaveURL(/#\/workout/);
  await expect(page.locator('.pl-name')).toBeVisible();
  const log = await page.evaluate(() => LIME.store.state.active.log.length);
  expect(log).toBe(1);
});

test('discard workout has a working Undo', async ({ page }) => {
  await onboard(page);
  await page.click('[data-start]');
  await page.locator('.countdown').click();
  await page.click('[data-quit]');
  await page.click('[data-discard]');
  await expect(page.locator('.toast')).toContainText('discarded');
  await page.click('.toast .t-btn');
  await expect(page).toHaveURL(/#\/workout/);
  expect(await page.evaluate(() => !!LIME.store.state.active)).toBe(true);
});

test('body weight log + undo puts data back', async ({ page }) => {
  await onboard(page);
  await page.goto('/#/progress');
  await page.locator('[data-log-bw]').first().click();
  await page.fill('#bw-in', '81.5');
  await page.click('[data-save]');
  await expect(page.locator('.toast')).toContainText('Weight logged');
  expect(await page.evaluate(() => LIME.store.state.bodyLog.length)).toBe(1);
  await page.click('.toast .t-btn');
  expect(await page.evaluate(() => LIME.store.state.bodyLog.length)).toBe(0);
});

test('demo mode, every tab renders, settings rebuild plan with undo', async ({ page }) => {
  const errs = errorsOf(page);
  await page.goto('/');
  await page.click('[data-skip]');
  await page.click('[data-demo]');
  await expect(page.locator('.hero')).toBeVisible();
  for (const tab of ['library', 'progress', 'settings', 'home']) {
    await page.click(`#tabbar [data-tab="${tab}"]`);
    await expect(page.locator(`#tabbar [data-tab="${tab}"]`)).toHaveClass(/on/);
    await noHorizontalScroll(page);
  }
  await page.click('#tabbar [data-tab="library"]');
  await page.fill('#ex-q', 'squat');
  await expect(page.locator('.ex-item').first()).toContainText('Squat');
  await page.locator('.ex-item').first().click();
  await expect(page.locator('.sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.click('#tabbar [data-tab="settings"]');
  await page.click('.card-link');
  await page.selectOption('#pf-days', '5');
  await page.click('[data-save]');
  expect(await page.evaluate(() => LIME.store.state.plan.days.length)).toBe(5);
  await page.click('.toast .t-btn');
  expect(await page.evaluate(() => LIME.store.state.plan.days.length)).toBe(3);
  expect(errs).toEqual([]);
});

test('backup → erase → restore round trip', async ({ page }) => {
  await onboard(page, { name: 'Robin' });
  await page.goto('/#/settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-backup]')]);
  const path = await dl.path();
  await page.click('[data-erase]');
  await page.click('[data-yes]');
  await expect(page).toHaveURL(/#\/onboarding/);
  expect(await page.evaluate(() => LIME.store.state.profile)).toBeNull();
  // restore from the first sign-up screen
  await page.setInputFiles('#ob-restore', path);
  await page.click('[data-yes]');
  await expect(page).toHaveURL(/#\/home/);
  await expect(page.locator('.home-hd')).toContainText('Robin');
  expect(await page.evaluate(() => LIME.store.state.profile.name)).toBe('Robin');
});

test('self-check passes on this browser', async ({ page }) => {
  await onboard(page);
  const r = await page.evaluate(() => LIME.app.selfCheck());
  const hard = r.filter((x) => !x.ok && !x.warn);
  expect(hard, JSON.stringify(hard)).toEqual([]);
});

test('3D body demo replaces the drawing when WebGL is available', async ({ page }) => {
  const errs = errorsOf(page);
  await page.addInitScript(() => { try { localStorage.setItem('lime.force3d', '1'); } catch (e) { /* ignore */ } });
  await onboard(page);
  await page.goto('/#/library/goblet-squat');
  await expect(page.locator('.sheet .b3d')).toBeVisible();
  const ok = await page.evaluate(() => LIME.body3d.supported);
  if (ok) {
    await expect(page.locator('.sheet .b3d.on canvas')).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Escape');
    await page.click('#tabbar [data-tab="progress"]');
    await page.waitForTimeout(300);
    // figures that left the page are cleaned up (only the home hero could remain)
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => LIME.body3d.count)).toBeLessThanOrEqual(1);
  }
  expect(errs.filter((e) => !/GL Driver|GPU stall/.test(e))).toEqual([]);
});

test('text size setting scales the whole UI, Auto follows the phone', async ({ page }) => {
  await onboard(page);
  const rootPx = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await rootPx()).toBe(15);
  await page.goto('/#/settings');
  await page.click('[data-text="xl"]');
  expect(await rootPx()).toBe(19);
  await page.click('[data-text="s"]');
  expect(await rootPx()).toBe(14);
  await page.click('[data-text="system"]');
  expect(await rootPx()).toBe(16); // browser default in the test browser
  expect(await page.evaluate(() => LIME.store.state.settings.text)).toBe('system');
  await noHorizontalScroll(page);
});

test('old text size values migrate', async ({ page }) => {
  await page.goto('/');
  const out = await page.evaluate(() => [LIME.store.migrate({ settings: { text: 'large' } }).settings.text, LIME.store.migrate({ settings: { text: 'normal' } }).settings.text, LIME.store.migrate({}).settings.text]);
  expect(out).toEqual(['l', 'm', 'm']);
});
