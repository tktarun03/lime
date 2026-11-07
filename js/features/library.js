/* Exercise library: search, filter by group and "only what I can do",
   detail sheet with moving illustration, steps, mistakes, easier/harder. */
(function () {
  'use strict';

  const U = LIME.U;
  let q = '';
  let group = 'all';
  let mineOnly = true;

  const LVL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

  function filtered() {
    const prof = LIME.store.state.profile;
    const equip = prof ? prof.equipment.filter((e) => e !== 'none') : [];
    const needle = q.trim().toLowerCase();
    return LIME.EXERCISES.filter((e) => {
      if (group !== 'all' && e.group !== group) return false;
      if (mineOnly && !e.needs.every((n) => equip.includes(n))) return false;
      if (!needle) return true;
      return (e.name + ' ' + e.muscles.join(' ') + ' ' + e.group + ' ' + e.equipment).toLowerCase().includes(needle);
    });
  }

  function item(e) {
    const eq = LIME.EQUIPMENT.find((x) => x.id === e.equipment);
    return `<button type="button" class="ex-item" data-ex="${e.id}">
      <span class="ex-thumb">${LIME.media(e, { still: true })}</span>
      <span class="grow"><strong>${U.esc(e.name)}</strong>
        <small>${U.esc(e.muscles.join(' · '))}</small><br>
        <span class="tag lvl-${e.level}">${LVL[e.level]}</span><span class="tag">${U.esc(eq ? eq.label : 'Bodyweight')}</span></span>
      <span class="ico chev muted">${LIME.icon('chev')}</span></button>`;
  }

  function renderList(view) {
    const box = U.$('#ex-list', view);
    if (!box) return; // screen changed before a debounced search ran
    const list = filtered();
    box.innerHTML = list.length ? list.map(item).join('')
      : `<div class="empty">No moves match.${mineOnly ? '<br><button type="button" class="link-btn" data-all>Show all equipment</button>' : ''}</div>`;
    U.$$('[data-ex]', box).forEach((b) => b.onclick = () => detail(b.getAttribute('data-ex')));
    const all = U.$('[data-all]', box);
    if (all) all.onclick = () => { mineOnly = false; render(view); };
    U.$('#ex-count', view).textContent = U.plural(list.length, 'move');
  }

  function render(view, parts) {
    view.innerHTML = `
      <header class="page-hd"><h1 class="disp slant">The <span class="hl">moves</span></h1>
        <p class="sub" id="ex-count"></p></header>
      <div class="stack">
        <label class="search"><span class="ico">${LIME.icon('search')}</span>
          <input class="input" type="search" id="ex-q" placeholder="Search moves or muscles" value="${U.esc(q)}" aria-label="Search moves"></label>
        <div class="chips" role="tablist">${LIME.GROUPS.map((g) => `<button type="button" class="chip${g.id === group ? ' on' : ''}" data-g="${g.id}" role="tab" aria-selected="${g.id === group}">${U.esc(g.label)}</button>`).join('')}</div>
        <div class="row between"><span class="small muted">Only my equipment</span>
          <label class="toggle"><input type="checkbox" id="ex-mine" ${mineOnly ? 'checked' : ''} aria-label="Only my equipment"><span></span></label></div>
        <div class="ex-list" id="ex-list"></div>
      </div>`;
    const inp = U.$('#ex-q', view);
    inp.addEventListener('input', U.debounce(() => { q = inp.value; renderList(view); }, 120));
    U.$$('[data-g]', view).forEach((b) => b.onclick = () => { group = b.getAttribute('data-g'); render(view); });
    U.$('#ex-mine', view).onchange = (e) => { mineOnly = e.target.checked; renderList(view); };
    renderList(view);
    if (parts && parts[1] && LIME.ex(parts[1])) detail(parts[1]);
  }

  function detail(id) {
    const e = LIME.ex(id);
    if (!e) return;
    const pr = (LIME.store.state.prs || {})[id];
    const units = LIME.store.state.profile ? LIME.store.state.profile.units : 'kg';
    const prTxt = !pr ? '' : pr.kg ? `${U.fmtNum(U.kgTo(pr.kg, units), 1)} ${units} × ${pr.reps}` : pr.maxSecs ? `${pr.maxSecs} s` : pr.maxReps ? `${pr.maxReps} reps` : '';
    const link = (xid, label) => {
      const x = LIME.ex(xid);
      return x ? `<button type="button" class="opt" data-jump="${x.id}"><span class="opt-ico">${LIME.icon(label === 'Easier' ? 'minus' : 'plus')}</span>
        <span class="grow"><small>${label}</small><strong>${U.esc(x.name)}</strong></span><span class="ico chev">${LIME.icon('chev')}</span></button>` : '';
    };
    LIME.sheet.open({
      title: e.name,
      body: `<div class="stage">${LIME.media(e, { three: true })}${e.video ? '' : '<span class="badge tag">3D demo · worked muscles lit</span>'}</div>
        <div style="margin:12px 0 4px">${e.muscles.map((m) => `<span class="tag">${U.esc(m)}</span>`).join('')}<span class="tag lvl-${e.level}">${LVL[e.level]}</span></div>
        ${prTxt ? `<p style="margin:8px 0"><span class="pr-pill">${LIME.icon('trophy').replace('<svg', '<svg width="14" height="14"')} Best: ${U.esc(prTxt)}</span></p>` : ''}
        <div class="cue">${U.esc(e.cue)}</div>
        <div class="section-title"><h2>How to</h2></div>
        <ol class="steps-list">${e.steps.map((x) => `<li>${U.esc(x)}</li>`).join('')}</ol>
        <div class="section-title"><h2>Avoid</h2></div>
        <ul class="bullets">${e.mistakes.map((x) => `<li>${U.esc(x)}</li>`).join('')}</ul>
        ${(e.easier || e.harder) ? `<div class="section-title"><h2>Variations</h2></div><div class="opts">${link(e.easier, 'Easier')}${link(e.harder, 'Harder')}</div>` : ''}`,
      onOpen(el) {
        U.$$('[data-jump]', el).forEach((b) => b.onclick = () => detail(b.getAttribute('data-jump')));
      }
    });
  }

  LIME.library = { render, detail };
})();
