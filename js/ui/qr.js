/* QR codes as inline SVG. The encoder (vendor/qrcode.min.js, MIT, by
   Kazuhiko Arase) is loaded only the first time a QR code is shown.
   LIME.qr.svg(text, label) → Promise<svg markup>. Black on white so every
   phone camera can read it. */
(function () {
  'use strict';

  const U = LIME.U;
  const SRC = 'vendor/qrcode.min.js';
  let loading = null;

  function load() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error('qr-missing')));
      s.onerror = () => { loading = null; reject(new Error('qr-load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  async function svg(text, label) {
    const make = await load();
    const q = make(0, 'M');
    q.addData(String(text));
    q.make();
    const n = q.getModuleCount();
    const m = 4; // quiet zone, in modules
    const size = n + m * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    }
    return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${U.esc(label || 'QR code')}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  LIME.qr = { load, svg };
})();
