/* Home: today's workout, weekly goal ring, streak, get-started checklist,
   the week's plan and a daily line of motivation. */
(function () {
  'use strict';

  const U = LIME.U;

  const LINES = [
    'Show up. The rest follows.', 'Small sets. Big habits.', 'Strong is built, not born.',
    'Done beats perfect.', 'One more rep than last time.', 'Discipline is remembering what you want.',
    'Train today. Thank yourself tomorrow.', 'Consistency is the cheat code.', 'Earn the rest day.',
    'Slow reps, strong body.', 'You never regret the workout.', 'Progress, not perfection.'
  ];

  function nextDay() {
    const p = LIME.store.state.plan;
    if (!p || !p.days.length) return null;
    return p.days[(p.next || 0) % p.days.length];
  }

  function dayCard(day, idx) {
    const first = day.items.find((x) => !x.warmup) || day.items[0];
    const ex = LIME.ex(first.exId);
    const n = day.items.filter((x) => !x.warmup && !x.cooldown).length;
    return `<section class="hero tex" aria-label="Today's workout">
      <div class="hero-fig">${LIME.media(ex, { three: true, ring: false })}</div>
      <div class="eyebrow">Next up · Day ${idx + 1}</div>
      <h2 class="disp slant" style="margin-top:6px">${U.esc(day.title.split(' ')[0])}<br><span class="hl">${U.esc(day.title.split(' ').slice(1).join(' ') || 'Workout')}</span></h2>
      <div class="meta"><span><b>${n}</b> moves</span><span>~<b>${U.esc(U.fmtDur(LIME.planner.estimate(day)))}</b></span><span>${U.esc(day.focus)}</span></div>
      <div class="row">
        <a href="#/start" class="btn btn-primary btn-lg btn-disp grow" data-start>${LIME.icon('play')} Start</a>
        <button type="button" class="btn btn-ghost btn-lg" data-preview="${day.id}">Preview</button>
      </div>
    </section>`;
  }

  function preview(dayId) {
    const s = LIME.store.state;
    const day = s.plan.days.find((d) => d.id === dayId);
    if (!day) return;
    const units = s.profile.units;
    LIME.sheet.open({
      title: day.title,
      body: `<p class="muted" style="margin-top:0">${U.esc(day.focus)} · ~${U.esc(U.fmtDur(LIME.planner.estimate(day)))}</p>
        <div class="ex-list">${day.items.map((it) => {
          const ex = LIME.ex(it.exId);
          const last = ex.weighted ? LIME.stats.lastKg(ex.id) : 0;
          const sg = s.settings.suggest !== false && !it.secs ? LIME.stats.suggest(ex.id, it.reps, units) : null;
          return `<button type="button" class="ex-item" data-ex="${ex.id}">
            <span class="ex-thumb">${LIME.media(ex, { still: true })}</span>
            <span class="grow"><strong>${U.esc(ex.name)}</strong>
              <small>${it.sets} × ${it.secs ? it.secs + ' s' : it.reps + ' reps'}${it.rest ? ` · rest ${it.rest} s` : ''}${sg ? ` · ${sg.kind === 'up' ? 'up to' : sg.kind === 'down' ? 'down to' : 'stay at'} ${U.fmtNum(U.kgTo(sg.kg, units), 1)} ${units}` : last ? ` · last ${U.fmtNum(U.kgTo(last, units), 1)} ${units}` : ''}</small>
              ${it.warmup ? '<span class="tag">Warm-up</span>' : it.cooldown ? '<span class="tag">Cool-down</span>' : ''}</span>
            <span class="ico chev">${LIME.icon('chev')}</span></button>`;
        }).join('')}</div>`,
      foot: `<button type="button" class="btn btn-primary btn-block btn-lg btn-disp" data-go>${LIME.icon('play')} Start ${U.esc(day.title)}</button>`,
      onOpen(el, api) {
        U.$$('[data-ex]', el).forEach((b) => b.onclick = () => LIME.library.detail(b.getAttribute('data-ex')));
        U.$('[data-go]', el).onclick = () => { api.close(true); LIME.player.start(day.id); };
      }
    });
  }

  function render(view) {
    const s = LIME.store.state;
    const p = s.profile;
    const day = nextDay();
    const idx = day ? s.plan.days.indexOf(day) : 0;
    const wk = LIME.stats.thisWeek().length;
    const goal = LIME.stats.weeklyGoal();
    const streak = LIME.stats.weekStreak();
    const tot = LIME.stats.totals();
    const prCount = Object.keys(s.prs).length;
    const list = LIME.stats.checklist();
    const showList = !s.ui.checklistHidden && list.some((x) => !x.done);
    const line = LINES[Math.floor(Date.now() / 864e5) % LINES.length];
    const initial = (p.name || '?').trim().charAt(0).toUpperCase();

    view.innerHTML = `
      <header class="home-hd">
        <div><div class="eyebrow">${U.esc(U.greet())}</div>
          <h1 class="disp slant">${U.esc(p.name)}</h1></div>
        <div class="row" style="gap:8px">
          <button type="button" class="icon-btn" data-refresh aria-label="Refresh and check for updates">${LIME.icon('refresh')}</button>
          <a href="#/settings/profile" class="avatar" aria-label="Profile">${p.photo ? `<img src="${p.photo}" alt="">` : U.esc(initial)}</a>
        </div>
      </header>

      ${s.active ? `<div class="card accent row" style="margin-bottom:12px">
          <span class="grow"><strong>Workout in progress</strong><br><span class="muted small">${U.esc(s.active.title)}</span></span>
          <a href="#/workout" class="btn btn-primary">Resume</a></div>` : ''}

      ${day ? dayCard(day, idx) : ''}

      <div class="card" style="margin-top:12px">
        <div class="ring-wrap">${LIME.charts.ring(wk / goal, `${wk}/${goal}`, 76)}
          <div class="grow"><div class="eyebrow">This week</div>
            <strong style="font-size:1.02rem">${wk >= goal ? 'Weekly goal hit!' : `${U.plural(goal - wk, 'workout')} to go`}</strong>
            <div class="week-dots">${LIME.stats.daysThisWeek().map((d) => `<span class="${d.done ? 'done' : ''}${d.today ? ' today' : ''}"><i></i>${d.label}</span>`).join('')}</div></div>
        </div>
      </div>
      <div class="grid-3" style="margin-top:10px">
        <div class="stat"><div class="num hl">${streak}</div><div class="lbl">Week streak</div></div>
        <div class="stat"><div class="num">${tot.workouts}</div><div class="lbl">Workouts</div></div>
        <div class="stat"><div class="num">${prCount}</div><div class="lbl">Records</div></div>
      </div>

      ${showList ? `<div class="section-title"><h2>Get started</h2><button type="button" class="link-btn" data-hide-list>Hide</button></div>
        <div class="card checklist">${list.map((x) => `<a class="item${x.done ? ' done' : ''}" href="${x.href}">
          <span class="tick">${x.done ? LIME.icon('check') : ''}</span><span class="txt grow">${U.esc(x.label)}</span>
          ${x.done ? '' : `<span class="ico chev muted">${LIME.icon('chev')}</span>`}</a>`).join('')}</div>` : ''}

      <div class="section-title"><h2>Your week</h2><a href="#/plan" class="link-btn">Edit</a></div>
      <div class="card">${s.plan.days.map((d, i) => `<a class="plan-day${d === day ? ' next' : ''}" href="#/home" data-preview="${d.id}">
          <span class="d">${i + 1}</span>
          <span class="grow"><strong>${U.esc(d.title)}</strong><br><span class="muted small">${U.esc(d.focus)} · ~${U.esc(U.fmtDur(LIME.planner.estimate(d)))}</span></span>
          <span class="ico chev muted">${LIME.icon('chev')}</span></a>`).join('')}</div>

      <div class="card tex" style="margin-top:12px"><div class="eyebrow">Today's line</div><p class="quote slant" style="margin:8px 0 0">${U.esc(line)}</p></div>
      <a class="credit" href="#/about">${U.esc(LIME.BRAND.tagline)} by <strong>${U.esc(LIME.BRAND.creator)}</strong></a>
    `;

    U.$('[data-refresh]', view).onclick = (e) => LIME.app.refresh(e.currentTarget);
    U.$$('[data-preview]', view).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); preview(b.getAttribute('data-preview')); }));
    const hide = U.$('[data-hide-list]', view);
    if (hide) hide.onclick = () => {
      LIME.store.update((st) => { st.ui.checklistHidden = true; });
      render(view);
      LIME.toast('Checklist hidden', { undo: () => { LIME.store.update((st) => { st.ui.checklistHidden = false; }); if (location.hash.startsWith('#/home')) render(view); } });
    };
  }

  LIME.home = { render, preview, nextDay };
})();
