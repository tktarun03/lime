/* Intro tour (3 swipe slides, skippable) → profile set-up, one topic per
   screen with a progress bar → review → plan built. Values are kept when
   going back. Also starts demo mode. */
(function () {
  'use strict';

  const U = LIME.U;
  let draft = null;
  let step = 0;

  const GOAL_OPTS = [
    { id: 'strength', label: 'Get stronger', sub: 'Heavier lifts, fewer reps', icon: 'barbell' },
    { id: 'muscle', label: 'Build muscle', sub: 'Moderate weight, 8–12 reps', icon: 'dumbbell' },
    { id: 'fatloss', label: 'Lose fat', sub: 'Higher reps, short rests', icon: 'flame' },
    { id: 'general', label: 'Get fit & healthy', sub: 'A bit of everything', icon: 'heart' },
    { id: 'mobility', label: 'Move better', sub: 'Mobility, core and control', icon: 'stretch' }
  ];
  const LEVEL_OPTS = [
    { id: 'beginner', label: 'New to this', sub: 'Little or no regular training', icon: 'sparkle' },
    { id: 'intermediate', label: 'Some experience', sub: 'Trained on and off for months', icon: 'bolt' },
    { id: 'advanced', label: 'Experienced', sub: 'Training consistently for a year+', icon: 'trophy' }
  ];

  function freshDraft() {
    return { name: '', photo: null, goal: null, level: null, equipment: ['none'], days: 3, minutes: 30, units: 'kg', bodyWeight: '' };
  }

  const STEPS = ['name', 'goal', 'level', 'equipment', 'days', 'minutes', 'body', 'review'];

  // ---------- Intro tour ----------
  function renderIntro(view) {
    const slides = [
      { script: 'Your', h: 'Stronger <span class="hl">self</span>', p: 'starts with the next rep. Short, focused workouts built around you.', fig: LIME.figure('squat', { eq: 'none', label: 'Squat' }) },
      { script: 'Every', h: 'Rep <span class="hl">counts</span>', p: 'Sets, rest timers, a 3-2-1 countdown and personal records — tracked as you go.', fig: LIME.figure('bench', { eq: 'barbell', label: 'Bench press' }) },
      { script: 'Your', h: 'Data. <span class="hl">Your</span> phone.', p: 'No account, no server. Everything stays on this device, with a backup file you control.', fig: LIME.figure('press', { eq: 'dumbbell', label: 'Shoulder press' }) }
    ];
    view.innerHTML = `<div class="intro">
      <button type="button" class="link-btn skip" data-skip>Skip</button>
      <div class="intro-track" id="intro-track">
        ${slides.map((s) => `<section class="slide tex">
          <div class="art">${s.fig}</div>
          <div class="script">${U.esc(s.script)}</div>
          <h1 class="disp slant">${s.h}</h1>
          <p>${U.esc(s.p)}</p>
        </section>`).join('')}
      </div>
      <div class="intro-foot">
        <div class="dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
        <button type="button" class="btn btn-primary btn-disp" data-next>Next</button>
      </div>
    </div>`;
    const track = U.$('#intro-track', view);
    const dots = U.$$('.dots i', view);
    const next = U.$('[data-next]', view);
    let idx = 0;
    const sync = () => {
      idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
      next.textContent = idx === slides.length - 1 ? 'Get started' : 'Next';
    };
    track.addEventListener('scroll', U.debounce(sync, 60), { passive: true });
    next.onclick = () => {
      if (idx >= slides.length - 1) return finishIntro();
      track.scrollTo({ left: (idx + 1) * track.clientWidth, behavior: 'smooth' });
      setTimeout(sync, 400);
    };
    U.$('[data-skip]', view).onclick = finishIntro;
  }

  function finishIntro() {
    LIME.store.update((s) => { s.ui.introSeen = true; });
    location.hash = '#/onboarding';
    LIME.app.route();
  }

  // ---------- Steps ----------
  function optList(opts, selected, multi) {
    return `<div class="opts" role="${multi ? 'group' : 'radiogroup'}">${opts.map((o) => {
      const on = multi ? selected.includes(o.id) : selected === o.id;
      return `<button type="button" class="opt${on ? ' on' : ''}" data-opt="${o.id}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}">
        <span class="opt-ico">${LIME.icon(o.icon)}</span>
        <span class="grow"><strong>${U.esc(o.label)}</strong>${o.sub ? `<small>${U.esc(o.sub)}</small>` : ''}</span>
        <span class="check">${on ? LIME.icon('check') : ''}</span></button>`;
    }).join('')}</div>`;
  }

  function stepBody(key) {
    const d = draft;
    switch (key) {
      case 'name':
        return `<h1 class="disp slant">What should we <span class="hl">call you?</span></h1>
          <p class="lead">Just a first name or nickname. It stays on this phone.</p>
          <div class="stack">
            <label class="field"><span>Name</span><input class="input input-big" id="ob-name" maxlength="24" autocomplete="given-name" value="${U.esc(d.name)}" placeholder="Your name" autofocus></label>
            <div class="row">
              <label class="btn btn-ghost" for="ob-photo">${LIME.icon('user')} ${d.photo ? 'Change photo' : 'Add photo'}</label>
              <input type="file" id="ob-photo" accept="image/*" hidden>
              ${d.photo ? `<span class="avatar"><img src="${d.photo}" alt=""></span>` : '<span class="muted small">Optional</span>'}
            </div>
            <div class="row" style="flex-wrap:wrap;gap:0">
              <button type="button" class="link-btn" data-demo>Just looking? Try demo mode</button>
              <label class="link-btn" for="ob-restore" style="display:inline-flex;align-items:center">Restore a backup</label>
              <input type="file" id="ob-restore" accept="application/json,.json" hidden>
            </div>
          </div>`;
      case 'goal':
        return `<h1 class="disp slant">Main <span class="hl">goal?</span></h1><p class="lead">This sets your reps, rest times and plan style.</p>${optList(GOAL_OPTS, d.goal)}`;
      case 'level':
        return `<h1 class="disp slant">Your <span class="hl">level</span></h1><p class="lead">Be honest — you can change it any time.</p>${optList(LEVEL_OPTS, d.level)}`;
      case 'equipment':
        return `<h1 class="disp slant">What do you <span class="hl">have?</span></h1><p class="lead">Pick everything you can use. Bodyweight moves are always included.</p>
          ${optList(LIME.EQUIPMENT, d.equipment, true)}`;
      case 'days':
        return `<h1 class="disp slant">Days per <span class="hl">week</span></h1><p class="lead">This becomes your weekly goal. 3 is a great start.</p>
          <div class="grid-3">${[2, 3, 4, 5, 6].map((n) => `<button type="button" class="opt${d.days === n ? ' on' : ''}" data-opt="${n}" style="justify-content:center;flex-direction:column;gap:0;min-height:88px">
            <span class="disp" style="font-size:40px">${n}</span><small>days</small></button>`).join('')}</div>
          <p class="muted small" style="margin-top:14px">${{ 2: 'Two full-body sessions.', 3: 'Three full-body sessions (A, B, C).', 4: 'Upper / lower split.', 5: 'Push, pull, legs, upper, conditioning.', 6: 'Push, pull, legs — twice.' }[d.days]}</p>`;
      case 'minutes':
        return `<h1 class="disp slant">How <span class="hl">long?</span></h1><p class="lead">Per session, including rests.</p>
          ${optList([
            { id: 20, label: '20 minutes', sub: 'Quick and focused · 4 exercises', icon: 'bolt' },
            { id: 30, label: '30 minutes', sub: 'Balanced · 5 exercises', icon: 'clock' },
            { id: 45, label: '45 minutes', sub: 'Thorough · 6 exercises', icon: 'target' },
            { id: 60, label: '60 minutes', sub: 'Full session · 7 exercises', icon: 'trophy' }
          ], d.minutes)}`;
      case 'body':
        return `<h1 class="disp slant">Units &amp; <span class="hl">weight</span></h1><p class="lead">Weight is optional — it starts your progress chart.</p>
          <div class="stack">
            <div class="seg" role="radiogroup" aria-label="Units">
              <button type="button" data-unit="kg" class="${d.units === 'kg' ? 'on' : ''}">Kilograms</button>
              <button type="button" data-unit="lb" class="${d.units === 'lb' ? 'on' : ''}">Pounds</button>
            </div>
            <label class="field"><span>Body weight (${d.units}) · optional</span>
              <input class="input input-big" id="ob-bw" inputmode="decimal" value="${U.esc(d.bodyWeight)}" placeholder="—"></label>
          </div>`;
      case 'review': {
        const prof = toProfile();
        const plan = LIME.planner.build(prof);
        const first = plan.days[0];
        const goal = GOAL_OPTS.find((g) => g.id === d.goal);
        const level = LEVEL_OPTS.find((l) => l.id === d.level);
        const eq = d.equipment.filter((e) => e !== 'none').map((e) => LIME.EQUIPMENT.find((x) => x.id === e).label);
        return `<h1 class="disp slant">Your <span class="hl">plan</span></h1>
          <p class="lead">${U.esc(d.days)}× a week, about ${U.esc(d.minutes)} minutes each. Here's how it's worked out:</p>
          <div class="card">
            <div class="review-row"><span>Name</span><span>${U.esc(d.name)}</span></div>
            <div class="review-row"><span>Goal</span><span>${U.esc(goal ? goal.label : '')}</span></div>
            <div class="review-row"><span>Level</span><span>${U.esc(level ? level.label : '')}</span></div>
            <div class="review-row"><span>Equipment</span><span>${U.esc(eq.length ? eq.join(', ') : 'Bodyweight only')}</span></div>
            <div class="review-row"><span>Week</span><span>${U.esc(plan.days.map((x) => x.title).join(' · '))}</span></div>
          </div>
          <div class="section-title"><h2>Day 1 · ${U.esc(first.title)}</h2><span class="muted small">~${U.esc(U.fmtDur(LIME.planner.estimate(first)))}</span></div>
          <div class="card">${first.items.map((it) => {
            const ex = LIME.ex(it.exId);
            return `<div class="list-row"><span class="grow">${U.esc(ex.name)}${it.warmup ? ' <span class="tag">Warm-up</span>' : it.cooldown ? ' <span class="tag">Cool-down</span>' : ''}</span>
              <span class="muted small">${it.sets} × ${it.secs ? it.secs + ' s' : it.reps}</span></div>`;
          }).join('')}</div>
          <p class="muted small" style="margin-top:12px">Reps and rest come from your goal (${U.esc(goal ? goal.label.toLowerCase() : '')}); exercises are the hardest version your level and equipment allow.</p>`;
      }
    }
    return '';
  }

  function canContinue(key) {
    const d = draft;
    if (key === 'name') return d.name.trim().length > 0;
    if (key === 'goal') return !!d.goal;
    if (key === 'level') return !!d.level;
    if (key === 'equipment') return d.equipment.length > 0;
    if (key === 'body') return d.bodyWeight === '' || (Number(d.bodyWeight) > 20 && Number(d.bodyWeight) < 700);
    return true;
  }

  function toProfile() {
    const d = draft;
    const bw = d.bodyWeight === '' ? null : U.toKg(Number(d.bodyWeight), d.units);
    return {
      name: d.name.trim(), photo: d.photo, goal: d.goal || 'general', level: d.level || 'beginner',
      equipment: d.equipment.length ? d.equipment : ['none'], days: d.days, minutes: d.minutes,
      units: d.units, bodyWeight: bw, notes: '', createdAt: Date.now()
    };
  }

  function renderStep(view) {
    const key = STEPS[step];
    const pct = ((step + 1) / STEPS.length) * 100;
    view.innerHTML = `<div class="ob">
      <div class="ob-top">
        ${step > 0 ? `<button type="button" class="icon-btn plain" data-back aria-label="Back">${LIME.icon('back')}</button>` : '<span style="width:44px"></span>'}
        <div class="ob-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${step + 1}" aria-label="Step ${step + 1} of ${STEPS.length}"><i style="width:${pct}%"></i></div>
        <span class="muted small" style="min-width:44px;text-align:right">${step + 1}/${STEPS.length}</span>
      </div>
      <div class="ob-body">${stepBody(key)}</div>
      <div class="ob-foot">
        <button type="button" class="btn btn-primary btn-block btn-lg btn-disp" data-continue ${canContinue(key) ? '' : 'disabled'}>${key === 'review' ? 'Build my plan' : 'Continue'}</button>
      </div>
    </div>`;
    wire(view, key);
  }

  function refreshContinue(view, key) {
    const b = U.$('[data-continue]', view);
    if (b) b.disabled = !canContinue(key);
  }

  function wire(view, key) {
    const back = U.$('[data-back]', view);
    if (back) back.onclick = () => { step--; renderStep(view); };
    U.$('[data-continue]', view).onclick = () => {
      if (!canContinue(key)) return;
      if (key === 'review') return finish();
      step++; renderStep(view); window.scrollTo(0, 0);
    };

    if (key === 'name') {
      const inp = U.$('#ob-name', view);
      inp.addEventListener('input', () => { draft.name = inp.value; refreshContinue(view, key); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && canContinue(key)) { step++; renderStep(view); } });
      U.$('#ob-photo', view).addEventListener('change', async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        try { draft.photo = await LIME.app.shrinkPhoto(f); renderStep(view); } catch (err) { LIME.toast('Couldn\'t use that photo', { kind: 'bad', body: 'Try a JPG or PNG.' }); }
      });
      U.$('[data-demo]', view).onclick = startDemo;
      U.$('#ob-restore', view).onchange = (e) => LIME.settings.restoreFrom(e.target);
    }

    if (key === 'goal' || key === 'level' || key === 'minutes') {
      U.$$('[data-opt]', view).forEach((b) => b.onclick = () => {
        const v = b.getAttribute('data-opt');
        draft[key] = key === 'minutes' ? Number(v) : v;
        renderStep(view);
        if (key !== 'minutes') setTimeout(() => { step++; renderStep(view); window.scrollTo(0, 0); }, 180);
      });
    }

    if (key === 'equipment') {
      U.$$('[data-opt]', view).forEach((b) => b.onclick = () => {
        const v = b.getAttribute('data-opt');
        let eq = draft.equipment.slice();
        if (v === 'none') eq = ['none'];
        else {
          eq = eq.filter((x) => x !== 'none');
          eq = eq.includes(v) ? eq.filter((x) => x !== v) : eq.concat(v);
          if (v === 'barbell' && eq.includes('barbell') && !eq.includes('bench')) eq.push('bench');
          if (!eq.length) eq = ['none'];
        }
        draft.equipment = eq;
        renderStep(view);
      });
    }

    if (key === 'days') {
      U.$$('[data-opt]', view).forEach((b) => b.onclick = () => { draft.days = Number(b.getAttribute('data-opt')); renderStep(view); });
    }

    if (key === 'body') {
      U.$$('[data-unit]', view).forEach((b) => b.onclick = () => {
        const nu = b.getAttribute('data-unit');
        if (nu !== draft.units && draft.bodyWeight !== '') {
          const kg = U.toKg(Number(draft.bodyWeight), draft.units);
          draft.bodyWeight = String(Math.round(U.kgTo(kg, nu) * 10) / 10);
        }
        draft.units = nu; renderStep(view);
      });
      const bw = U.$('#ob-bw', view);
      bw.addEventListener('input', () => { draft.bodyWeight = bw.value.replace(',', '.').trim(); refreshContinue(view, key); });
    }
  }

  function finish() {
    const prof = toProfile();
    const plan = LIME.planner.build(prof);
    LIME.store.update((s) => {
      s.profile = prof;
      s.plan = plan;
      s.ui.introSeen = true;
      s.ui.lastVersionSeen = LIME.VERSION;
      if (prof.bodyWeight) s.bodyLog.push({ date: U.dayKey(), kg: Math.round(prof.bodyWeight * 10) / 10 });
    });
    draft = null; step = 0;
    location.hash = '#/home';
    LIME.toast('Plan ready', { kind: 'good', body: `${plan.days.length} workouts a week · ~${prof.minutes} min` });
  }

  // ---------- Demo mode ----------
  function startDemo() {
    const prof = { name: 'Alex', photo: null, goal: 'muscle', level: 'intermediate', equipment: ['dumbbell', 'bench', 'pullup'], days: 3, minutes: 45, units: 'kg', bodyWeight: 78, notes: '', createdAt: Date.now() };
    const plan = LIME.planner.build(prof);
    const sessions = [];
    const bodyLog = [];
    const now = new Date();
    for (let w = 7; w >= 0; w--) {
      const ws = U.addDays(U.weekStart(now), -7 * w);
      const daysThisWeek = w === 0 ? [0] : w === 3 ? [1, 4] : [0, 2, 4];
      daysThisWeek.forEach((off, i) => {
        const d = U.addDays(ws, off); d.setHours(18, 10, 0, 0);
        if (d > now) return;
        const day = plan.days[(sessions.length) % plan.days.length];
        const sets = [];
        let vol = 0;
        day.items.forEach((it) => {
          const ex = LIME.ex(it.exId);
          for (let k = 0; k < it.sets; k++) {
            const prog = (7 - w) * 0.5;
            const kg = ex.weighted ? Math.round((12 + prog + (ex.group === 'legs' ? 6 : 0)) * 2) / 2 : 0;
            const reps = it.reps ? it.reps + (k === 0 && w < 3 ? 1 : 0) : 0;
            sets.push({ exId: it.exId, setNo: k + 1, reps, secs: it.secs || 0, kg, done: true });
            vol += kg * reps;
          }
        });
        const dur = 40 * 60 + i * 120;
        sessions.push({ id: U.uid(), dayId: day.id, title: day.title, start: d.getTime() - dur * 1000, end: d.getTime(), durationSec: dur, sets, volumeKg: Math.round(vol), prs: [] });
      });
      bodyLog.push({ date: U.dayKey(U.addDays(ws, 1)), kg: Math.round((80.4 - (7 - w) * 0.3) * 10) / 10 });
    }
    LIME.store.update((s) => {
      s.profile = prof; s.plan = plan; s.sessions = sessions; s.bodyLog = bodyLog;
      s.plan.next = sessions.length % plan.days.length;
      s.ui.introSeen = true; s.ui.demo = true; s.ui.lastVersionSeen = LIME.VERSION;
      s.prs = {};
      sessions.forEach((x) => LIME.stats.recordPRs(x));
    });
    draft = null; step = 0;
    location.hash = '#/home';
    LIME.toast('Demo mode on', { body: 'Sample data. Erase it in Settings.', action: { label: 'Settings', fn: () => { location.hash = '#/settings'; } } });
  }

  LIME.onboarding = {
    render(view) {
      if (!LIME.store.state.ui.introSeen) return renderIntro(view);
      if (!draft) { draft = freshDraft(); step = 0; }
      renderStep(view);
    },
    startDemo,
    _reset() { draft = null; step = 0; }
  };
})();
