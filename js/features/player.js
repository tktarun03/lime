/* Full-screen workout player.
   Work set → log (kg/reps or timed) → rest timer → next set … → summary.
   The workout in progress is saved in state.active after every step, so a
   reload, crash or locked phone can carry on where it left off. */
(function () {
  'use strict';

  const U = LIME.U;
  const st = () => LIME.store.state;

  let view = null;
  let clockIv = null;
  let restTimer = null;
  let workTimer = null;
  let draftKg = null;
  let draftReps = null;

  // ---------- Lifecycle ----------
  async function start(dayId) {
    const s = st();
    const day = s.plan.days.find((d) => d.id === dayId) || LIME.home.nextDay();
    if (!day) return;
    if (s.active && s.active.dayId !== day.id) {
      const ok = await LIME.sheet.confirm('Replace workout?', `You have "${s.active.title}" in progress. Starting a new one discards it.`, 'Start new', true);
      if (!ok) { location.hash = '#/workout'; return; }
    }
    if (!s.active || s.active.dayId !== day.id) {
      LIME.store.update((x) => {
        x.active = {
          dayId: day.id, title: day.title, startedAt: Date.now(),
          items: JSON.parse(JSON.stringify(day.items)),
          idx: 0, setIdx: 0, log: [], phase: 'work', restEndAt: null, restTotal: 0, needsCountdown: true
        };
      });
    }
    location.hash = '#/workout';
  }

  function cleanup() {
    clearInterval(clockIv); clockIv = null;
    if (restTimer) { restTimer.stop(); restTimer = null; }
    if (workTimer) { workTimer.stop(); workTimer = null; }
    LIME.wake.off();
  }

  function render(v) {
    view = v;
    const a = st().active;
    if (!a) { location.hash = '#/home'; return; }
    if (st().settings.keepAwake) LIME.wake.on();
    clearInterval(clockIv);
    clockIv = setInterval(tickClock, 1000);
    LIME.app.setCleanup(cleanup);

    if (a.needsCountdown && st().settings.countdown) {
      LIME.store.update((x) => { x.active.needsCountdown = false; });
      drawWork();
      return countdown(() => {});
    }
    if (a.phase === 'rest') {
      const left = (a.restEndAt - Date.now()) / 1000;
      if (left > 0.5) { drawWork(); return showRest(left); }
      LIME.store.update((x) => { x.active.phase = 'work'; });
    }
    drawWork();
  }

  function tickClock() {
    const a = st().active;
    const el = view && U.$('.pl-clock', view);
    if (a && el) el.textContent = U.fmtClock(LIME.timer.elapsed(a.startedAt));
  }

  // ---------- Helpers ----------
  function cur() {
    const a = st().active;
    const it = a.items[a.idx];
    return { a, it, ex: LIME.ex(it.exId) };
  }
  const units = () => st().profile.units;
  const kgStep = () => (units() === 'lb' ? 5 : 2.5);

  function doneFor(idx) { const a = st().active; return a.log.filter((l) => l.itemIdx === idx).length; }

  function prefillKg(ex) {
    const a = st().active;
    const mine = a.log.filter((l) => l.exId === ex.id && l.kg > 0);
    if (mine.length) return mine[mine.length - 1].kg;
    return LIME.stats.lastKg(ex.id);
  }

  function nextLabel() {
    const a = st().active;
    const it = a.items[a.idx];
    if (a.setIdx + 1 < it.sets) return `${LIME.ex(it.exId).name} · set ${a.setIdx + 2} of ${it.sets}`;
    const n = a.items[a.idx + 1];
    return n ? `${LIME.ex(n.exId).name} · ${n.sets} × ${n.secs ? n.secs + ' s' : n.reps}` : 'Finish';
  }

  // ---------- Work screen ----------
  function drawWork() {
    const { a, it, ex } = cur();
    const total = a.items.length;
    const isTime = !!it.secs;
    const weighted = !!ex.weighted;
    if (draftKg == null || draftKg.exId !== ex.id) draftKg = { exId: ex.id, kg: prefillKg(ex) };
    if (draftReps == null || draftReps.key !== `${a.idx}:${a.setIdx}`) draftReps = { key: `${a.idx}:${a.setIdx}`, reps: it.reps || 0 };
    const kgShown = Math.round(U.kgTo(draftKg.kg, units()) * 10) / 10;

    const bar = a.items.map((_, i) => {
      const cls = i < a.idx ? 'done' : i === a.idx ? 'cur' : '';
      const p = i === a.idx ? Math.round((a.setIdx / a.items[i].sets) * 100) : 0;
      return `<i class="${cls}" ${cls === 'cur' ? `style="--p:${p}%"` : ''}></i>`;
    }).join('');

    const label = it.warmup ? 'Warm-up' : it.cooldown ? 'Cool-down' : `Exercise ${a.items.filter((x, i) => i <= a.idx && !x.warmup && !x.cooldown).length} of ${a.items.filter((x) => !x.warmup && !x.cooldown).length}`;

    view.innerHTML = `<div class="player" role="region" aria-label="Workout">
      <div class="pl-top">
        <button type="button" class="icon-btn plain" data-quit aria-label="End workout">${LIME.icon('x')}</button>
        <div class="pl-bar" aria-hidden="true">${bar}</div>
        <span class="pl-clock" aria-label="Elapsed time">${U.fmtClock(LIME.timer.elapsed(a.startedAt))}</span>
      </div>
      <div class="pl-main">
        <div class="stage">${LIME.media(ex, { three: true })}
          <button type="button" class="icon-btn" data-info aria-label="How to do ${U.esc(ex.name)}" style="position:absolute;right:10px;top:10px">${LIME.icon('info')}</button></div>
        <div class="eyebrow" style="margin-top:14px">${U.esc(label)}</div>
        <h1 class="disp slant pl-name">${U.esc(ex.name)}</h1>
        <div class="pl-target">
          <span class="big" id="pl-big">${isTime ? U.esc(it.secs) : U.esc(it.reps)}</span>
          <span class="unit">${isTime ? 'sec' : 'reps'}${weighted && draftKg.kg ? ` <span class="muted">@ ${U.esc(kgShown)} ${units()}</span>` : ''}</span>
        </div>
        <div class="sets" aria-label="Sets">${Array.from({ length: it.sets }, (_, i) =>
          `<span class="${i < a.setIdx ? 'done' : i === a.setIdx ? 'cur' : ''}">${i < a.setIdx ? LIME.icon('check').replace('<svg', '<svg width="14" height="14"') : 'SET ' + (i + 1)}</span>`).join('')}</div>
        ${!isTime ? `<div class="${weighted ? 'grid-2' : ''}" style="margin-top:14px">
          ${weighted ? `<div><div class="stepper">
              <button type="button" data-kg="-1" aria-label="Less weight">−</button>
              <input id="pl-kg" inputmode="decimal" value="${U.esc(kgShown)}" aria-label="Weight in ${units()}">
              <button type="button" data-kg="1" aria-label="More weight">+</button></div>
              <div class="stepper-lbl">${units().toUpperCase()}</div></div>` : ''}
          <div><div class="stepper">
              <button type="button" data-rep="-1" aria-label="One rep fewer">−</button>
              <input id="pl-reps" inputmode="numeric" value="${U.esc(draftReps.reps)}" aria-label="Reps done">
              <button type="button" data-rep="1" aria-label="One more rep">+</button></div>
              <div class="stepper-lbl">REPS DONE</div></div>
        </div>` : ''}
        <div class="cue">${U.esc(ex.cue)}</div>
      </div>
      <div class="pl-foot">
        <button type="button" class="icon-btn" data-more aria-label="Swap or skip">${LIME.icon('swap')}</button>
        ${isTime
          ? `<button type="button" class="btn btn-primary btn-lg btn-disp" data-timer>${LIME.icon('play')} Start ${U.esc(it.secs)} s</button>`
          : `<button type="button" class="btn btn-primary btn-lg btn-disp" data-done>${LIME.icon('check')} Done set</button>`}
      </div>
    </div>`;

    LIME.body3d.hydrate(view);
    U.$('[data-quit]', view).onclick = quit;
    U.$('[data-info]', view).onclick = () => LIME.library.detail(ex.id);
    U.$('[data-more]', view).onclick = moreMenu;

    if (!isTime) {
      const repsIn = U.$('#pl-reps', view);
      repsIn.addEventListener('input', () => { draftReps.reps = Math.max(0, parseInt(repsIn.value, 10) || 0); });
      U.$$('[data-rep]', view).forEach((b) => b.onclick = () => {
        draftReps.reps = Math.max(0, (draftReps.reps || 0) + Number(b.getAttribute('data-rep')));
        repsIn.value = draftReps.reps;
      });
      if (weighted) {
        const kgIn = U.$('#pl-kg', view);
        const setKg = (shown) => {
          draftKg.kg = Math.max(0, U.toKg(shown, units()));
          const big = U.$('.pl-target .unit', view);
          if (big) big.innerHTML = `reps${draftKg.kg ? ` <span class="muted">@ ${U.esc(Math.round(shown * 10) / 10)} ${units()}</span>` : ''}`;
        };
        kgIn.addEventListener('input', () => setKg(Number(kgIn.value.replace(',', '.')) || 0));
        U.$$('[data-kg]', view).forEach((b) => b.onclick = () => {
          const shown = Math.max(0, Math.round(((Number(kgIn.value.replace(',', '.')) || 0) + kgStep() * Number(b.getAttribute('data-kg'))) * 10) / 10);
          kgIn.value = shown; setKg(shown);
        });
      }
      U.$('[data-done]', view).onclick = () => logSet({
        reps: Math.max(0, parseInt(U.$('#pl-reps', view).value, 10) || 0),
        kg: weighted ? draftKg.kg : 0
      });
    } else {
      U.$('[data-timer]', view).onclick = () => runTimed(it.secs);
    }

    if (a.setIdx === 0 && doneFor(a.idx) === 0) LIME.audio.say(`${ex.name}. ${it.sets} sets of ${isTime ? it.secs + ' seconds' : it.reps}.`);
  }

  // ---------- Timed sets ----------
  function runTimed(secs) {
    const big = U.$('#pl-big', view);
    const btn = U.$('[data-timer]', view);
    const startAt = Date.now();
    LIME.audio.go();
    btn.innerHTML = `${LIME.icon('check')} Done early`;
    btn.onclick = () => finishTimed(Math.round((Date.now() - startAt) / 1000));
    workTimer = LIME.timer.countdown({
      seconds: secs,
      onSecond(w) {
        if (big) big.textContent = w;
        if (w <= 3 && w > 0) LIME.audio.tick();
      },
      onDone() { finishTimed(secs); }
    });
  }

  function finishTimed(done) {
    if (workTimer) { workTimer.stop(); workTimer = null; }
    LIME.audio.done();
    logSet({ secs: Math.max(1, done) });
  }

  // ---------- Logging and moving on ----------
  function logSet(v) {
    const { a, it, ex } = cur();
    const entry = { exId: ex.id, itemIdx: a.idx, setNo: a.setIdx + 1, reps: v.reps || 0, secs: v.secs || 0, kg: Math.round((v.kg || 0) * 100) / 100, done: true, at: Date.now() };
    const lastOfItem = a.setIdx + 1 >= it.sets;
    const lastOverall = lastOfItem && a.idx + 1 >= a.items.length;
    LIME.store.update((x) => { x.active.log.push(entry); });
    if (lastOverall) return finish();
    const rest = it.rest || 0;
    advance();
    if (rest > 0) {
      LIME.store.update((x) => { x.active.phase = 'rest'; x.active.restEndAt = Date.now() + rest * 1000; x.active.restTotal = rest; });
      drawWork();
      showRest(rest);
    } else {
      drawWork();
    }
  }

  function advance() {
    LIME.store.update((x) => {
      const a = x.active;
      if (a.setIdx + 1 < a.items[a.idx].sets) a.setIdx++;
      else { a.idx++; a.setIdx = 0; }
    });
  }

  // ---------- Rest ----------
  function showRest(seconds) {
    const a = st().active;
    const total = a.restTotal || seconds;
    const C = 2 * Math.PI * 47;
    const el = document.createElement('div');
    el.className = 'rest tex';
    el.setAttribute('role', 'timer');
    el.innerHTML = `
      <div class="rest-dial">
        <svg class="rest-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" stroke="var(--line)"/>
          <circle id="rest-arc" cx="50" cy="50" r="47" stroke="var(--accent)" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 50 50)" stroke-linecap="round"/></svg>
        <div class="lbl">Rest</div>
        <div class="count" id="rest-count">${Math.ceil(seconds)}</div>
      </div>
      <div class="next">Next: ${U.esc(nextLabel())}</div>
      <div class="row">
        <button type="button" class="btn" data-add="-15">−15 s</button>
        <button type="button" class="btn" data-add="15">+15 s</button>
        <button type="button" class="btn btn-primary btn-disp" data-skip>Skip</button>
      </div>`;
    view.appendChild(el);
    LIME.audio.say(`Rest ${Math.round(seconds)} seconds. Next, ${nextLabel()}.`);
    const countEl = U.$('#rest-count', el);
    const arc = U.$('#rest-arc', el);
    let totalNow = total;

    const end = () => {
      if (restTimer) { restTimer.stop(); restTimer = null; }
      el.remove();
      LIME.store.update((x) => { if (x.active) { x.active.phase = 'work'; x.active.restEndAt = null; } });
      drawWork();
    };
    restTimer = LIME.timer.countdown({
      seconds,
      onTick(r) { arc.setAttribute('stroke-dashoffset', String(C * (1 - r / totalNow))); },
      onSecond(w) { countEl.textContent = U.fmtClock(w).replace(/^0:/, ''); if (w <= 3 && w > 0) LIME.audio.tick(); },
      onDone() { LIME.audio.go(); end(); }
    });
    U.$$('[data-add]', el).forEach((b) => b.onclick = () => {
      const d = Number(b.getAttribute('data-add'));
      restTimer.add(d);
      totalNow = Math.max(1, totalNow + d);
      LIME.store.update((x) => { x.active.restEndAt = restTimer.endAt; x.active.restTotal = totalNow; });
    });
    U.$('[data-skip]', el).onclick = end;
  }

  // ---------- 3-2-1 ----------
  function countdown(then) {
    const el = document.createElement('div');
    el.className = 'countdown';
    el.setAttribute('role', 'timer');
    view.appendChild(el);
    let n = 3;
    const step = () => {
      if (n === 0) { LIME.audio.go(); el.innerHTML = '<div class="n">GO</div>'; setTimeout(() => { el.remove(); then(); }, 600); return; }
      LIME.audio.tick();
      el.innerHTML = `<div class="n">${n}</div>`;
      n--; setTimeout(step, 900);
    };
    el.addEventListener('click', () => { el.remove(); then(); }, { once: true });
    step();
  }

  // ---------- Swap / skip ----------
  function moreMenu() {
    const { a, it, ex } = cur();
    const alts = LIME.planner.alternatives(ex.id, st().profile);
    LIME.sheet.open({
      title: 'Change it up',
      body: `<div class="opts">
        <button type="button" class="opt" data-skip-ex><span class="opt-ico">${LIME.icon('skip')}</span>
          <span class="grow"><strong>Skip ${U.esc(ex.name)}</strong><small>Move to the next exercise</small></span></button>
      </div>
      ${alts.length ? `<div class="section-title"><h2>Swap for</h2></div><div class="ex-list">${alts.map((x) => `
        <button type="button" class="ex-item" data-swap="${x.id}"><span class="ex-thumb">${LIME.media(x, { still: true })}</span>
          <span class="grow"><strong>${U.esc(x.name)}</strong><small>${x.id === ex.easier ? 'Easier · ' : x.id === ex.harder ? 'Harder · ' : ''}${U.esc(x.muscles.join(' · '))}</small></span></button>`).join('')}</div>` : ''}`,
      onOpen(el, api) {
        U.$('[data-skip-ex]', el).onclick = () => {
          api.close(true);
          if (a.idx + 1 >= a.items.length) return finish();
          const prevIdx = a.idx, prevSet = a.setIdx;
          LIME.store.update((x) => { x.active.idx++; x.active.setIdx = 0; });
          drawWork();
          LIME.toast(`Skipped ${ex.name}`, { undo: () => {
            if (!st().active || st().active.idx !== prevIdx + 1) return;
            LIME.store.update((x) => { x.active.idx = prevIdx; x.active.setIdx = prevSet; });
            drawWork();
          } });
        };
        U.$$('[data-swap]', el).forEach((b) => b.onclick = () => {
          const nx = LIME.ex(b.getAttribute('data-swap'));
          const old = Object.assign({}, it);
          LIME.store.update((x) => {
            const t = x.active.items[x.active.idx];
            t.exId = nx.id;
            if (nx.type === 'time') { t.secs = t.secs || nx.secs || 30; delete t.reps; } else { t.reps = t.reps || nx.reps || 10; delete t.secs; }
          });
          api.close(true);
          draftKg = null; draftReps = null;
          drawWork();
          LIME.toast(`Swapped to ${nx.name}`, { undo: () => {
            if (!st().active) return;
            LIME.store.update((x) => { x.active.items[x.active.idx] = old; });
            draftKg = null; draftReps = null; drawWork();
          } });
        });
      }
    });
  }

  // ---------- Quit ----------
  function quit() {
    const a = st().active;
    const hasSets = a.log.length > 0;
    LIME.sheet.open({
      title: 'End workout?',
      body: `<p class="muted" style="margin-top:0">${hasSets ? `You've logged ${U.plural(a.log.length, 'set')}.` : 'Nothing logged yet.'}</p>
        <div class="opts">
          <button type="button" class="opt" data-keep><span class="opt-ico">${LIME.icon('play')}</span><span class="grow"><strong>Keep going</strong></span></button>
          ${hasSets ? `<button type="button" class="opt" data-save><span class="opt-ico">${LIME.icon('check')}</span><span class="grow"><strong>Finish and save</strong><small>Counts toward your week</small></span></button>` : ''}
          <button type="button" class="opt" data-later><span class="opt-ico">${LIME.icon('clock')}</span><span class="grow"><strong>Pause for later</strong><small>Resume from Home</small></span></button>
          <button type="button" class="opt" data-discard><span class="opt-ico" style="color:var(--bad)">${LIME.icon('trash')}</span><span class="grow"><strong>Discard</strong><small>Delete this workout</small></span></button>
        </div>`,
      onOpen(el, api) {
        U.$('[data-keep]', el).onclick = () => api.close(true);
        const save = U.$('[data-save]', el);
        if (save) save.onclick = () => { api.close(true); finish(); };
        U.$('[data-later]', el).onclick = () => { api.close(true); cleanup(); location.hash = '#/home'; };
        U.$('[data-discard]', el).onclick = () => {
          api.close(true);
          const saved = JSON.parse(JSON.stringify(st().active));
          cleanup();
          LIME.store.update((x) => { x.active = null; });
          location.hash = '#/home';
          LIME.toast('Workout discarded', { undo: () => {
            if (st().active) return;
            LIME.store.update((x) => { x.active = saved; });
            location.hash = '#/workout';
          } });
        };
      }
    });
  }

  // ---------- Finish ----------
  function finish() {
    const a = st().active;
    cleanup();
    if (!a.log.length) {
      LIME.store.update((x) => { x.active = null; });
      location.hash = '#/home';
      LIME.toast('Nothing logged', { body: 'No sets were done, so nothing was saved.' });
      return;
    }
    const end = Date.now();
    const sets = a.log.map((l) => ({ exId: l.exId, setNo: l.setNo, reps: l.reps, secs: l.secs, kg: l.kg, done: true }));
    const volumeKg = Math.round(sets.reduce((s, x) => s + (x.kg || 0) * (x.reps || 0), 0));
    const session = { id: U.uid(), dayId: a.dayId, title: a.title, start: a.startedAt, end, durationSec: Math.round((end - a.startedAt) / 1000), sets, volumeKg, prs: [] };
    let prs = [];
    LIME.store.update((x) => {
      prs = LIME.stats.recordPRs(session);
      session.prs = prs;
      x.sessions.push(session);
      const n = x.plan.days.length;
      const idx = x.plan.days.findIndex((d) => d.id === a.dayId);
      x.plan.next = ((idx >= 0 ? idx : x.plan.next) + 1) % n;
      x.active = null;
    });
    LIME.toast.clear();
    LIME.audio.done();
    LIME.audio.say(prs.length ? `Workout done. ${prs.length} new personal record${prs.length > 1 ? 's' : ''}!` : 'Workout done. Great work.');
    drawDone(session, prs);
  }

  function drawDone(session, prs) {
    const wk = LIME.stats.thisWeek().length;
    const goal = LIME.stats.weeklyGoal();
    const vol = Math.round(U.kgTo(session.volumeKg, units()));
    view.innerHTML = `<div class="player tex"><div class="pl-main done-screen">
      <div class="eyebrow">${U.esc(session.title)}</div>
      <h1 class="disp slant" style="margin:10px 0">Workout<br><span class="hl">done</span></h1>
      <p class="muted">${wk >= goal ? `Weekly goal hit — ${wk} of ${goal}. 🔥` : `${wk} of ${goal} this week. ${goal - wk} to go.`}</p>
      <div class="grid-3" style="margin:20px 0">
        <div class="stat"><div class="num">${U.esc(U.fmtClock(session.durationSec))}</div><div class="lbl">Time</div></div>
        <div class="stat"><div class="num">${session.sets.length}</div><div class="lbl">Sets</div></div>
        <div class="stat"><div class="num">${vol ? U.esc(U.fmtNum(vol)) : '—'}</div><div class="lbl">${units()} lifted</div></div>
      </div>
      ${prs.length ? `<div class="section-title" style="justify-content:center"><h2>New records</h2></div>
        <div class="row" style="flex-wrap:wrap;justify-content:center">${prs.map((p) => `<span class="pr-pill">${LIME.icon('trophy').replace('<svg', '<svg width="14" height="14"')} ${U.esc(LIME.ex(p.exId).name)} · ${U.esc(p.text)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="pl-foot">
      <button type="button" class="btn btn-ghost btn-lg" data-share>${LIME.icon('share')} Share</button>
      <button type="button" class="btn btn-primary btn-lg btn-disp" data-home>Done</button>
    </div></div>`;
    U.$('[data-home]', view).onclick = () => { location.hash = '#/home'; };
    U.$('[data-share]', view).onclick = () => LIME.app.share(`Just finished ${session.title} on LIME: ${U.fmtClock(session.durationSec)}, ${session.sets.length} sets${vol ? `, ${U.fmtNum(vol)} ${units()} lifted` : ''}.${prs.length ? ` ${prs.length} new PR${prs.length > 1 ? 's' : ''}!` : ''} 💪`);
  }

  LIME.player = { start, render, cleanup };
})();
