/* Settings: profile & plan, workout cues, look, data (backup/restore/erase),
   Home Screen install help, phone & sensors info, version history, self-check. */
(function () {
  'use strict';

  const U = LIME.U;
  const st = () => LIME.store.state;

  const TEXT_SIZES = [
    { id: 'system', label: 'Auto', name: 'Same as phone' },
    { id: 's', label: 'S', name: 'Small' },
    { id: 'm', label: 'M', name: 'Medium' },
    { id: 'l', label: 'L', name: 'Large' },
    { id: 'xl', label: 'XL', name: 'Extra large' }
  ];

  const ACCENTS = [
    { id: 'lime', color: '#D9F20F', label: 'Lime' },
    { id: 'orange', color: '#FF9F1C', label: 'Orange' },
    { id: 'cyan', color: '#2EE6D6', label: 'Cyan' },
    { id: 'pink', color: '#FF5FA2', label: 'Pink' }
  ];

  function row(o) {
    const isToggle = o.toggle != null;
    const tag = o.href ? 'a' : isToggle ? 'label' : 'button';
    const attrs = o.href ? `href="${o.href}"` : isToggle ? '' : 'type="button"';
    return `<${tag} class="set-row" ${attrs} ${o.attr || ''}>
      <span class="ico" style="color:${o.color || 'var(--accent)'}">${LIME.icon(o.icon)}</span>
      <span class="grow">${U.esc(o.label)}${o.sub ? `<small>${U.esc(o.sub)}</small>` : ''}</span>
      ${o.val ? `<span class="val">${U.esc(o.val)}</span>` : ''}
      ${isToggle ? `<span class="toggle"><input type="checkbox" data-set="${o.toggle}" ${st().settings[o.toggle] ? 'checked' : ''}><span></span></span>` : `<span class="chev">${LIME.icon('chev')}</span>`}
    </${tag}>`;
  }

  function render(view, parts) {
    const s = st();
    const p = s.profile;
    const goal = LIME.planner.GOALS[p.goal];
    const lastBk = s.ui.lastBackup ? U.fmtDate(s.ui.lastBackup, { day: 'numeric', month: 'short' }) : 'Never';

    view.innerHTML = `
      <header class="page-hd"><h1 class="disp slant">Sett<span class="hl">ings</span></h1></header>

      <a class="card card-link row" href="#/settings/profile" style="gap:14px">
        <span class="avatar" style="width:48px;height:48px;font-size:1.2rem">${p.photo ? `<img src="${p.photo}" alt="">` : U.esc((p.name || '?').charAt(0).toUpperCase())}</span>
        <span class="grow"><strong style="font-size:1.05rem">${U.esc(p.name)}</strong><br>
          <span class="small muted">${U.esc(goal ? goal.label : '')} · ${p.days}×/week · ${p.minutes} min</span></span>
        <span class="ico muted">${LIME.icon('chev')}</span></a>

      ${s.ui.demo ? `<div class="card accent row" style="margin-top:12px"><span class="grow"><strong>Demo mode</strong><br><span class="small muted">You're looking at sample data.</span></span>
        <button type="button" class="btn btn-primary" data-leave-demo>Start fresh</button></div>` : ''}

      <div class="section-title"><h2>Training</h2></div>
      <div class="set-group">
        ${row({ icon: 'calendar', label: 'Edit plan', sub: s.plan.days.map((d) => d.title).join(' · ') + (s.plan.edited ? ' · edited' : ''), href: '#/plan' })}
        ${row({ icon: 'up', label: 'Weight suggestions', sub: 'Go up when you hit every rep', toggle: 'suggest' })}
        ${row({ icon: 'sound', label: 'Beeps', sub: 'Countdown and rest-over sounds', toggle: 'sound' })}
        ${row({ icon: 'user', label: 'Voice cues', sub: 'Says each exercise and rest out loud', toggle: 'voice' })}
        ${row({ icon: 'clock', label: '3-2-1 before starting', toggle: 'countdown' })}
        ${row({ icon: 'phone', label: 'Keep screen on', sub: LIME.wake.supported ? 'During workouts' : 'Not supported on this browser', toggle: 'keepAwake' })}
      </div>

      <div class="section-title"><h2>Look</h2></div>
      <div class="set-group">
        <div class="set-row"><span class="ico">${LIME.icon('sparkle')}</span><span class="grow">Accent colour</span>
          <span class="swatches">${ACCENTS.map((a) => `<button type="button" class="swatch${s.settings.accent === a.id ? ' on' : ''}" style="background:${a.color}" data-accent="${a.id}" aria-label="${a.label}"></button>`).join('')}</span></div>
        <div class="set-row col">
          <div class="row"><span class="ico">${LIME.icon('body')}</span><span class="grow">Exercise demos<small>${({ photo: 'Real photos, start and end position', '3d': '3D body with worked muscles lit' + (LIME.body3d.supported ? '' : ' (not supported here — drawings shown)'), flat: 'Simple drawings — lightest on battery' })[LIME.demoStyle()]}</small></span></div>
          <div class="seg" role="radiogroup" aria-label="Exercise demos">${[['photo', 'Photos'], ['3d', '3D'], ['flat', 'Simple']].map(([id, label]) => `<button type="button" data-demo-style="${id}" class="${LIME.demoStyle() === id ? 'on' : ''}" role="radio" aria-checked="${LIME.demoStyle() === id}">${label}</button>`).join('')}</div>
          ${LIME.demoStyle() === 'photo' ? `<div class="row" style="gap:12px"><span class="small muted grow">Photos show</span>
            <div class="seg" style="flex:0 0 190px" role="radiogroup" aria-label="Photos show">${[['w', 'Woman'], ['m', 'Man']].map(([id, label]) => `<button type="button" data-athlete="${id}" class="${s.settings.athlete === id ? 'on' : ''}" role="radio" aria-checked="${s.settings.athlete === id}">${label}</button>`).join('')}</div></div>
            ${s.settings.athlete === 'm' && Object.keys(LIME.ART_M || {}).length < LIME.EXERCISES.length ? `<small class="tiny muted">Man photos for ${Object.keys(LIME.ART_M || {}).length} of ${LIME.EXERCISES.length} moves so far; the rest show the woman.</small>` : ''}` : ''}
        </div>
        <div class="set-row col">
          <div class="row"><span class="ico">${LIME.icon('search')}</span><span class="grow">Text size<small>${s.settings.text === 'system' ? 'Following your phone\'s text size' : 'Auto follows your phone\'s text size'}</small></span></div>
          <div class="seg" role="radiogroup" aria-label="Text size">${TEXT_SIZES.map((t) => `<button type="button" data-text="${t.id}" class="${s.settings.text === t.id ? 'on' : ''}" role="radio" aria-checked="${s.settings.text === t.id}" aria-label="${t.name}">${t.label}</button>`).join('')}</div>
        </div>
      </div>

      <div class="section-title"><h2>Your data</h2></div>
      <div class="set-group">
        ${row({ icon: 'download', label: 'Back up to a file', sub: 'Last backup: ' + lastBk, attr: 'data-backup' })}
        ${row({ icon: 'upload', label: 'Restore from a file', attr: 'data-restore' })}
        ${row({ icon: 'phone', label: 'Add to Home Screen', sub: U.isStandalone() ? 'Done — running as an app' : 'Recommended on iPhone', href: '#/settings/install' })}
        ${row({ icon: 'heart', label: 'Phone & health data', sub: 'What LIME can and can\'t read', href: '#/settings/sensors' })}
        ${row({ icon: 'trash', label: 'Erase all data', attr: 'data-erase', color: 'var(--bad)' })}
      </div>
      <input type="file" id="restore-file" accept="application/json,.json" hidden>

      <div class="section-title"><h2>About</h2></div>
      <div class="set-group">
        ${row({ icon: 'refresh', label: 'Refresh app', sub: 'Reload and check for updates. Your data stays.', val: 'v' + LIME.VERSION, attr: 'data-refresh' })}
        ${row({ icon: 'heart', label: 'About LIME', sub: 'The story and the creator', href: '#/about' })}
        ${row({ icon: 'sparkle', label: 'Version history', href: '#/settings/versions' })}
        ${row({ icon: 'check', label: 'Self-check', sub: 'Test storage, timers and data on this phone', href: '#/settings/check' })}
      </div>
      <a class="credit" href="#/about">${U.esc(LIME.BRAND.tagline)} by <strong>${U.esc(LIME.BRAND.creator)}</strong></a>
      <p class="tiny muted" style="text-align:center;margin-top:6px">LIME v${LIME.VERSION} · data stored on this device only (${U.esc(LIME.store.backend)})</p>
    `;

    U.$$('[data-set]', view).forEach((t) => t.onchange = () => {
      const k = t.getAttribute('data-set');
      LIME.store.update((x) => { x.settings[k] = t.checked; });
      if (k === 'voice' && t.checked) LIME.audio.say('Voice cues on.');
      if (k === 'sound' && t.checked) setTimeout(() => LIME.audio.tick(), 50);
    });
    U.$$('[data-accent]', view).forEach((b) => b.onclick = () => {
      LIME.store.update((x) => { x.settings.accent = b.getAttribute('data-accent'); });
      LIME.app.applyLook(); render(view);
    });
    U.$$('[data-demo-style]', view).forEach((b) => b.onclick = () => {
      const prev = LIME.demoStyle();
      const next = b.getAttribute('data-demo-style');
      if (prev === next) return;
      LIME.store.update((x) => { x.settings.demo = next; x.settings.demoChosen = true; });
      render(view);
      LIME.toast(`Demos: ${({ photo: 'photos', '3d': '3D bodies', flat: 'simple drawings' })[next]}`, { undo: () => {
        if (LIME.demoStyle() !== next) return;
        LIME.store.update((x) => { x.settings.demo = prev; });
        if (location.hash.startsWith('#/settings')) render(view);
      } });
    });
    U.$$('[data-athlete]', view).forEach((b) => b.onclick = () => {
      const prev = s.settings.athlete;
      const next = b.getAttribute('data-athlete');
      if (prev === next) return;
      LIME.store.update((x) => { x.settings.athlete = next; });
      render(view);
      LIME.toast(`Photos now show a ${next === 'm' ? 'man' : 'woman'}`, { undo: () => {
        if (st().settings.athlete !== next) return;
        LIME.store.update((x) => { x.settings.athlete = prev; });
        if (location.hash.startsWith('#/settings')) render(view);
      } });
    });
    U.$$('[data-text]', view).forEach((b) => b.onclick = () => {
      LIME.store.update((x) => { x.settings.text = b.getAttribute('data-text'); });
      LIME.app.applyLook(); render(view);
    });
    U.$('[data-refresh]', view).onclick = (e) => LIME.app.refresh(e.currentTarget.querySelector('.ico'));
    U.$('[data-backup]', view).onclick = () => backup(view);
    const file = U.$('#restore-file', view);
    U.$('[data-restore]', view).onclick = () => file.click();
    file.onchange = () => restore(file, view);
    U.$('[data-erase]', view).onclick = erase;
    const ld = U.$('[data-leave-demo]', view);
    if (ld) ld.onclick = erase;

    const sub = parts && parts[1];
    if (sub) {
      history.replaceState(null, '', '#/settings');
      ({ profile: profileSheet, plan: () => { location.hash = '#/plan'; }, install: installSheet, sensors: sensorsSheet, versions: versionsSheet, check: checkSheet, backup: () => backup(view) })[sub]?.(view);
    }
  }

  // ---------- Profile ----------
  function profileSheet(view) {
    const p = Object.assign({}, st().profile);
    const goals = Object.entries(LIME.planner.GOALS);
    const sh = LIME.sheet.open({
      title: 'Profile',
      body: `<div class="stack">
        <div class="row"><span class="avatar" id="pf-av" style="width:56px;height:56px;font-size:1.3rem">${p.photo ? `<img src="${p.photo}" alt="">` : U.esc(p.name.charAt(0).toUpperCase())}</span>
          <label class="btn btn-ghost" for="pf-photo">Change photo</label><input type="file" id="pf-photo" accept="image/*" hidden>
          ${p.photo ? '<button type="button" class="link-btn" data-rm-photo>Remove</button>' : ''}</div>
        <label class="field"><span>Name</span><input class="input" id="pf-name" maxlength="24" value="${U.esc(p.name)}"></label>
        <label class="field"><span>Goal</span><select class="input" id="pf-goal">${goals.map(([id, g]) => `<option value="${id}" ${id === p.goal ? 'selected' : ''}>${U.esc(g.label)}</option>`).join('')}</select></label>
        <label class="field"><span>Level</span><select class="input" id="pf-level">${['beginner', 'intermediate', 'advanced'].map((l) => `<option value="${l}" ${l === p.level ? 'selected' : ''}>${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select></label>
        <div class="grid-2">
          <label class="field"><span>Days / week</span><select class="input" id="pf-days">${[2, 3, 4, 5, 6].map((n) => `<option ${n === p.days ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field"><span>Minutes</span><select class="input" id="pf-min">${[20, 30, 45, 60].map((n) => `<option ${n === p.minutes ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
        <div class="field"><span>Equipment</span><div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${LIME.EQUIPMENT.filter((e) => e.id !== 'none').map((e) => `<button type="button" class="chip${p.equipment.includes(e.id) ? ' on' : ''}" data-eq="${e.id}">${U.esc(e.label)}</button>`).join('')}</div></div>
        <div class="field"><span>Units</span><div class="seg"><button type="button" data-u="kg" class="${p.units === 'kg' ? 'on' : ''}">kg</button><button type="button" data-u="lb" class="${p.units === 'lb' ? 'on' : ''}">lb</button></div></div>
        <p class="tiny muted">Changing goal, level, days, minutes or equipment rebuilds your plan. Your history and records stay.</p>
      </div>`,
      foot: '<button type="button" class="btn btn-primary btn-block btn-lg" data-save>Save</button>'
    });
    const el = sh.el;
    let eq = p.equipment.filter((e) => e !== 'none');
    U.$$('[data-eq]', el).forEach((b) => b.onclick = () => {
      const id = b.getAttribute('data-eq');
      eq = eq.includes(id) ? eq.filter((x) => x !== id) : eq.concat(id);
      b.classList.toggle('on', eq.includes(id));
    });
    U.$$('[data-u]', el).forEach((b) => b.onclick = () => { p.units = b.getAttribute('data-u'); U.$$('[data-u]', el).forEach((x) => x.classList.toggle('on', x === b)); });
    U.$('#pf-photo', el).onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try { p.photo = await LIME.app.shrinkPhoto(f); U.$('#pf-av', el).innerHTML = `<img src="${p.photo}" alt="">`; } catch (err) { LIME.toast('Couldn\'t use that photo', { kind: 'bad' }); }
    };
    const rm = U.$('[data-rm-photo]', el);
    if (rm) rm.onclick = () => { p.photo = null; U.$('#pf-av', el).textContent = p.name.charAt(0).toUpperCase(); rm.remove(); };

    U.$('[data-save]', el).onclick = () => {
      const old = st().profile;
      const name = U.$('#pf-name', el).value.trim();
      if (!name) { LIME.toast('Add a name', { kind: 'bad' }); return; }
      const next = Object.assign({}, old, {
        name, photo: p.photo, units: p.units,
        goal: U.$('#pf-goal', el).value, level: U.$('#pf-level', el).value,
        days: Number(U.$('#pf-days', el).value), minutes: Number(U.$('#pf-min', el).value),
        equipment: eq.length ? eq : ['none']
      });
      const planChanged = ['goal', 'level', 'days', 'minutes'].some((k) => old[k] !== next[k]) || old.equipment.slice().sort().join() !== next.equipment.slice().sort().join();
      const before = { profile: JSON.parse(JSON.stringify(old)), plan: JSON.parse(JSON.stringify(st().plan)) };
      const keepEdits = planChanged && st().plan.edited;
      LIME.store.update((x) => { x.profile = next; if (planChanged && !keepEdits) x.plan = LIME.planner.build(next); });
      sh.close(true);
      render(view);
      LIME.toast(keepEdits ? 'Profile saved' : planChanged ? 'Profile saved, plan rebuilt' : 'Profile saved', { kind: 'good', body: keepEdits ? 'Your edited plan was kept. Reset it from Edit plan.' : '', undo: () => {
        LIME.store.update((x) => { x.profile = before.profile; x.plan = before.plan; });
        if (location.hash.startsWith('#/settings')) render(view);
      } });
    };
  }

  // ---------- Backup / restore / erase ----------
  async function backup(view) {
    const json = LIME.store.exportJSON();
    const name = `lime-backup-${U.dayKey()}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    let ok = false;
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'LIME backup' });
        ok = true;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (!ok) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    LIME.store.update((x) => { x.ui.lastBackup = Date.now(); });
    if (view && location.hash.startsWith('#/settings')) render(view);
    LIME.toast('Backup saved', { kind: 'good', body: name });
  }

  async function restore(input, view) {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    const text = await f.text();
    const ok = await LIME.sheet.confirm('Restore backup?', 'This replaces everything on this phone with the backup. It can\'t be undone, so back up first if unsure.', 'Restore', true);
    if (!ok) return;
    try {
      await LIME.store.importJSON(text);
      LIME.app.applyLook();
      LIME.toast('Backup restored', { kind: 'good', body: `${U.plural(st().sessions.length, 'workout')} loaded` });
      location.hash = st().profile ? '#/home' : '#/onboarding';
      LIME.app.route();
    } catch (e) {
      LIME.toast('Couldn\'t restore', { kind: 'bad', body: e.message, action: { label: 'Try again', fn: () => { const f = U.$('#restore-file') || U.$('#ob-restore'); if (f) f.click(); } } });
    }
  }

  async function erase() {
    const demo = st().ui.demo;
    const ok = await LIME.sheet.confirm(demo ? 'Leave demo?' : 'Erase all data?', demo ? 'Clears the sample data so you can set up your own profile.' : 'Deletes your profile, plan, workouts and records from this phone. This can\'t be undone.', demo ? 'Start fresh' : 'Erase', true);
    if (!ok) return;
    if (LIME.player) LIME.player.cleanup();
    await LIME.store.reset();
    LIME.store.state.ui.introSeen = true;
    await LIME.store.save();
    LIME.onboarding._reset();
    LIME.app.applyLook();
    location.hash = '#/onboarding';
    LIME.app.route();
    LIME.toast(demo ? 'Demo cleared' : 'All data erased');
  }

  // ---------- Info sheets ----------
  function installSheet() {
    const ios = U.isIOS();
    LIME.sheet.open({
      title: 'Add to Home Screen',
      body: `${U.isStandalone() ? '<p class="cue">You\'re already using LIME from your Home Screen.</p>' : ''}
        <p class="muted" style="margin-top:0">LIME works best as a Home Screen app: full screen, works offline, and keeps its own storage.</p>
        <ol class="steps-list">${ios
          ? '<li>Open this page in Safari.</li><li>Tap the Share button (square with an arrow).</li><li>Choose "Add to Home Screen", then "Add".</li><li>Open LIME from the new icon.</li>'
          : '<li>Open the browser menu (⋮).</li><li>Choose "Install app" or "Add to Home screen".</li><li>Open LIME from the new icon.</li>'}</ol>
        <div class="cue"><strong>Important on iPhone:</strong> the Home Screen app keeps separate storage from Safari. If you already set up LIME in Safari, back up first, then restore inside the Home Screen app. Safari can also delete site data after about a week without a visit — another reason to install and to back up.</div>`
    });
  }

  function sensorsSheet() {
    const yes = (t) => `<li>${LIME.icon('check').replace('<svg', '<svg width="14" height="14" style="display:inline;color:var(--good);vertical-align:-2px"')} ${t}</li>`;
    const no = (t) => `<li>${LIME.icon('x').replace('<svg', '<svg width="14" height="14" style="display:inline;color:var(--bad);vertical-align:-2px"')} ${t}</li>`;
    LIME.sheet.open({
      title: 'Phone & health',
      body: `<p class="muted" style="margin-top:0">LIME is a web app, so it can only use what browsers allow.</p>
        <div class="section-title"><h2>Works now</h2></div>
        <ul class="bullets" style="list-style:none;padding:0">${yes('Screen stays on during workouts (iPhone iOS 16.4+, Android Chrome)')}${yes('Beeps and voice cues')}${yes('Timers stay correct after the screen locks')}${yes('Share your workout summary')}</ul>
        <div class="section-title"><h2>Planned</h2></div>
        <ul class="bullets" style="list-style:none;padding:0">${yes('Camera rep counting for squats and push-ups (on-device, nothing uploaded)')}${yes('Bluetooth heart-rate straps — Android Chrome only')}</ul>
        <div class="section-title"><h2>Not possible in a web app</h2></div>
        <ul class="bullets" style="list-style:none;padding:0">${no('Reading Apple Health or Google Health Connect (steps, heart rate, sleep)')}${no('Alerts when the app is closed')}${no('Vibration on iPhone')}</ul>
        <p class="tiny muted">Health access needs a native app wrapper (e.g. Capacitor). That's on the roadmap as a later phase.</p>`
    });
  }

  function versionsSheet() {
    LIME.sheet.open({
      title: 'Version history',
      body: LIME.RELEASES.map((r) => `<div class="rel"><h3>v${U.esc(r.version)} <span class="muted small">· ${U.esc(U.fmtDate(r.date + 'T12:00', { day: 'numeric', month: 'short', year: 'numeric' }))}</span></h3>
        <ul>${r.notes.map((n) => `<li>${U.esc(n)}</li>`).join('')}</ul></div>`).join('')
    });
  }

  async function checkSheet() {
    const sh = LIME.sheet.open({ title: 'Self-check', body: '<p class="muted">Running…</p>' });
    const results = await LIME.app.selfCheck();
    U.$('.sheet-body', sh.el).innerHTML = `<div class="card">${results.map((r) => `<div class="list-row">
        <span class="ico" style="color:${r.ok ? 'var(--good)' : r.warn ? 'var(--accent)' : 'var(--bad)'}">${LIME.icon(r.ok ? 'check' : 'info')}</span>
        <span class="grow"><strong>${U.esc(r.name)}</strong><br><span class="tiny muted">${U.esc(r.detail)}</span></span></div>`).join('')}</div>
      <p class="tiny muted">${results.every((r) => r.ok || r.warn) ? 'All good on this device.' : 'Some checks failed — back up your data and report it.'}</p>`;
  }

  LIME.settings = { render, backup, restoreFrom: (input) => restore(input) };
})();
