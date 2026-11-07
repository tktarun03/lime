/* Small helpers shared by every module. */
(function () {
  'use strict';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  const U = {
    /** Escape any user or external text before it goes into HTML. */
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]); },

    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

    uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

    clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); },

    /** Local date key YYYY-MM-DD (not UTC, so a 1 a.m. workout counts for the right day). */
    dayKey(d) {
      const x = d ? new Date(d) : new Date();
      const m = String(x.getMonth() + 1).padStart(2, '0');
      const day = String(x.getDate()).padStart(2, '0');
      return `${x.getFullYear()}-${m}-${day}`;
    },

    /** Monday of the week containing d, as a Date at 00:00 local. */
    weekStart(d) {
      const x = d ? new Date(d) : new Date();
      x.setHours(0, 0, 0, 0);
      const dow = (x.getDay() + 6) % 7; // Mon=0
      x.setDate(x.getDate() - dow);
      return x;
    },

    addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; },

    /** 75 → "1:15", 3725 → "1:02:05" */
    fmtClock(sec) {
      sec = Math.max(0, Math.round(sec));
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      const ss = String(s).padStart(2, '0');
      return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
    },

    /** 2700 → "45 min", 5400 → "1 h 30 min" */
    fmtDur(sec) {
      const m = Math.round(sec / 60);
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60), r = m % 60;
      return r ? `${h} h ${r} min` : `${h} h`;
    },

    fmtNum(n, dp) {
      return Number(n || 0).toLocaleString('en', { maximumFractionDigits: dp == null ? 0 : dp });
    },

    fmtDate(d, opts) {
      return new Date(d).toLocaleDateString('en', opts || { day: 'numeric', month: 'short' });
    },

    plural(n, one, many) { return `${U.fmtNum(n)} ${n === 1 ? one : (many || one + 's')}`; },

    /** Weight shown in the user's unit; stored always in kg. */
    kgTo(kg, units) { return units === 'lb' ? kg * 2.20462 : kg; },
    toKg(v, units) { return units === 'lb' ? v / 2.20462 : v; },

    greet() {
      const h = new Date().getHours();
      return h < 5 ? 'Late one' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    },

    debounce(fn, ms) {
      let t;
      return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
    },

    vibrate(pattern) {
      try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* iOS has no vibration */ }
    },

    isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    },

    isIOS() { return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  };

  LIME.U = U;
})();
