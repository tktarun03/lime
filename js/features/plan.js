/* Plan editor.
   #/plan          — the week: days, next day, add day, skip, reset.
   #/plan/<dayId>  — one day: rename, add / swap / remove / reorder
                     exercises, change sets, reps or seconds, and rest.
   Every change saves at once, sets plan.edited (so profile changes no
   longer rebuild the plan) and shows a notice with Undo. Undo only applies
   if the plan hasn't changed since. A workout in progress keeps its own copy,
   so edits apply from the next workout. */
(function () {
  'use strict';

  const U = LIME.U;
  const st = () => LIME.store.state;
  const MAX_ITEMS = 15;
  const MAX_DAYS = 7;

  // ---------- Saving with Undo ----------
  function change(title, fn, body) {
    const before = JSON.stringify(st().plan);
    LIME.store.update((x) => { fn(x.plan); x.plan.edited = true; });
    const after = JSON.stringify(st().plan);
    LIME.app.route();
    LIME.toast(title, {
      body,
      undo: () => {
        if (JSON.stringify(st().plan) !== after) { LIME.toast("Couldn't undo", { kind: 'bad', body: 'The plan changed since.' }); return; }
        LIME.store.update((x) => { x.plan = JSON.parse(before); });
        if (location.hash.startsWith('#/plan')) LIME.app.route();
      }
    });
  }

  const dayById = (id) => st().plan.days.find((d) => d.id === id);
  const target = (it) => (it.secs ? `${it.secs} s` : `${it.reps} reps`);
  const header = (back, title, sub) => `
    <header class="sub-hd">
      <a href="${back}" class="icon-btn" aria-label="Back">${LIME.icon('back')}</a>
      <div class="grow"><h1 class="disp slant">${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
    </header>`;

  // ---------- Week ----------
  function renderWeek(view) {
    const plan = st().plan;
    const next = plan.next % plan.days.length;
    view.innerHTML = `
      ${header('#/home', 'Your <span class="hl">plan</span>', `${U.plural(plan.days.length, 'workout')} a week${plan.edited ? ' · edited by you' : ''}`)}
      <div class="stack">
        ${plan.days.map((d, i) => `
          <a class="card card-link plan-card${i === next ? ' next' : ''}" href="#/plan/${U.esc(d.id)}">
            <span class="d">${i + 1}</span>
            <span class="grow"><strong>${U.esc(d.title)}</strong>${i === next ? ' <span class="tag on">Up next</span>' : ''}
              <small>${U.esc(d.items.map((it) => LIME.ex(it.exId).name).join(' · '))}</small>
              <small class="muted">${U.plural(d.items.length, 'move')} · ~${U.esc(U.fmtDur(LIME.planner.estimate(d)))}</small></span>
            <span class="ico chev muted">${LIME.icon('chev')}</span>
          </a>`).join('')}
      </div>
      <div class="stack" style="margin-top:14px">
        ${plan.days.length < MAX_DAYS ? `<button type="button" class="btn btn-block" data-add-day>${LIME.icon('plus')} Add a workout day</button>` : ''}
        <button type="button" class="btn btn-ghost btn-block" data-skip-day>${LIME.icon('skip')} Make Day ${((next + 1) % plan.days.length) + 1} up next</button>
      </div>
      <div class="section-title"><h2>Start over</h2></div>
      <div class="card">
        <p class="small muted" style="margin:0 0 10px">Rebuild the plan from your goal, level, equipment, days and time. Your edits are replaced; workouts and records stay.</p>
        <button type="button" class="btn btn-danger btn-block" data-reset>Reset to suggested plan</button>
      </div>`;

    const add = U.$('[data-add-day]', view);
    if (add) add.onclick = () => {
      const id = 'd' + U.uid();
      change('Workout day added', (p) => {
        p.days.push({ id, key: 'custom', title: `Day ${p.days.length + 1}`, focus: 'Custom', items: [] });
      }, 'Open it to add exercises.');
      location.hash = '#/plan/' + id;
    };
    U.$('[data-skip-day]', view).onclick = () => {
      change(`Day ${((next + 1) % plan.days.length) + 1} is up next`, (p) => { p.next = (p.next + 1) % p.days.length; });
    };
    U.$('[data-reset]', view).onclick = async () => {
      const ok = await LIME.sheet.confirm('Reset plan?', 'Your edits to the plan are replaced with a fresh one. You can undo right after.', 'Reset', true);
      if (!ok) return;
      const before = JSON.stringify(st().plan);
      LIME.store.update((x) => { x.plan = LIME.planner.build(x.profile); });
      const after = JSON.stringify(st().plan);
      LIME.app.route();
      LIME.toast('Plan reset', { body: 'Starts again from Day 1', undo: () => {
        if (JSON.stringify(st().plan) !== after) return;
        LIME.store.update((x) => { x.plan = JSON.parse(before); });
        if (location.hash.startsWith('#/plan')) LIME.app.route();
      } });
    };
  }

  // ---------- One day ----------
  function renderDay(view, id) {
    const plan = st().plan;
    const day = dayById(id);
    if (!day) { location.replace('#/plan'); return; }
    const idx = plan.days.indexOf(day);
    view.innerHTML = `
      ${header('#/plan', `Day <span class="hl">${idx + 1}</span>`, `~${U.esc(U.fmtDur(LIME.planner.estimate(day)))} · ${U.plural(day.items.length, 'move')}`)}
      <label class="field"><span>Name</span><input class="input" id="day-title" maxlength="28" value="${U.esc(day.title)}"></label>
      <div class="section-title"><h2>Exercises</h2><span class="tiny muted">Tap to change sets, reps or rest</span></div>
      ${day.items.length ? `<div class="ex-list">${day.items.map((it, i) => {
        const ex = LIME.ex(it.exId);
        return `<div class="ex-item item-row" data-i="${i}">
          <button type="button" class="item-main" data-edit="${i}" aria-label="Edit ${U.esc(ex.name)}">
            <span class="ex-thumb">${LIME.media(ex, { still: true })}</span>
            <span class="grow"><strong>${U.esc(ex.name)}</strong>
              <small>${it.sets} × ${U.esc(target(it))}${it.rest ? ` · rest ${it.rest} s` : ''}</small>
              ${it.warmup ? '<span class="tag">Warm-up</span>' : it.cooldown ? '<span class="tag">Cool-down</span>' : ''}</span>
          </button>
          <span class="move-btns">
            <button type="button" class="icon-btn plain" data-up="${i}" aria-label="Move ${U.esc(ex.name)} up" ${i === 0 ? 'disabled' : ''}>${LIME.icon('up')}</button>
            <button type="button" class="icon-btn plain" data-down="${i}" aria-label="Move ${U.esc(ex.name)} down" ${i === day.items.length - 1 ? 'disabled' : ''}>${LIME.icon('down')}</button>
          </span>
        </div>`;
      }).join('')}</div>` : '<div class="card empty">No exercises yet.</div>'}
      <div class="stack" style="margin-top:12px">
        ${day.items.length < MAX_ITEMS ? `<button type="button" class="btn btn-block" data-add>${LIME.icon('plus')} Add exercise</button>` : `<p class="tiny muted">${MAX_ITEMS} exercises is the most a day can hold.</p>`}
        ${day.items.length ? `<button type="button" class="btn btn-primary btn-block btn-lg btn-disp" data-start>${LIME.icon('play')} Start this workout</button>` : ''}
        ${plan.days.length > 1 ? `<button type="button" class="btn btn-danger btn-block" data-del-day>Delete this day</button>` : ''}
      </div>`;

    const title = U.$('#day-title', view);
    title.addEventListener('change', () => {
      const v = title.value.trim();
      if (!v || v === day.title) { title.value = day.title; return; }
      change('Day renamed', (p) => { p.days.find((d) => d.id === id).title = v; }, v);
    });
    title.addEventListener('keydown', (e) => { if (e.key === 'Enter') title.blur(); });

    U.$$('[data-edit]', view).forEach((b) => b.onclick = () => itemSheet(id, Number(b.getAttribute('data-edit'))));
    const move = (i, d) => change('Order changed', (p) => {
      const items = p.days.find((x) => x.id === id).items;
      const [m] = items.splice(i, 1); items.splice(i + d, 0, m);
    });
    U.$$('[data-up]', view).forEach((b) => b.onclick = () => move(Number(b.getAttribute('data-up')), -1));
    U.$$('[data-down]', view).forEach((b) => b.onclick = () => move(Number(b.getAttribute('data-down')), 1));
    const add = U.$('[data-add]', view);
    if (add) add.onclick = () => picker({ title: 'Add exercise', onPick: (ex) => {
      change(`Added ${ex.name}`, (p) => { p.days.find((d) => d.id === id).items.push(LIME.planner.defaultItem(ex.id, st().profile)); }, day.title);
    } });
    const start = U.$('[data-start]', view);
    if (start) start.onclick = () => LIME.player.start(id);
    const del = U.$('[data-del-day]', view);
    if (del) del.onclick = () => {
      location.hash = '#/plan';
      change(`Deleted ${day.title}`, (p) => {
        const i = p.days.findIndex((d) => d.id === id);
        p.days.splice(i, 1);
        if (p.next >= p.days.length) p.next = 0;
      });
    };
  }

  // ---------- Edit one exercise ----------
  function stepper(id, label, value, unit) {
    return `<div><div class="stepper">
      <button type="button" data-step="${id}" data-d="-1" aria-label="Less ${label}">−</button>
      <input id="it-${id}" inputmode="numeric" value="${value}" aria-label="${label}${unit ? ' in ' + unit : ''}">
      <button type="button" data-step="${id}" data-d="1" aria-label="More ${label}">+</button></div>
      <div class="stepper-lbl">${label.toUpperCase()}${unit ? ' (' + unit + ')' : ''}</div></div>`;
  }

  function itemSheet(dayId, i) {
    const it = dayById(dayId).items[i];
    const ex = LIME.ex(it.exId);
    const isTime = !!it.secs;
    const LIM = { sets: [1, 10, 1], reps: [1, 100, 1], secs: [5, 600, 5], rest: [0, 300, 15] };
    const draft = { sets: it.sets, reps: it.reps || 10, secs: it.secs || 30, rest: it.rest || 0 };
    const sh = LIME.sheet.open({
      title: ex.name,
      body: `<div class="grid-2" style="gap:12px">
          ${stepper('sets', 'Sets', draft.sets)}
          ${isTime ? stepper('secs', 'Time', draft.secs, 's') : stepper('reps', 'Reps', draft.reps)}
          ${stepper('rest', 'Rest', draft.rest, 's')}
        </div>
        <p class="tiny muted" style="margin:12px 0 0">Changes apply from your next workout.</p>
        <div class="row" style="margin-top:14px">
          <button type="button" class="btn grow" data-swap>${LIME.icon('swap')} Swap</button>
          <button type="button" class="btn btn-danger grow" data-remove>${LIME.icon('trash')} Remove</button>
        </div>`,
      foot: '<button type="button" class="btn btn-primary btn-block btn-lg" data-save>Save</button>'
    });
    const el = sh.el;
    const read = (k) => {
      const [lo, hi] = LIM[k];
      const v = parseInt(U.$('#it-' + k, el).value, 10);
      return U.clamp(Number.isFinite(v) ? v : draft[k], lo, hi);
    };
    U.$$('[data-step]', el).forEach((b) => b.onclick = () => {
      const k = b.getAttribute('data-step');
      const [lo, hi, step] = LIM[k];
      const v = U.clamp(read(k) + step * Number(b.getAttribute('data-d')), lo, hi);
      U.$('#it-' + k, el).value = v;
    });
    U.$('[data-save]', el).onclick = () => {
      const nv = { sets: read('sets'), rest: read('rest') };
      if (isTime) nv.secs = read('secs'); else nv.reps = read('reps');
      sh.close(true);
      change(`${ex.name} updated`, (p) => { Object.assign(p.days.find((d) => d.id === dayId).items[i], nv); },
        `${nv.sets} × ${isTime ? nv.secs + ' s' : nv.reps + ' reps'} · rest ${nv.rest} s`);
    };
    U.$('[data-remove]', el).onclick = () => {
      sh.close(true);
      change(`Removed ${ex.name}`, (p) => { p.days.find((d) => d.id === dayId).items.splice(i, 1); });
    };
    U.$('[data-swap]', el).onclick = () => {
      sh.close(true);
      picker({ title: `Swap ${ex.name}`, exclude: ex.id, group: ex.group, onPick: (nx) => {
        change(`Swapped to ${nx.name}`, (p) => {
          const items = p.days.find((d) => d.id === dayId).items;
          const old = items[i];
          const fresh = LIME.planner.defaultItem(nx.id, st().profile);
          // keep the user's sets and rest; reps/time come from the new exercise if its type differs
          const keepTarget = (nx.type === 'time') === !!old.secs;
          items[i] = Object.assign({}, fresh, { sets: old.sets, rest: old.rest, warmup: old.warmup, cooldown: old.cooldown },
            keepTarget ? (old.secs ? { secs: old.secs } : { reps: old.reps }) : {});
          if (!items[i].warmup) delete items[i].warmup;
          if (!items[i].cooldown) delete items[i].cooldown;
        });
      } });
    };
  }

  // ---------- Exercise picker ----------
  function picker(o) {
    let q = '';
    let group = o.group || 'all';
    let mine = true;
    const prof = st().profile;
    const equip = prof.equipment.filter((e) => e !== 'none');
    const list = () => LIME.EXERCISES.filter((e) => e.id !== o.exclude
      && (group === 'all' || e.group === group)
      && (!mine || e.needs.every((n) => equip.includes(n)))
      && (!q || (e.name + ' ' + e.muscles.join(' ')).toLowerCase().includes(q)));
    const sh = LIME.sheet.open({
      title: o.title,
      body: `<div class="stack">
        <label class="search"><span class="ico">${LIME.icon('search')}</span>
          <input class="input" type="search" id="pk-q" placeholder="Search moves or muscles" aria-label="Search moves"></label>
        <div class="chips">${LIME.GROUPS.map((g) => `<button type="button" class="chip${g.id === group ? ' on' : ''}" data-g="${g.id}">${U.esc(g.label)}</button>`).join('')}</div>
        <label class="row between"><span class="small muted">Only my equipment</span>
          <span class="toggle"><input type="checkbox" id="pk-mine" checked><span></span></span></label>
        <div class="ex-list" id="pk-list"></div></div>`
    });
    const el = sh.el;
    function draw() {
      const items = list();
      U.$('#pk-list', el).innerHTML = items.length ? items.map((e) => `<button type="button" class="ex-item" data-pick="${e.id}">
          <span class="ex-thumb">${LIME.media(e, { still: true })}</span>
          <span class="grow"><strong>${U.esc(e.name)}</strong><small>${U.esc(e.muscles.join(' · '))}</small></span>
          <span class="ico muted">${LIME.icon('plus')}</span></button>`).join('')
        : '<div class="empty">No moves match.</div>';
      U.$$('[data-pick]', el).forEach((b) => b.onclick = () => { sh.close(true); o.onPick(LIME.ex(b.getAttribute('data-pick'))); });
    }
    U.$('#pk-q', el).addEventListener('input', U.debounce((e) => { q = e.target.value.trim().toLowerCase(); draw(); }, 120));
    U.$$('[data-g]', el).forEach((b) => b.onclick = () => {
      group = b.getAttribute('data-g');
      U.$$('[data-g]', el).forEach((x) => x.classList.toggle('on', x === b));
      draw();
    });
    U.$('#pk-mine', el).onchange = (e) => { mine = e.target.checked; draw(); };
    draw();
  }

  LIME.planEditor = {
    render(view, parts) {
      if (parts && parts[1]) renderDay(view, parts[1]);
      else renderWeek(view);
    }
  };
})();
