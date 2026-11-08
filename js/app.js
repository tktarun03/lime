/* App shell: boot, hash router, look, service worker, What's new,
   backup reminder, photo resize, share, self-check. Loaded last. */
(function () {
  'use strict';

  const U = LIME.U;
  const st = () => LIME.store.state;
  let cleanupFn = null;

  // route → { render, tabs (show tab bar), tab (which one is active) }
  const ROUTES = {
    home: { render: (v, p) => LIME.home.render(v, p), tabs: true, tab: 'home' },
    library: { render: (v, p) => LIME.library.render(v, p), tabs: true, tab: 'library' },
    progress: { render: (v, p) => LIME.progress.render(v, p), tabs: true, tab: 'progress' },
    settings: { render: (v, p) => LIME.settings.render(v, p), tabs: true, tab: 'settings' },
    onboarding: { render: (v) => LIME.onboarding.render(v), tabs: false },
    workout: { render: (v) => LIME.player.render(v), tabs: false },
    start: { render: () => { const d = LIME.home.nextDay(); if (d) LIME.player.start(d.id); }, tabs: false }
  };

  function setCleanup(fn) { cleanupFn = fn; }

  function route() {
    if (cleanupFn) { const f = cleanupFn; cleanupFn = null; try { f(); } catch (e) { console.error(e); } }
    const view = document.getElementById('view');
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    let name = parts[0] || 'home';
    const s = st();

    if (!s.profile && name !== 'onboarding') { location.replace('#/onboarding'); name = 'onboarding'; }
    if (s.profile && name === 'onboarding') { location.replace('#/home'); name = 'home'; }
    if (name === 'workout' && !s.active) { location.replace('#/home'); name = 'home'; }
    const r = ROUTES[name] || ROUTES.home;

    if (LIME.sheet.current) LIME.sheet.current.close(true);
    document.getElementById('tabbar').hidden = !r.tabs;
    document.body.classList.toggle('no-tabs', !r.tabs);
    U.$$('#tabbar a').forEach((a) => a.classList.toggle('on', a.getAttribute('data-tab') === r.tab));

    try {
      r.render(view, parts);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="empty"><p>Something went wrong on this screen.</p><a class="btn" href="#/home">Go home</a></div>`;
      LIME.toast('Something went wrong', { kind: 'bad', body: String(e.message || e), action: { label: 'Back up', fn: () => LIME.settings.backup() } });
    }
    LIME.icons.hydrate(document);
    LIME.body3d.hydrate(view);
    if (r.tabs) window.scrollTo(0, 0);
  }

  function applyLook() {
    const s = st().settings;
    const root = document.documentElement;
    if (s.accent && s.accent !== 'lime') root.setAttribute('data-accent', s.accent); else root.removeAttribute('data-accent');
    root.setAttribute('data-text', s.text || 'm');
  }

  /** Resize a picked photo to a small square JPEG data URL (keeps storage tiny). */
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = 192;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad-image')); };
      img.src = url;
    });
  }

  /** Share sheet → clipboard → copy box. */
  async function share(text) {
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); LIME.toast('Copied to clipboard', { kind: 'good' }); return; } catch (e) { /* fall through */ }
    LIME.sheet.open({ title: 'Copy this', body: `<textarea class="input" rows="4" readonly>${U.esc(text)}</textarea>` });
  }

  async function selfCheck() {
    const out = [];
    // storage round trip
    try {
      const before = JSON.stringify(st());
      await LIME.store.save();
      const again = LIME.store.migrate(JSON.parse(before));
      out.push({ name: 'Storage', ok: !!again, detail: `Saving to ${LIME.store.backend}` });
    } catch (e) { out.push({ name: 'Storage', ok: false, detail: String(e.message || e) }); }
    // persistence
    try {
      const p = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
      out.push({ name: 'Protected storage', ok: p === true, warn: p !== true, detail: p ? 'Browser won\'t clear data on its own' : 'Browser may clear data if space is low — keep backups' });
    } catch (e) { out.push({ name: 'Protected storage', ok: false, warn: true, detail: 'Unknown' }); }
    // migrate defaults
    const m = LIME.store.migrate({});
    out.push({ name: 'Data shape', ok: m.schema === LIME.store.SCHEMA && Array.isArray(m.sessions), detail: `Schema v${m.schema}` });
    // timer accuracy
    const t0 = Date.now();
    await new Promise((res) => { const c = LIME.timer.countdown({ seconds: 0.3, onDone: res }); setTimeout(() => { c.stop(); res(); }, 2000); });
    const dt = Date.now() - t0;
    out.push({ name: 'Timer', ok: dt >= 250 && dt < 900, detail: `0.3 s timer took ${dt} ms` });
    // plan builds for every profile combination
    let planOk = true;
    ['strength', 'muscle', 'fatloss', 'general', 'mobility'].forEach((g) => [2, 3, 4, 5, 6].forEach((d) => {
      const p = LIME.planner.build({ goal: g, level: 'beginner', equipment: ['none'], days: d, minutes: 20 });
      if (p.days.length !== d || p.days.some((x) => x.items.length < 2)) planOk = false;
    }));
    out.push({ name: 'Plan builder', ok: planOk, detail: '25 profile combinations' });
    // exercises reference valid figures
    const badFig = LIME.EXERCISES.filter((e) => !LIME.FIGURES.includes(e.fig)).map((e) => e.id);
    out.push({ name: 'Exercise library', ok: !badFig.length, detail: badFig.length ? 'Missing art: ' + badFig.join(', ') : `${LIME.EXERCISES.length} moves` });
    const missingArt = LIME.EXERCISES.filter((e) => !LIME.ART[e.id]).map((e) => e.id);
    out.push({ name: 'Exercise photos', ok: !missingArt.length, warn: !!missingArt.length, detail: missingArt.length ? 'Drawings for: ' + missingArt.join(', ') : `${Object.keys(LIME.ART).length} of ${LIME.EXERCISES.length} moves` });
    out.push({ name: '3D bodies', ok: LIME.body3d.supported, warn: !LIME.body3d.supported, detail: LIME.body3d.supported ? 'WebGL available' : 'No WebGL — showing flat drawings' });
    out.push({ name: 'Keep screen on', ok: LIME.wake.supported, warn: !LIME.wake.supported, detail: LIME.wake.supported ? 'Supported' : 'Not supported in this browser' });
    out.push({ name: 'Offline', ok: 'serviceWorker' in navigator && !!navigator.serviceWorker.controller, warn: true, detail: navigator.serviceWorker && navigator.serviceWorker.controller ? 'Ready' : 'Becomes ready after the next open' });
    return out;
  }

  function afterBoot() {
    const s = st();
    if (!s.profile) return;
    // What's new — once per version, not on first install
    if (s.ui.lastVersionSeen && s.ui.lastVersionSeen !== LIME.VERSION) {
      const rel = LIME.RELEASES[0];
      LIME.toast(`Updated to version ${LIME.VERSION}`, { body: rel.notes[0], action: { label: "What's new", fn: () => { location.hash = '#/settings/versions'; } } });
      LIME.store.update((x) => { x.ui.lastVersionSeen = LIME.VERSION; });
      return;
    }
    if (!s.ui.lastVersionSeen) LIME.store.update((x) => { x.ui.lastVersionSeen = LIME.VERSION; });
    // Active workout
    if (s.active && !location.hash.startsWith('#/workout')) {
      LIME.toast('Workout in progress', { body: s.active.title, action: { label: 'Resume', fn: () => { location.hash = '#/workout'; } } });
      return;
    }
    // Backup reminder: after 3+ workouts, if no backup in 14 days; at most once a week
    const day = 864e5;
    const stale = !s.ui.lastBackup || Date.now() - s.ui.lastBackup > 14 * day;
    const nagged = s.ui.lastBackupNag && Date.now() - s.ui.lastBackupNag < 7 * day;
    if (s.sessions.length >= 3 && stale && !nagged && !s.ui.demo) {
      LIME.store.update((x) => { x.ui.lastBackupNag = Date.now(); });
      LIME.toast('Time for a backup', { body: 'Your data only lives on this phone.', action: { label: 'Back up', fn: () => LIME.settings.backup() } });
    }
  }

  function hideSplash() {
    const sp = document.getElementById('splash');
    if (!sp) return;
    sp.classList.add('out');
    setTimeout(() => sp.remove(), 350);
  }

  async function boot() {
    try {
      await LIME.store.load();
    } catch (e) {
      console.error(e);
    }
    LIME.store.onSaveError = () => LIME.toast("Couldn't save", { kind: 'bad', body: 'Storage is full or blocked.', action: { label: 'Back up', fn: () => LIME.settings.backup() } });
    applyLook();
    window.addEventListener('hashchange', route);
    route();
    hideSplash();
    setTimeout(afterBoot, 600);

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      try { navigator.serviceWorker.register('sw.js?v=' + LIME.VERSION).catch(() => {}); } catch (e) { /* ignore */ }
    }
  }

  LIME.app = { route, applyLook, shrinkPhoto, share, selfCheck, setCleanup, boot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
