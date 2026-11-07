/* Progress: totals, weekly chart, 12-week calendar, body weight, records,
   workout history (with delete + Undo). */
(function () {
  'use strict';

  const U = LIME.U;
  const st = () => LIME.store.state;
  let metric = 'volume';

  function render(view, parts) {
    const s = st();
    const units = s.profile.units;
    const tot = LIME.stats.totals();
    const weeks = LIME.stats.weekly(8, metric).map((w) => Object.assign(w, { value: metric === 'volume' ? Math.round(U.kgTo(w.value, units)) : w.value }));
    const heat = LIME.stats.heat(12);
    const bw = s.bodyLog.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const prs = Object.entries(s.prs).filter(([id, p]) => LIME.ex(id) && p.date).sort((a, b) => b[1].date - a[1].date).slice(0, 8);
    const hist = s.sessions.slice().reverse().slice(0, 15);

    view.innerHTML = `
      <header class="page-hd"><h1 class="disp slant">Prog<span class="hl">ress</span></h1>
        <p class="sub">${tot.workouts ? `${U.plural(tot.workouts, 'workout')} since ${U.esc(U.fmtDate(s.sessions[0].end, { day: 'numeric', month: 'short', year: 'numeric' }))}` : 'Your numbers show up after your first workout.'}</p></header>

      <div class="grid-2">
        <div class="stat"><div class="num hl">${LIME.stats.weekStreak()}</div><div class="lbl">Week streak</div></div>
        <div class="stat"><div class="num">${tot.workouts}</div><div class="lbl">Workouts</div></div>
        <div class="stat"><div class="num">${U.esc(U.fmtNum(Math.round(tot.seconds / 3600 * 10) / 10, 1))}</div><div class="lbl">Hours trained</div></div>
        <div class="stat"><div class="num">${U.esc(U.fmtNum(Math.round(U.kgTo(tot.volumeKg, units) / 1000 * 10) / 10, 1))}k</div><div class="lbl">${units} lifted</div></div>
      </div>

      <div class="section-title"><h2>Weekly</h2></div>
      <div class="card">
        <div class="seg" role="radiogroup" aria-label="Chart shows" style="margin-bottom:12px">
          <button type="button" data-m="volume" class="${metric === 'volume' ? 'on' : ''}">Volume</button>
          <button type="button" data-m="minutes" class="${metric === 'minutes' ? 'on' : ''}">Minutes</button>
          <button type="button" data-m="count" class="${metric === 'count' ? 'on' : ''}">Workouts</button>
        </div>
        ${LIME.charts.bars(weeks, { label: 'Weekly ' + metric, fmt: (v) => U.fmtNum(v) })}
        <p class="tiny muted" style="margin:6px 0 0">${metric === 'volume' ? `Volume = weight × reps, in ${units}. Bodyweight moves count 0.` : metric === 'minutes' ? 'Minutes trained each week.' : 'Workouts finished each week.'}</p>
      </div>

      <div class="section-title"><h2>Last 12 weeks</h2><span class="tiny muted">Mon → Sun</span></div>
      <div class="card"><div class="heat" style="--cols:12" aria-label="Training calendar">${heat.map((c) => `<i class="${c.future ? 'future' : c.lvl ? 'l' + c.lvl : ''}" title="${c.key}"></i>`).join('')}</div></div>

      <div class="section-title"><h2>Body weight</h2><button type="button" class="link-btn" data-log-bw>+ Log</button></div>
      <div class="card">${bw.length
        ? `${LIME.charts.line(bw.slice(-20).map((x) => ({ x: U.fmtDate(x.date + 'T12:00'), y: Math.round(U.kgTo(x.kg, units) * 10) / 10 })), { label: 'Body weight', fmt: (v) => `${U.fmtNum(v, 1)} ${units}` })}
           ${bw.length > 1 ? `<p class="small muted" style="margin:8px 0 0">${changeText(bw, units)}</p>` : ''}`
        : `<div class="empty" style="padding:20px">No entries yet.<br><button type="button" class="btn" style="margin-top:12px" data-log-bw>Log body weight</button></div>`}</div>

      <div class="section-title"><h2>Records</h2></div>
      <div class="card">${prs.length ? prs.map(([id, p]) => `<div class="list-row"><span class="ico hl">${LIME.icon('trophy')}</span>
          <span class="grow"><strong>${U.esc(LIME.ex(id).name)}</strong><br><span class="tiny muted">${U.esc(U.fmtDate(p.date))}</span></span>
          <span class="v">${p.kg ? `${U.esc(U.fmtNum(U.kgTo(p.kg, units), 1))}<span class="small muted"> ${units} × ${p.reps}</span>` : p.maxSecs ? `${p.maxSecs}<span class="small muted"> s</span>` : `${p.maxReps}<span class="small muted"> reps</span>`}</span></div>`).join('')
        : '<p class="muted" style="margin:0">Finish a workout to set your first records.</p>'}</div>

      <div class="section-title"><h2>History</h2></div>
      <div class="card">${hist.length ? hist.map((h) => `<button type="button" class="list-row" data-sess="${h.id}" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left;color:inherit">
          <span class="grow"><strong>${U.esc(h.title)}</strong><br><span class="tiny muted">${U.esc(U.fmtDate(h.end, { weekday: 'short', day: 'numeric', month: 'short' }))} · ${U.esc(U.fmtDur(h.durationSec))} · ${U.plural(h.sets.length, 'set')}</span></span>
          ${h.prs && h.prs.length ? `<span class="pr-pill">${h.prs.length} PR</span>` : ''}
          <span class="ico chev muted">${LIME.icon('chev')}</span></button>`).join('')
        : '<p class="muted" style="margin:0">No workouts yet.</p>'}</div>
    `;

    U.$$('[data-m]', view).forEach((b) => b.onclick = () => { metric = b.getAttribute('data-m'); render(view); });
    U.$$('[data-log-bw]', view).forEach((b) => b.onclick = () => logWeight(view));
    U.$$('[data-sess]', view).forEach((b) => b.onclick = () => sessionSheet(b.getAttribute('data-sess'), view));
    if (parts && parts[1] === 'weight') { history.replaceState(null, '', '#/progress'); logWeight(view); }
  }

  function changeText(bw, units) {
    const first = bw[0], last = bw[bw.length - 1];
    const d = U.kgTo(last.kg - first.kg, units);
    const r = Math.round(d * 10) / 10;
    return r === 0 ? `No change since ${U.fmtDate(first.date + 'T12:00')}.` : `${r > 0 ? '+' : '−'}${U.fmtNum(Math.abs(r), 1)} ${units} since ${U.fmtDate(first.date + 'T12:00')}.`;
  }

  function logWeight(view) {
    const s = st();
    const units = s.profile.units;
    const last = s.bodyLog.length ? s.bodyLog[s.bodyLog.length - 1].kg : s.profile.bodyWeight;
    const sh = LIME.sheet.open({
      title: 'Body weight',
      body: `<label class="field"><span>Today (${units})</span>
          <input class="input input-big" id="bw-in" inputmode="decimal" value="${last ? U.esc(Math.round(U.kgTo(last, units) * 10) / 10) : ''}" autofocus></label>
          <p class="tiny muted">Weigh at the same time of day for a fair trend. One entry per day; a new one replaces today's.</p>`,
      foot: '<button type="button" class="btn btn-primary btn-block btn-lg" data-save>Save</button>'
    });
    U.$('[data-save]', sh.el).onclick = () => {
      const v = Number(U.$('#bw-in', sh.el).value.replace(',', '.'));
      if (!(v > 20 && v < 700)) { LIME.toast('Check the number', { kind: 'bad', body: `Enter your weight in ${units}.` }); return; }
      const kg = Math.round(U.toKg(v, units) * 10) / 10;
      const today = U.dayKey();
      const prev = s.bodyLog.find((x) => x.date === today);
      const prevKg = prev ? prev.kg : null;
      LIME.store.update((x) => {
        const e = x.bodyLog.find((y) => y.date === today);
        if (e) e.kg = kg; else x.bodyLog.push({ date: today, kg });
      });
      sh.close(true);
      if (location.hash.startsWith('#/progress')) render(view);
      LIME.toast('Weight logged', { body: `${U.fmtNum(v, 1)} ${units} · today`, undo: () => {
        LIME.store.update((x) => {
          const i = x.bodyLog.findIndex((y) => y.date === today);
          if (i < 0) return;
          if (prevKg != null) x.bodyLog[i].kg = prevKg; else x.bodyLog.splice(i, 1);
        });
        if (location.hash.startsWith('#/progress')) render(view);
      } });
    };
  }

  function sessionSheet(id, view) {
    const s = st();
    const sess = s.sessions.find((x) => x.id === id);
    if (!sess) return;
    const units = s.profile.units;
    const groups = [];
    sess.sets.forEach((x) => {
      let g = groups.find((y) => y.exId === x.exId);
      if (!g) { g = { exId: x.exId, sets: [] }; groups.push(g); }
      g.sets.push(x);
    });
    const sh = LIME.sheet.open({
      title: sess.title,
      body: `<p class="muted" style="margin-top:0">${U.esc(U.fmtDate(sess.end, { weekday: 'long', day: 'numeric', month: 'long' }))} · ${U.esc(U.fmtDur(sess.durationSec))}${sess.volumeKg ? ` · ${U.esc(U.fmtNum(U.kgTo(sess.volumeKg, units)))} ${units}` : ''}</p>
        ${groups.map((g) => {
          const ex = LIME.ex(g.exId);
          return `<div class="card" style="margin-bottom:10px"><strong>${U.esc(ex ? ex.name : g.exId)}</strong>
            <div class="small muted" style="margin-top:4px">${g.sets.map((x) => x.secs ? `${x.secs} s` : x.kg ? `${U.fmtNum(U.kgTo(x.kg, units), 1)} × ${x.reps}` : `${x.reps} reps`).join(' · ')}</div></div>`;
        }).join('')}`,
      foot: '<button type="button" class="btn btn-danger btn-block" data-del>Delete workout</button>'
    });
    U.$('[data-del]', sh.el).onclick = () => {
      const idx = s.sessions.findIndex((x) => x.id === id);
      const removed = s.sessions[idx];
      const prsBefore = JSON.parse(JSON.stringify(s.prs));
      LIME.store.update((x) => { x.sessions.splice(idx, 1); rebuildPRs(x); });
      sh.close(true);
      render(view);
      LIME.toast('Workout deleted', { body: removed.title, undo: () => {
        if (st().sessions.some((x) => x.id === removed.id)) return;
        LIME.store.update((x) => {
          x.sessions.push(removed);
          x.sessions.sort((a, b) => a.end - b.end);
          x.prs = prsBefore;
        });
        if (location.hash.startsWith('#/progress')) render(view);
      } });
    };
  }

  /** Records must follow the history, so rebuild them after a delete. */
  function rebuildPRs(x) {
    x.prs = {};
    x.sessions.forEach((sess) => LIME.stats.recordPRs(sess));
  }

  LIME.progress = { render, logWeight };
})();
