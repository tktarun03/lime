/* Tiny SVG charts. No library: bars(data) and line(points). Values are
   already in display units. Labels are escaped. */
(function () {
  'use strict';

  const U = LIME.U;

  /** bars([{ label, value, hi }], { height, fmt }) */
  function bars(data, o) {
    o = o || {};
    const W = 320, H = o.height || 150, padB = 22, padT = 18;
    const max = Math.max(1, ...data.map((d) => d.value));
    const n = data.length || 1;
    const slot = W / n, bw = Math.min(26, slot * 0.6);
    const fmt = o.fmt || ((v) => U.fmtNum(v));
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(o.label || 'Bar chart')}">`;
    s += `<line class="grid" x1="0" x2="${W}" y1="${H - padB}" y2="${H - padB}"/>`;
    data.forEach((d, i) => {
      const h = d.value > 0 ? Math.max(3, ((H - padB - padT) * d.value) / max) : 0;
      const x = i * slot + (slot - bw) / 2, y = H - padB - h;
      s += `<rect class="bar${d.hi ? ' hi' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="5"><title>${U.esc(d.label)}: ${U.esc(fmt(d.value))}</title></rect>`;
      if (d.value > 0 && (d.hi || o.showAll)) s += `<text class="val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${U.esc(fmt(d.value))}</text>`;
      s += `<text class="axis" x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${U.esc(d.label)}</text>`;
    });
    return s + '</svg>';
  }

  /** line([{ x: label, y: value }], { height, fmt }) */
  function line(points, o) {
    o = o || {};
    const W = 320, H = o.height || 140, padL = 6, padR = 6, padT = 18, padB = 22;
    if (!points.length) return '';
    const ys = points.map((p) => p.y);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi - lo < 1) { lo -= 1; hi += 1; }
    const fmt = o.fmt || ((v) => U.fmtNum(v, 1));
    const X = (i) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (points.length - 1));
    const Y = (v) => padT + ((hi - v) * (H - padT - padB)) / (hi - lo);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(o.label || 'Line chart')}">`;
    s += `<line class="grid" x1="0" x2="${W}" y1="${H - padB}" y2="${H - padB}"/>`;
    s += `<path class="line" d="${d}"/>`;
    points.forEach((p, i) => { s += `<circle class="pt" cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${i === points.length - 1 ? 4.5 : 2.5}"><title>${U.esc(p.x)}: ${U.esc(fmt(p.y))}</title></circle>`; });
    const last = points[points.length - 1];
    s += `<text class="val" x="${Math.min(W - 4, X(points.length - 1)).toFixed(1)}" y="${(Y(last.y) - 9).toFixed(1)}" text-anchor="end">${U.esc(fmt(last.y))}</text>`;
    s += `<text class="axis" x="${padL}" y="${H - 6}">${U.esc(points[0].x)}</text>`;
    if (points.length > 1) s += `<text class="axis" x="${W - padR}" y="${H - 6}" text-anchor="end">${U.esc(last.x)}</text>`;
    return s + '</svg>';
  }

  /** ring(pct 0–1, centerText) → SVG */
  function ring(pct, text, size) {
    const r = 36, c = 2 * Math.PI * r;
    const off = c * (1 - LIME.U.clamp(pct, 0, 1));
    return `<svg class="ring" viewBox="0 0 84 84" ${size ? `style="width:${size}px;height:${size}px"` : ''} role="img" aria-label="${Math.round(pct * 100)}% of weekly goal">
      <circle class="bgc" cx="42" cy="42" r="${r}"/>
      <circle class="fgc" cx="42" cy="42" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
      <text x="42" y="43">${U.esc(text)}</text></svg>`;
  }

  LIME.charts = { bars, line, ring };
})();
