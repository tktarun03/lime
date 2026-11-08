/* Bottom notices with Undo or one action (BasKar pattern). One at a time.
   toast(title)
   toast(title, { kind: 'good'|'bad', body })
   toast(title, { body, undo: fn })
   toast(title, { body, action: { label, fn } }) */
(function () {
  'use strict';

  const U = LIME.U;
  let current = null;

  function close(el) {
    if (!el || !el.isConnected) return;
    clearTimeout(el._t);
    el.classList.add('out');
    setTimeout(() => el.remove(), 230);
    if (current === el) current = null;
  }

  function toast(title, opts) {
    opts = opts || {};
    const root = document.getElementById('toast-root');
    if (!root) return null;
    if (current) { clearTimeout(current._t); current = null; }
    root.querySelectorAll('.toast').forEach((t) => { clearTimeout(t._t); t.remove(); }); // incl. ones still sliding out

    const hasBtn = !!(opts.undo || opts.action);
    const ms = opts.ms || (hasBtn ? 7000 : opts.kind === 'bad' ? 6000 : 4500);
    const el = document.createElement('div');
    el.className = 'toast' + (opts.kind ? ' ' + opts.kind : '');
    el.setAttribute('role', opts.kind === 'bad' ? 'alert' : 'status');
    el.setAttribute('aria-live', opts.kind === 'bad' ? 'assertive' : 'polite');

    const ico = opts.kind === 'good' ? LIME.icon('check') : opts.kind === 'bad' ? LIME.icon('x') : '';
    const btnLabel = opts.undo ? 'Undo' : opts.action ? opts.action.label : '';
    el.innerHTML =
      (ico ? `<span class="t-ico">${ico}</span>` : '') +
      `<div class="t-txt"><strong>${U.esc(title)}</strong>${opts.body ? `<span>${U.esc(opts.body)}</span>` : ''}</div>` +
      (hasBtn ? `<button type="button" class="t-btn">${U.esc(btnLabel)}</button>` : '') +
      `<button type="button" class="t-x" aria-label="Dismiss">${LIME.icon('x')}</button>`;

    const start = () => { clearTimeout(el._t); el._t = setTimeout(() => close(el), el._left); el._started = Date.now(); };
    el._left = ms;
    const pause = () => { clearTimeout(el._t); el._left = Math.max(1500, el._left - (Date.now() - el._started)); };
    el.addEventListener('pointerenter', pause);
    el.addEventListener('pointerleave', start);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', start, { passive: true });

    const btn = el.querySelector('.t-btn');
    if (btn) btn.addEventListener('click', () => {
      close(el);
      try { (opts.undo || opts.action.fn)(); } catch (e) { console.error(e); }
    });
    el.querySelector('.t-x').addEventListener('click', () => close(el));

    root.appendChild(el);
    current = el;
    start();
    return el;
  }

  /** Remove the current notice now (e.g. its Undo no longer makes sense). */
  toast.clear = () => { if (current) { clearTimeout(current._t); current.remove(); current = null; } };

  LIME.toast = toast;
})();
