/* Moving stick-figure illustrations, drawn in SVG and animated between two
   key poses (SMIL, works on iPhone Safari). Used when an exercise has no
   video clip. To add a real clip later: put an MP4 in media/ and set
   `video: 'media/<id>.mp4'` on the exercise in exercises.js.

   Coordinates: viewBox 0 0 200 150, floor at y=135, figure faces right.
   Joints: head, neck, hip, k1/f1 (near knee/foot), k2/f2 (far), e1/h1 (near elbow/hand), e2/h2 (far). */
(function () {
  'use strict';

  const STAND = {
    head: [100, 30], neck: [100, 44], hip: [99, 82],
    k1: [101, 108], f1: [101, 135], k2: [97, 108], f2: [96, 135],
    e1: [102, 63], h1: [103, 84], e2: [97, 63], h2: [96, 84]
  };

  // Each pattern: { a: pose, b: pose, dur, eq: 'auto'|..., bench?, bar? }
  const P = {
    squat: {
      a: { head: [100, 29], neck: [100, 43], hip: [98, 82], k1: [102, 108], f1: [100, 135], k2: [98, 108], f2: [96, 135], e1: [116, 50], h1: [134, 50], e2: [113, 52], h2: [131, 53] },
      b: { head: [110, 52], neck: [104, 64], hip: [80, 101], k1: [110, 104], f1: [100, 135], k2: [106, 105], f2: [96, 135], e1: [122, 67], h1: [141, 66], e2: [119, 69], h2: [138, 69] },
      dur: 2.6
    },
    jump: {
      a: { head: [110, 52], neck: [104, 64], hip: [80, 101], k1: [110, 104], f1: [100, 135], k2: [106, 105], f2: [96, 135], e1: [92, 80], h1: [84, 96], e2: [96, 82], h2: [88, 98] },
      b: { head: [100, 12], neck: [100, 26], hip: [99, 64], k1: [101, 90], f1: [101, 116], k2: [97, 90], f2: [96, 117], e1: [104, 10], h1: [106, -6], e2: [96, 10], h2: [94, -6] },
      dur: 1.6
    },
    lunge: {
      a: { head: [98, 30], neck: [98, 44], hip: [97, 81], k1: [108, 107], f1: [116, 135], k2: [89, 107], f2: [76, 135], e1: [100, 63], h1: [101, 84], e2: [96, 63], h2: [95, 84] },
      b: { head: [98, 46], neck: [98, 60], hip: [97, 97], k1: [122, 110], f1: [120, 135], k2: [84, 127], f2: [62, 133], e1: [100, 79], h1: [101, 100], e2: [96, 79], h2: [95, 100] },
      dur: 2.6
    },
    pushup: {
      a: { head: [153, 95], neck: [141, 101], hip: [88, 113], k1: [63, 122], f1: [40, 130], k2: [63, 121], f2: [41, 129], e1: [141, 117], h1: [141, 133], e2: [137, 117], h2: [137, 133] },
      b: { head: [153, 114], neck: [141, 120], hip: [88, 125], k1: [63, 128], f1: [40, 131], k2: [63, 127], f2: [41, 130], e1: [125, 121], h1: [141, 133], e2: [121, 121], h2: [137, 133] },
      dur: 2.2
    },
    plank: {
      a: { head: [150, 103], neck: [138, 110], hip: [88, 113], k1: [63, 120], f1: [40, 128], k2: [63, 119], f2: [41, 127], e1: [138, 131], h1: [160, 131], e2: [134, 131], h2: [156, 131] },
      b: { head: [150, 102], neck: [138, 109], hip: [88, 109], k1: [63, 118], f1: [40, 128], k2: [63, 117], f2: [41, 127], e1: [138, 131], h1: [160, 131], e2: [134, 131], h2: [156, 131] },
      dur: 3.2
    },
    climber: {
      a: { head: [153, 95], neck: [141, 101], hip: [88, 112], k1: [114, 118], f1: [96, 128], k2: [63, 121], f2: [40, 130], e1: [141, 117], h1: [141, 133], e2: [137, 117], h2: [137, 133] },
      b: { head: [153, 95], neck: [141, 101], hip: [88, 112], k1: [63, 121], f1: [40, 130], k2: [114, 118], f2: [96, 128], e1: [141, 117], h1: [141, 133], e2: [137, 117], h2: [137, 133] },
      dur: 0.9
    },
    hinge: {
      a: { head: [100, 30], neck: [100, 44], hip: [97, 82], k1: [100, 108], f1: [100, 135], k2: [96, 108], f2: [96, 135], e1: [101, 64], h1: [102, 86], e2: [98, 64], h2: [99, 86] },
      b: { head: [135, 60], neck: [123, 64], hip: [78, 80], k1: [93, 106], f1: [99, 135], k2: [89, 106], f2: [95, 135], e1: [123, 84], h1: [123, 104], e2: [120, 84], h2: [120, 104] },
      dur: 2.8
    },
    row: {
      a: { head: [136, 59], neck: [124, 64], hip: [78, 82], k1: [93, 106], f1: [99, 135], k2: [89, 106], f2: [95, 135], e1: [124, 85], h1: [124, 106], e2: [121, 85], h2: [121, 106] },
      b: { head: [136, 59], neck: [124, 64], hip: [78, 82], k1: [93, 106], f1: [99, 135], k2: [89, 106], f2: [95, 135], e1: [104, 74], h1: [116, 92], e2: [101, 74], h2: [113, 92] },
      dur: 2.2
    },
    press: {
      a: { head: [100, 30], neck: [100, 44], hip: [99, 82], k1: [101, 108], f1: [101, 135], k2: [97, 108], f2: [96, 135], e1: [114, 58], h1: [112, 40], e2: [86, 58], h2: [88, 40] },
      b: { head: [100, 30], neck: [100, 44], hip: [99, 82], k1: [101, 108], f1: [101, 135], k2: [97, 108], f2: [96, 135], e1: [108, 24], h1: [106, 6], e2: [92, 24], h2: [94, 6] },
      dur: 2.4
    },
    bench: {
      a: { head: [152, 88], neck: [139, 92], hip: [88, 94], k1: [62, 88], f1: [56, 135], k2: [66, 88], f2: [62, 135], e1: [140, 73], h1: [140, 54], e2: [136, 73], h2: [136, 54] },
      b: { head: [152, 88], neck: [139, 92], hip: [88, 94], k1: [62, 88], f1: [56, 135], k2: [66, 88], f2: [62, 135], e1: [124, 101], h1: [139, 82], e2: [120, 101], h2: [135, 82] },
      dur: 2.4, bench: true
    },
    curl: {
      a: { head: [100, 30], neck: [100, 44], hip: [99, 82], k1: [101, 108], f1: [101, 135], k2: [97, 108], f2: [96, 135], e1: [101, 65], h1: [104, 88], e2: [97, 65], h2: [99, 88] },
      b: { head: [100, 30], neck: [100, 44], hip: [99, 82], k1: [101, 108], f1: [101, 135], k2: [97, 108], f2: [96, 135], e1: [101, 65], h1: [116, 50], e2: [97, 65], h2: [112, 50] },
      dur: 2
    },
    jack: {
      a: { head: [100, 30], neck: [100, 44], hip: [100, 82], k1: [96, 108], f1: [94, 135], k2: [104, 108], f2: [106, 135], e1: [91, 62], h1: [87, 82], e2: [109, 62], h2: [113, 82] },
      b: { head: [100, 30], neck: [100, 44], hip: [100, 82], k1: [87, 107], f1: [76, 133], k2: [113, 107], f2: [124, 133], e1: [84, 28], h1: [80, 10], e2: [116, 28], h2: [120, 10] },
      dur: 0.9
    },
    bridge: {
      a: { head: [40, 124], neck: [53, 127], hip: [100, 128], k1: [124, 104], f1: [134, 134], k2: [120, 104], f2: [130, 134], e1: [68, 131], h1: [86, 132], e2: [66, 130], h2: [84, 131] },
      b: { head: [40, 124], neck: [53, 125], hip: [100, 103], k1: [128, 98], f1: [134, 134], k2: [124, 98], f2: [130, 134], e1: [68, 131], h1: [86, 132], e2: [66, 130], h2: [84, 131] },
      dur: 2.4
    },
    crunch: {
      a: { head: [46, 122], neck: [60, 125], hip: [100, 127], k1: [122, 104], f1: [134, 134], k2: [118, 104], f2: [130, 134], e1: [58, 110], h1: [48, 116], e2: [56, 111], h2: [47, 117] },
      b: { head: [66, 98], neck: [74, 108], hip: [100, 127], k1: [122, 104], f1: [134, 134], k2: [118, 104], f2: [130, 134], e1: [84, 96], h1: [70, 92], e2: [82, 97], h2: [69, 93] },
      dur: 2
    },
    pullup: {
      a: { head: [100, 37], neck: [100, 50], hip: [100, 88], k1: [101, 112], f1: [100, 133], k2: [98, 112], f2: [97, 133], e1: [110, 31], h1: [112, 12], e2: [90, 31], h2: [88, 12] },
      b: { head: [100, 4], neck: [100, 18], hip: [100, 56], k1: [101, 80], f1: [100, 101], k2: [98, 80], f2: [97, 101], e1: [120, 28], h1: [112, 12], e2: [80, 28], h2: [88, 12] },
      dur: 2.6, bar: true
    },
    calf: {
      a: STAND,
      b: { head: [100, 22], neck: [100, 36], hip: [99, 74], k1: [101, 100], f1: [102, 128], k2: [97, 100], f2: [97, 128], e1: [102, 55], h1: [103, 76], e2: [97, 55], h2: [96, 76] },
      dur: 1.6
    },
    stretch: {
      a: { head: [100, 30], neck: [100, 44], hip: [99, 82], k1: [101, 108], f1: [101, 135], k2: [97, 108], f2: [96, 135], e1: [103, 24], h1: [105, 6], e2: [97, 24], h2: [95, 6] },
      b: { head: [112, 104], neck: [110, 92], hip: [96, 80], k1: [100, 108], f1: [101, 135], k2: [96, 108], f2: [96, 135], e1: [108, 112], h1: [106, 132], e2: [104, 112], h2: [102, 132] },
      dur: 4
    },
    twist: {
      a: { head: [80, 82], neck: [86, 94], hip: [100, 128], k1: [124, 106], f1: [140, 118], k2: [120, 106], f2: [136, 118], e1: [104, 106], h1: [118, 100], e2: [100, 106], h2: [116, 102] },
      b: { head: [80, 82], neck: [86, 94], hip: [100, 128], k1: [124, 106], f1: [140, 118], k2: [120, 106], f2: [136, 118], e1: [84, 112], h1: [100, 120], e2: [80, 112], h2: [98, 122] },
      dur: 1.6
    }
  };

  function p(pt) { return `${pt[0]} ${pt[1]}`; }
  function paths(f) {
    return {
      torso: `M${p(f.neck)} L${p(f.hip)}`,
      leg1: `M${p(f.hip)} L${p(f.k1)} L${p(f.f1)}`,
      leg2: `M${p(f.hip)} L${p(f.k2)} L${p(f.f2)}`,
      arm1: `M${p(f.neck)} L${p(f.e1)} L${p(f.h1)}`,
      arm2: `M${p(f.neck)} L${p(f.e2)} L${p(f.h2)}`
    };
  }

  const SPLINE = 'keySplines="0.45 0 0.55 1;0.45 0 0.55 1" calcMode="spline" keyTimes="0;0.5;1"';

  function anim(attr, a, b, dur) {
    if (a === b) return '';
    return `<animate attributeName="${attr}" values="${a};${b};${a}" dur="${dur}s" repeatCount="indefinite" ${SPLINE}/>`;
  }

  /** Equipment drawn at the hands (moves with them). */
  function eqAt(eq, ha, hb, dur, far) {
    const op = far ? ' opacity="0.45"' : '';
    if (eq === 'barbell') {
      if (far) return '';
      return `<circle class="fig-eqf"${op} r="13" cx="${ha[0]}" cy="${ha[1]}">${anim('cx', ha[0], hb[0], dur)}${anim('cy', ha[1], hb[1], dur)}</circle>` +
        `<circle r="4" fill="var(--bg)" cx="${ha[0]}" cy="${ha[1]}">${anim('cx', ha[0], hb[0], dur)}${anim('cy', ha[1], hb[1], dur)}</circle>`;
    }
    if (eq === 'goblet') {
      if (far) return '';
      return `<rect class="fig-eqf" width="9" height="16" rx="3" x="${ha[0] - 8}" y="${ha[1] - 8}">${anim('x', ha[0] - 8, hb[0] - 8, dur)}${anim('y', ha[1] - 8, hb[1] - 8, dur)}</rect>`;
    }
    if (eq === 'dumbbell') {
      return `<circle class="fig-eqf"${op} r="6.5" cx="${ha[0]}" cy="${ha[1]}">${anim('cx', ha[0], hb[0], dur)}${anim('cy', ha[1], hb[1], dur)}</circle>`;
    }
    if (eq === 'kettlebell') {
      if (far) return '';
      return `<circle class="fig-eqf" r="9" cx="${ha[0]}" cy="${ha[1] + 9}">${anim('cx', ha[0], hb[0], dur)}${anim('cy', ha[1] + 9, hb[1] + 9, dur)}</circle>`;
    }
    return '';
  }

  /**
   * figure(patternKey, { eq, still, label }) → SVG markup string
   * eq: 'none' | 'dumbbell' | 'barbell' | 'kettlebell' | 'band'
   */
  function figure(key, opts) {
    opts = opts || {};
    const pat = P[key] || P.squat;
    const a = Object.assign({}, STAND, pat.a);
    const b = opts.still ? a : Object.assign({}, a, pat.b);
    const dur = pat.dur;
    const pa = paths(a), pb = paths(b);
    const eq = opts.eq || 'none';

    let extras = '';
    if (pat.bench) {
      extras += '<rect x="58" y="99" width="100" height="7" rx="3" fill="var(--line-2)"/>' +
        '<rect x="70" y="106" width="6" height="29" fill="var(--line-2)"/><rect x="140" y="106" width="6" height="29" fill="var(--line-2)"/>';
    }
    if (pat.bar) extras += '<line x1="60" y1="12" x2="140" y2="12" class="fig-eq"/>';
    let band = '';
    if (eq === 'band') {
      band = `<path class="fig-eq" stroke-width="3" d="M${p(a.f1)} L${p(a.h1)}">${anim('d', `M${p(a.f1)} L${p(a.h1)}`, `M${p(b.f1)} L${p(b.h1)}`, dur)}</path>`;
    }

    const limb = (cls, name, op) =>
      `<path class="${cls}"${op ? ` opacity="${op}"` : ''} d="${pa[name]}">${anim('d', pa[name], pb[name], dur)}</path>`;

    return `<svg class="fig-anim" viewBox="0 0 200 150" role="img" aria-label="${LIME.U.esc(opts.label || 'Exercise demo')}" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="137" x2="190" y2="137" class="fig-floor"/>
      <ellipse cx="100" cy="139" rx="56" ry="3" fill="var(--accent)" opacity="0.18"/>
      ${extras}
      ${band}
      ${limb('fig-body', 'leg2', 0.45)}
      ${limb('fig-body', 'arm2', 0.45)}
      ${eqAt(eq, a.h2, b.h2, dur, true)}
      ${limb('fig-body', 'leg1')}
      ${limb('fig-body', 'torso')}
      ${limb('fig-body', 'arm1')}
      ${eqAt(eq, a.h1, b.h1, dur, false)}
      <circle class="fig-head" r="9.5" cx="${a.head[0]}" cy="${a.head[1]}">${anim('cx', a.head[0], b.head[0], dur)}${anim('cy', a.head[1], b.head[1], dur)}</circle>
    </svg>`;
  }

  /** Which demo style to show: 'photo' (default), '3d' or 'flat' (Settings). */
  function demoStyle() {
    const s = LIME.store && LIME.store.state.settings;
    return (s && s.demo) || 'photo';
  }

  /**
   * Start and end photos (js/data/art.js) blended in a loop. Thumbnails
   * (opts.still) use the small -t image.
   */
  function photo(ex, opts) {
    const E = LIME.U.esc, base = 'media/ex/' + ex.id;
    if (opts.still) return `<img class="ph-thumb" src="${base}-t.webp" alt="" loading="lazy" decoding="async">`;
    const pat = (LIME.POSES && LIME.POSES.patterns[ex.fig]) || {};
    const dur = Math.min(3.6, Math.max(2.4, (pat.dur || 2.4) * 1.3)).toFixed(1); // one hold in each pose
    const wh = LIME.ART[ex.id];
    return `<div class="photo" style="--dur:${dur}s;--ar:${wh[0]}/${wh[1]}" role="img" aria-label="${E(ex.name)}: start and end position">
      <img class="ph-a" src="${base}-a.webp" alt="" decoding="async" draggable="false">
      <img class="ph-b" src="${base}-b.webp" alt="" decoding="async" draggable="false">
    </div>`;
  }

  /**
   * The exercise demo: video if the exercise has one, else photos (if any
   * and the setting allows), else the moving figure.
   * opts.three: wrap the figure in a slot that LIME.body3d.hydrate() upgrades
   * to the 3D body. The SVG stays as the fallback and first frame.
   */
  function media(ex, opts) {
    opts = opts || {};
    if (ex.video) {
      return `<video src="${LIME.U.esc(ex.video)}" autoplay loop muted playsinline preload="metadata" aria-label="${LIME.U.esc(ex.name)} demo"></video>`;
    }
    const style = demoStyle();
    if (LIME.ART && LIME.ART[ex.id] && style === 'photo') return photo(ex, opts);
    const eq = ex.figEq || ex.equipment;
    const svg = figure(ex.fig, { eq, label: ex.name + ' demo', still: opts.still });
    if (!opts.three || style === 'flat') return svg;
    return slot(ex.fig, eq, ex.muscles, svg, opts.ring);
  }

  /** 3D slot markup for a pattern (used by media() and the intro slides). */
  function slot(fig, eq, muscles, svg, ring) {
    const E = LIME.U.esc;
    return `<div class="b3d"${ring === false ? ' data-ring="0"' : ''} data-fig="${E(fig)}" data-eq="${E(eq || 'none')}" data-muscles="${E((muscles || []).join('|'))}">${svg || figure(fig, { eq })}</div>`;
  }

  LIME.figure = figure;
  LIME.media = media;
  LIME.demoStyle = demoStyle;
  LIME.figureSlot = slot;
  LIME.FIGURES = Object.keys(P);
  LIME.POSES = { patterns: P, stand: STAND, front: ['jack', 'pullup'] };
})();
