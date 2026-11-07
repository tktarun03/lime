/* Bottom sheet. openSheet({ title, body (html), foot (html), onOpen(el), onClose() })
   Returns { el, close }. Escape and backdrop tap close it. */
(function () {
  'use strict';

  const U = LIME.U;
  let open = null;

  function openSheet(o) {
    if (open) open.close(true);
    const root = document.getElementById('sheet-root');
    const back = document.createElement('div');
    back.className = 'sheet-backdrop';
    const el = document.createElement('div');
    el.className = 'sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', o.title || 'Details');
    el.innerHTML = `<div class="grabber"></div>
      <div class="sheet-hd"><h2>${U.esc(o.title || '')}</h2>
        <button type="button" class="icon-btn plain" data-close aria-label="Close">${LIME.icon('x')}</button></div>
      <div class="sheet-body">${o.body || ''}</div>
      ${o.foot ? `<div class="sheet-foot">${o.foot}</div>` : ''}`;

    function onKey(e) { if (e.key === 'Escape') api.close(); }
    const api = {
      el,
      close(silent) {
        document.removeEventListener('keydown', onKey);
        back.remove(); el.remove();
        if (open === api) open = null;
        if (!silent && o.onClose) o.onClose();
      }
    };
    back.addEventListener('click', () => api.close());
    el.querySelector('[data-close]').addEventListener('click', () => api.close());
    document.addEventListener('keydown', onKey);

    root.appendChild(back);
    root.appendChild(el);
    LIME.icons.hydrate(el);
    open = api;
    if (o.onOpen) o.onOpen(el, api);
    LIME.body3d.hydrate(el);
    setTimeout(() => { const f = el.querySelector('[autofocus]'); if (f) f.focus(); }, 50);
    return api;
  }

  /** Simple confirm built on the sheet. Resolves true/false. */
  function confirmSheet(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      let answered = false;
      const s = openSheet({
        title,
        body: `<p class="muted">${U.esc(text)}</p>`,
        foot: `<div class="row"><button type="button" class="btn btn-ghost grow" data-no>Cancel</button>
               <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} grow" data-yes>${U.esc(okLabel || 'OK')}</button></div>`,
        onClose() { if (!answered) resolve(false); }
      });
      s.el.querySelector('[data-no]').onclick = () => { answered = true; s.close(true); resolve(false); };
      s.el.querySelector('[data-yes]').onclick = () => { answered = true; s.close(true); resolve(true); };
    });
  }

  LIME.sheet = { open: openSheet, confirm: confirmSheet, get current() { return open; } };
})();
