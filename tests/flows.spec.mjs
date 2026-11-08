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
  await page.evaluate(() => LIME.store.update((x) => { x.settings.demo = '3d'; }));
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

test('exercise photos load everywhere, and the demo setting switches style with undo', async ({ page }) => {
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  await onboard(page, { equipment: ['dumbbell'] });
  // home hero
  await expect(page.locator('.hero .photo img.ph-a')).toBeVisible();
  // library thumbnails and detail
  await page.goto('/#/library/goblet-squat');
  await expect(page.locator('.sheet .photo .ph-b')).toHaveAttribute('src', 'media/ex/goblet-squat-b.webp');
  const loaded = await page.locator('.sheet .photo img').evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode().then(() => i.naturalWidth > 0))));
  expect(loaded).toEqual([true, true]);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  expect(failed, failed.join('\n')).toEqual([]);
  // switch to simple drawings
  await page.goto('/#/settings');
  await page.click('[data-demo-style="flat"]');
  expect(await page.evaluate(() => LIME.store.state.settings.demo)).toBe('flat');
  await page.click('.toast .t-btn');
  expect(await page.evaluate(() => LIME.store.state.settings.demo)).toBe('photo');
  await page.click('[data-demo-style="flat"]');
  await page.goto('/#/library/goblet-squat');
  await expect(page.locator('.sheet .photo')).toHaveCount(0);
  await expect(page.locator('.sheet .stage svg')).toBeVisible();
});

test('old 3D switch migrates to the demo style', async ({ page }) => {
  await page.goto('/');
  const out = await page.evaluate(() => [
    LIME.store.migrate({ settings: { body3d: false } }).settings.demo,
    LIME.store.migrate({ settings: { body3d: true } }).settings.demo,
    LIME.store.migrate({}).settings.demo,
    LIME.store.migrate({ settings: { demo: '3d' } }).settings.demo
  ]);
  expect(out).toEqual(['flat', 'photo', 'photo', '3d']);
});

test('refresh button reloads, keeps data and says it is up to date', async ({ page }) => {
  await onboard(page, { name: 'Kai' });
  await page.click('[data-refresh]');
  await page.waitForLoadState('load');
  await expect(page.locator('.toast')).toContainText('Up to date', { timeout: 5000 });
  expect(await page.evaluate(() => LIME.store.state.profile.name)).toBe('Kai');
  await page.goto('/#/settings');
  await page.click('.set-row[data-refresh]');
  await page.waitForLoadState('load');
  await expect(page.locator('.toast')).toContainText('Up to date', { timeout: 5000 });
});

test('plan editor: add, edit, reorder, remove with undo; workout uses the edits', async ({ page }) => {
  const errs = errorsOf(page);
  await onboard(page, { equipment: ['dumbbell'] });
  await page.click('a[href="#/plan"]');
  await expect(page.locator('.plan-card')).toHaveCount(3);
  await noHorizontalScroll(page);
  await page.locator('.plan-card').first().click();
  await expect(page).toHaveURL(/#\/plan\/d1/);
  const count = () => page.evaluate(() => LIME.store.state.plan.days[0].items.length);
  const n0 = await count();
  // add an exercise
  await page.click('[data-add]');
  await page.fill('#pk-q', 'curl');
  await page.locator('[data-pick="db-curl"]').click();
  await expect(page.locator('.toast')).toContainText('Added Dumbbell Curl');
  expect(await count()).toBe(n0 + 1);
  expect(await page.evaluate(() => LIME.store.state.plan.edited)).toBe(true);
  // move it up one
  const last = n0;
  await page.click(`[data-up="${last}"]`);
  expect(await page.evaluate((i) => LIME.store.state.plan.days[0].items[i].exId, last - 1)).toBe('db-curl');
  // edit sets and rest
  await page.click(`[data-edit="${last - 1}"]`);
  await page.fill('#it-sets', '5');
  await page.click('[data-step="rest"][data-d="1"]');
  await page.click('[data-save]');
  const it = await page.evaluate((i) => LIME.store.state.plan.days[0].items[i], last - 1);
  expect(it.sets).toBe(5);
  // remove + undo
  await page.click(`[data-edit="${last - 1}"]`);
  await page.click('[data-remove]');
  expect(await count()).toBe(n0);
  await page.click('.toast .t-btn');
  expect(await count()).toBe(n0 + 1);
  // rename
  await page.fill('#day-title', 'Arms day');
  await page.press('#day-title', 'Enter');
  await expect(page.locator('.toast')).toContainText('Day renamed');
  // start this day: player shows the edited plan
  await page.click('[data-start]');
  const active = await page.evaluate(() => LIME.store.state.active);
  expect(active.title).toBe('Arms day');
  expect(active.items.some((x) => x.exId === 'db-curl' && x.sets === 5)).toBe(true);
  expect(errs).toEqual([]);
});

test('plan editor: add and delete a day, profile change keeps an edited plan', async ({ page }) => {
  await onboard(page, { days: 3 });
  await page.goto('/#/plan');
  await page.click('[data-add-day]');
  await expect(page).toHaveURL(/#\/plan\/d/);
  expect(await page.evaluate(() => LIME.store.state.plan.days.length)).toBe(4);
  await page.click('[data-del-day]');
  await expect(page).toHaveURL(/#\/plan$/);
  expect(await page.evaluate(() => LIME.store.state.plan.days.length)).toBe(3);
  // change days in profile: edited plan is kept
  await page.goto('/#/settings');
  await page.click('.card-link');
  await page.selectOption('#pf-days', '5');
  await page.click('[data-save]');
  await expect(page.locator('.toast')).toContainText('Your edited plan was kept');
  expect(await page.evaluate(() => LIME.store.state.plan.days.length)).toBe(3);
  // reset to suggested plan follows the new profile
  await page.goto('/#/plan');
  await page.evaluate(() => LIME.toast.clear());
  await page.click('[data-reset]');
  await page.click('[data-yes]');
  expect(await page.evaluate(() => [LIME.store.state.plan.days.length, LIME.store.state.plan.edited])).toEqual([5, false]);
});

test('weight suggestions: up after every rep, hold after misses, shown in the player', async ({ page }) => {
  await onboard(page, { equipment: ['dumbbell'] });
  const res = await page.evaluate(() => {
    const mk = (reps, kg) => ({ id: 'x' + Math.random(), dayId: 'd1', title: 'T', start: Date.now() - 1e6, end: Date.now() - 9e5, durationSec: 100,
      sets: reps.map((r, i) => ({ exId: 'goblet-squat', setNo: i + 1, reps: r, secs: 0, kg, done: true })), volumeKg: 0, prs: [] });
    const out = {};
    LIME.store.state.sessions = [mk([10, 10, 10], 20)];
    out.up = LIME.stats.suggest('goblet-squat', 10, 'kg');
    LIME.store.state.sessions = [mk([10, 8, 7], 20)];
    out.hold = LIME.stats.suggest('goblet-squat', 10, 'kg');
    LIME.store.state.sessions = [mk([5, 4, 6], 20)];
    out.down = LIME.stats.suggest('goblet-squat', 10, 'kg');
    out.body = LIME.stats.suggest('pushup', 10, 'kg');
    LIME.store.state.sessions = [mk([10, 10, 10], 20)];
    out.lb = LIME.stats.suggest('goblet-squat', 10, 'lb');
    return out;
  });
  expect([res.up.kind, res.up.kg]).toEqual(['up', 22]);
  expect([res.hold.kind, res.hold.kg]).toEqual(['hold', 20]);
  expect([res.down.kind, res.down.kg]).toEqual(['down', 18]);
  expect(res.body).toBeNull();
  expect(res.lb.step).toBe(5);
  // player: goblet squat is first after the warm-up; chip + prefilled weight
  await page.evaluate(() => LIME.store.save());
  const day = await page.evaluate(() => LIME.store.state.plan.days.find((d) => d.items.some((i) => i.exId === 'goblet-squat')).id);
  await page.evaluate((id) => LIME.player.start(id), day);
  await page.locator('.countdown').click();
  for (let i = 0; i < 8; i++) {
    if (await page.locator('.pl-name', { hasText: 'Goblet Squat' }).count()) break;
    if (await page.locator('[data-timer]').count()) { await page.click('[data-timer]'); await page.click('[data-timer]'); }
    else { await page.click('[data-more]'); await page.click('[data-skip-ex]'); }
    if (await page.locator('.rest [data-skip]').count()) await page.click('.rest [data-skip]');
  }
  await expect(page.locator('.sugg.up')).toContainText('+2 kg');
  await expect(page.locator('#pl-kg')).toHaveValue('22');
});
