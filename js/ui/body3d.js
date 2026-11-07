/* 3D anatomical body figures (three.js r149, self-hosted in vendor/, loaded
   only when needed).

   The body is sculpted from muscle-shaped pieces rather than tubes: limbs are
   lathed from radius profiles (calf, quad and biceps bellies), the torso has
   pecs, abs, lats, traps and glutes laid over it, and the head, hands and feet
   are shaped ellipsoids. Worked muscles glow in the accent colour with a
   fibre texture. Lighting is image-based (a small studio environment) with a
   soft key shadow and an accent rim. It moves between the same two key poses
   as the SVG figures in figures.js, and the camera sways slowly.

   Markup: <div class="b3d" data-fig data-eq data-muscles [data-ring="0"]>svg</div>
   Call LIME.body3d.hydrate(root) after rendering; the router, sheets and the
   player already do. Instances whose canvas leaves the page are disposed.
   Falls back to the SVG figure when WebGL or the library is missing. */
(function () {
  'use strict';

  const SRC = 'vendor/three.min.js';
  let loading = null;
  let glOK = null;
  const live = new Set();
  let rafId = 0;
  let shared = null; // textures shared by all figures

  function webgl() {
    if (glOK != null) return glOK;
    try { const c = document.createElement('canvas'); glOK = !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { glOK = false; }
    return glOK;
  }

  function load() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.THREE ? resolve(window.THREE) : reject(new Error('three-missing')));
      s.onerror = () => { loading = null; reject(new Error('three-load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // ---------- Which muscles each exercise lights ----------
  const MAP = {
    quads: ['thigh'], hamstrings: ['thigh'], glutes: ['glutes'], calves: ['shin'],
    legs: ['thigh', 'shin'], 'hip flexors': ['thigh', 'abs'],
    chest: ['pecs'], 'upper back': ['back', 'traps'], back: ['back', 'lowback'], lats: ['back'],
    'lower back': ['lowback'], core: ['abs', 'obliques'], abs: ['abs'], obliques: ['obliques'],
    shoulders: ['delts'], triceps: ['upperarm'], biceps: ['upperarm'],
    'full body': ['pecs', 'abs', 'thigh', 'shin', 'upperarm', 'delts', 'glutes', 'back']
  };
  function worked(muscles) {
    const out = new Set();
    muscles.forEach((m) => (MAP[m.toLowerCase()] || []).forEach((p) => out.add(p)));
    return out;
  }

  // Radius profiles along each segment (t = 0 at the joint nearer the body)
  const PROFILE = {
    thigh: [[0, 0.104], [0.12, 0.124], [0.34, 0.119], [0.6, 0.1], [0.85, 0.076], [1, 0.066]],
    shin: [[0, 0.066], [0.12, 0.077], [0.3, 0.084], [0.52, 0.067], [0.82, 0.048], [1, 0.043]],
    upperarm: [[0, 0.07], [0.16, 0.077], [0.45, 0.073], [0.68, 0.064], [0.9, 0.051], [1, 0.047]],
    forearm: [[0, 0.049], [0.2, 0.058], [0.45, 0.052], [0.8, 0.039], [1, 0.035]],
    neck: [[0, 0.068], [1, 0.058]],
    torso: [[0, 0], [0.015, 0.11], [0.1, 0.148], [0.24, 0.14], [0.4, 0.124], [0.56, 0.134], [0.72, 0.158], [0.86, 0.166], [0.95, 0.135], [0.99, 0.08], [1, 0]]
  };

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssColor = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  // ---------- Shared procedural textures ----------
  function textures(THREE) {
    if (shared) return shared;
    // Muscle fibres: fine wavy lines running along the segment (v direction)
    const fc = document.createElement('canvas'); fc.width = 256; fc.height = 256;
    const f = fc.getContext('2d');
    f.fillStyle = '#808080'; f.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * 256, w = 0.6 + Math.random() * 1.6, shade = 90 + Math.random() * 90;
      f.strokeStyle = `rgb(${shade},${shade},${shade})`; f.lineWidth = w;
      f.beginPath(); f.moveTo(x, 0);
      for (let y = 0; y <= 256; y += 32) f.lineTo(x + Math.sin(y / 40 + i) * 2, y);
      f.stroke();
    }
    const fibre = new THREE.CanvasTexture(fc);
    fibre.wrapS = fibre.wrapT = THREE.RepeatWrapping; fibre.repeat.set(3, 1);

    // Skin: soft fine noise
    const sc = document.createElement('canvas'); sc.width = 128; sc.height = 128;
    const s = sc.getContext('2d');
    const img = s.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const v = 120 + Math.random() * 30; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    s.putImageData(img, 0, 0);
    const skin = new THREE.CanvasTexture(sc);
    skin.wrapS = skin.wrapT = THREE.RepeatWrapping; skin.repeat.set(4, 4);

    // Floor fade: radial alpha so the floor melts into the page
    const gc = document.createElement('canvas'); gc.width = gc.height = 128;
    const g = gc.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.55, '#8a8a8a'); grad.addColorStop(1, '#000000');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const fade = new THREE.CanvasTexture(gc);

    shared = { fibre, skin, fade };
    return shared;
  }

  // ---------- Shared engine ----------
  // One WebGL renderer for every figure on screen: each figure renders into a
  // corner of it and copies the pixels to its own 2D canvas. This avoids
  // creating a WebGL context (and re-baking the studio lighting) per figure,
  // which was slow on phones and in the player, where the figure is redrawn
  // after every set.
  let eng = null;
  function engine(THREE, accent) {
    const key = accent.getHexString();
    if (eng && eng.key === key) return eng;
    if (!eng) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setScissorTest(true);
      renderer.setClearColor(0x000000, 0);
      eng = { renderer, w: 0, h: 0 };
    }
    if (eng.envTex) eng.envTex.dispose();
    // Studio environment for soft reflections (softboxes in a dark room)
    const pmrem = new THREE.PMREMGenerator(eng.renderer);
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x151715, side: THREE.BackSide })));
    const box = (w, h, x, y, z, c, ry, rx) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m);
    };
    box(4, 2, 0, 4.9, 0, new THREE.Color(2.4, 2.4, 2.3), 0, Math.PI / 2);      // top softbox
    box(3, 4, 4.9, 1, 1.5, new THREE.Color(1.6, 1.6, 1.55), -Math.PI / 2);        // key side
    box(2, 5, -4.9, 1, -1, accent.clone().multiplyScalar(1.4), Math.PI / 2);      // accent strip
    eng.envTex = pmrem.fromScene(env, 0.04).texture;
    env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pmrem.dispose();
    eng.key = key;
    return eng;
  }

  /** Render a scene at w×h device pixels and copy it onto a 2D canvas. */
  function blit(R, scene, camera, ctx, w, h) {
    const r = R.renderer;
    if (w > R.w || h > R.h) { R.w = Math.max(R.w, w); R.h = Math.max(R.h, h); r.setSize(R.w, R.h, false); }
    r.setViewport(0, 0, w, h);
    r.setScissor(0, 0, w, h);
    r.clear();
    r.render(scene, camera);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(r.domElement, 0, R.h - h, w, h, 0, 0, w, h);
  }

  // ---------- One figure ----------
  function build(THREE, host) {
    const fig = host.getAttribute('data-fig') || 'squat';
    const eq = host.getAttribute('data-eq') || 'none';
    const muscles = (host.getAttribute('data-muscles') || '').split('|').filter(Boolean);
    const lit = worked(muscles);
    const POSES = LIME.POSES;
    const pat = POSES.patterns[fig] || POSES.patterns.squat;
    const front = POSES.front.includes(fig);
    const faceUp = fig === 'bench'; // bench is drawn head-right, lying on the back
    const A = Object.assign({}, POSES.stand, pat.a);
    const B = Object.assign({}, A, pat.b);
    const dur = pat.dur || 2.4;
    const tex = textures(THREE);

    const canvas = document.createElement('canvas');
    canvas.className = 'b3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx2d = canvas.getContext('2d');
    const accent = new THREE.Color(cssColor('--accent', '#D9F20F'));
    const R = engine(THREE, accent);   // one WebGL renderer + studio lighting for the whole app
    const scene = new THREE.Scene();
    scene.environment = R.envTex;

    const key = new THREE.DirectionalLight(0xfff8ee, 1.25);
    key.position.set(2.2, 4.5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5; key.shadow.camera.top = 3.5; key.shadow.camera.bottom = -1;
    key.shadow.radius = 5; key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(accent, 1.4);
    rim.position.set(-3, 2.5, -3);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xe8ece2, 0x0d0f0c, 0.35));

    // Materials
    const skin = new THREE.MeshPhysicalMaterial({
      color: 0xa8a197, roughness: 0.6, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff),
      clearcoat: 0.08, clearcoatRoughness: 0.6, bumpMap: tex.skin, bumpScale: 0.003, envMapIntensity: 0.8
    });
    const muscle = new THREE.MeshPhysicalMaterial({
      color: accent.clone().lerp(new THREE.Color(0x6f7d00), 0.25), emissive: accent, emissiveIntensity: 0.16,
      roughness: 0.42, metalness: 0, sheen: 0.8, sheenColor: accent, clearcoat: 0.25, clearcoatRoughness: 0.35,
      bumpMap: tex.fibre, bumpScale: 0.012, envMapIntensity: 1
    });
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccc6, roughness: 0.22, metalness: 1, envMapIntensity: 1.2 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1c1a, roughness: 0.62, metalness: 0.05 });
    const trim = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.2, emissive: accent, emissiveIntensity: 0.25 });
    const pad = new THREE.MeshPhysicalMaterial({ color: 0x1e211f, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.4 });
    const mats = [skin, muscle, steel, rubber, trim, pad];
    const M = (part) => (lit.has(part) ? muscle : skin);

    // Floor: glossy dark disc fading out at the edge, plus a contact shadow
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0b, roughness: 0.55, metalness: 0.1, transparent: true, alphaMap: tex.fade, envMapIntensity: 0.12 });
    // (no visible floor plane: it showed as a lit rectangle at the canvas edge; the stage paints the floor glow)
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.55 });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.9, 64), shadowMat);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001; shadow.receiveShadow = true; scene.add(shadow);
    const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.28 });
    if (host.getAttribute('data-ring') !== '0') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.32, 1.34, 96), ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);
    }
    mats.push(floorMat, shadowMat, ringMat);

    // ---------- Body pieces ----------
    const lathe = (prof) => new THREE.LatheGeometry(prof.map(([t, r]) => new THREE.Vector2(r, t)), 28);
    const parts = [];
    function piece(geo, mat, parent) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true;
      (parent || scene).add(m); parts.push(m); return m;
    }
    const sphere = (r) => new THREE.SphereGeometry(r, 28, 20);

    // Torso: a group whose local y runs hip (0) → neck (1); x = front, z = side
    const torso = new THREE.Group(); scene.add(torso);
    const trunk = piece(lathe(PROFILE.torso), skin, torso); trunk.scale.set(0.74, 1, 1.2);
    const overlay = (r, x, y, z, sx, sy, sz, part) => { const m = piece(sphere(r), M(part), torso); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; };
    [-1, 1].forEach((s) => {
      overlay(0.088, 0.072, 0.8, s * 0.074, 0.42, 0.72, 1, 'pecs');          // pecs
      overlay(0.085, -0.07, 0.68, s * 0.085, 0.38, 1.35, 0.85, 'back');      // lats
      overlay(0.06, -0.04, 0.95, s * 0.06, 0.6, 0.9, 1.2, 'traps');          // traps
      overlay(0.075, 0.03, 0.36, s * 0.115, 0.5, 1.5, 0.45, 'obliques');     // obliques
      overlay(0.085, -0.068, 0.05, s * 0.066, 0.8, 0.9, 0.9, 'glutes');      // glutes
      overlay(0.05, -0.085, 0.36, s * 0.035, 0.45, 1.6, 0.8, 'lowback');    // spinal erectors
      [0.36, 0.47, 0.58].forEach((y) => overlay(0.036, 0.098, y, s * 0.034, 0.42, 0.85, 1, 'abs')); // six-pack
    });

    const head = new THREE.Group(); scene.add(head);
    piece(sphere(0.155), skin, head).scale.set(0.9, 1.1, 0.86);
    const jaw = piece(sphere(0.09), skin, head); jaw.position.set(0.045, -0.085, 0); jaw.scale.set(1.05, 0.85, 1.25);
    const neck = piece(lathe(PROFILE.neck), skin);

    const limb = (n) => ({
      delt: piece(sphere(0.088), M('delts')),
      ua: piece(lathe(PROFILE.upperarm), M('upperarm')),
      el: piece(sphere(0.049), skin),
      fa: piece(lathe(PROFILE.forearm), skin),
      hand: piece(sphere(0.05), skin),
      th: piece(lathe(PROFILE.thigh), M('thigh')),
      kn: piece(sphere(0.066), skin),
      sn: piece(lathe(PROFILE.shin), M('shin')),
      ft: piece(sphere(0.062), skin),
      n
    });
    const L1 = limb(1), L2 = limb(2);

    // ---------- Equipment ----------
    const gearAll = [];
    const gearAdd = (m, parent) => { m.castShadow = true; (parent || scene).add(m); gearAll.push(m); return m; };
    let bar = null; const plates = []; const bells = [];
    function plate(r) {
      const g = new THREE.Group();
      gearAdd(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.055, 40), rubber), g);
      const lip = gearAdd(new THREE.Mesh(new THREE.TorusGeometry(r - 0.006, 0.008, 8, 48), trim), g); lip.rotation.x = Math.PI / 2; lip.position.y = 0.028;
      const hub = gearAdd(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 16), steel), g);
      hub.position.y = 0;
      scene.add(g); return g;
    }
    if (eq === 'barbell' && !front) {
      bar = gearAdd(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.55, 16), steel));
      plates.push(plate(0.2), plate(0.2));
    } else if (eq === 'dumbbell' || eq === 'goblet') {
      const n = eq === 'goblet' ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group();
        const h = gearAdd(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 12), steel), g);
        h.rotation.x = Math.PI / 2;
        [0.11, -0.11].forEach((z) => {
          const head6 = gearAdd(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 6), rubber), g);
          head6.rotation.x = Math.PI / 2; head6.position.z = z;
          const cap = gearAdd(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.072, 16), trim), g);
          cap.rotation.x = Math.PI / 2; cap.position.z = z;
        });
        scene.add(g); bells.push(g);
      }
    } else if (eq === 'kettlebell') {
      const g = new THREE.Group();
      const bodyK = gearAdd(new THREE.Mesh(new THREE.SphereGeometry(0.14, 28, 20), rubber), g); bodyK.position.y = -0.17;
      const handle = gearAdd(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 10, 28, Math.PI), steel), g);
      handle.position.y = -0.05; handle.rotation.y = Math.PI / 2;
      const band = gearAdd(new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.008, 8, 40), trim), g); band.position.y = -0.17; band.rotation.x = Math.PI / 2;
      scene.add(g); bells.push(g);
    }
    if (pat.bench) {
      const top = gearAdd(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.4), pad)); top.position.set(0.16, 0.71, 0); top.receiveShadow = true;
      const stripe = gearAdd(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.012, 0.42), trim)); stripe.position.set(0.16, 0.655, 0);
      [-0.6, 0.92].forEach((x) => { const leg = gearAdd(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.32), steel)); leg.position.set(x, 0.33, 0); });
    }
    if (pat.bar) {
      const pb = gearAdd(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2, 16), steel));
      pb.rotation.z = Math.PI / 2; pb.position.set(0, (137 - 12) / 50, 0);
    }

    // ---------- Posing ----------
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const v = (pt, z) => V((pt[0] - 100) / 50, (137 - pt[1]) / 50, z || 0);
    const SIDE = front ? V(1, 0, 0) : V(0, 0, 1); // body's left-right axis
    const Z = front ? 0 : 1;
    const mtx = new THREE.Matrix4();
    const _x = V(0, 0, 0), _y = V(0, 0, 0), _z = V(0, 0, 0);

    /** Orient obj so local y runs p→q, local x faces `fwd`; scale y by length. */
    function orient(obj, p, q, fwd, sx, sz, lengthScale) {
      _y.subVectors(q, p);
      const len = Math.max(0.001, _y.length());
      _y.divideScalar(len);
      _x.copy(fwd).addScaledVector(_y, -fwd.dot(_y));
      if (_x.lengthSq() < 0.02) _x.crossVectors(_y, SIDE);
      _x.normalize();
      _z.crossVectors(_x, _y);
      mtx.makeBasis(_x, _y, _z);
      obj.quaternion.setFromRotationMatrix(mtx);
      obj.position.copy(p);
      obj.scale.set(sx || 1, lengthScale === false ? 1 : len, sz || 1);
      return len;
    }

    function pose(t) {
      const L = {};
      Object.keys(A).forEach((k) => {
        const a = A[k], b = B[k] || a;
        L[k] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      });
      return L;
    }

    const FWD = V(0, 0, 0);
    function apply(L) {
      const headP = v(L.head), neckP = v(L.neck), hipP = v(L.hip);
      // body forward: spine turned -90° in the side plane (face-up for bench)
      if (front) FWD.set(0, 0, 1);
      else {
        const sx = neckP.x - hipP.x, sy = neckP.y - hipP.y;
        FWD.set(sy, -sx, 0).normalize();
        if (faceUp) FWD.negate();
      }
      // torso from just below the hip to just above the shoulder line
      const spine = neckP.clone().sub(hipP);
      const base = hipP.clone().addScaledVector(spine, -0.12);
      const top = neckP.clone().addScaledVector(spine, 0.08);
      orient(torso, base, top, FWD);
      orient(neck, neckP.clone().addScaledVector(spine, -0.02), headP.clone().lerp(neckP, 0.4), FWD);
      orient(head, headP, headP.clone().add(spine.clone().normalize()), FWD, 1, 1, false);

      const sideVec = SIDE.clone();
      [L1, L2].forEach((S) => {
        const i = S.n, near = i === 1;
        const sgn = front ? Math.sign(L['e' + i][0] - L.neck[0]) || (near ? 1 : -1) : (near ? 1 : -1);
        const shoulder = neckP.clone().addScaledVector(spine, -0.1).addScaledVector(sideVec, sgn * 0.2 * (front ? 1 : Z));
        const hsgn = front ? Math.sign(L['k' + i][0] - L.hip[0]) || (near ? 1 : -1) : (near ? 1 : -1);
        const hipJ = hipP.clone().addScaledVector(sideVec, hsgn * 0.1 * (front ? 1 : Z));
        const zz = front ? 0 : sgn * 0.215, zl = front ? 0 : hsgn * 0.105;
        let el = v(L['e' + i], zz), hd = v(L['h' + i], zz);
        if (eq === 'goblet') {
          // goblet hold: hands meet at the chest, elbows tucked down and forward
          const chest = neckP.clone().addScaledVector(spine, -0.32).addScaledVector(FWD, 0.2);
          hd = chest.clone().addScaledVector(sideVec, sgn * 0.045 * (front ? 1 : 1));
          el = shoulder.clone().addScaledVector(spine.clone().normalize(), -0.24).addScaledVector(FWD, 0.13).addScaledVector(sideVec, sgn * 0.02);
        }
        const kn = v(L['k' + i], zl), ft = v(L['f' + i], zl);

        S.delt.position.copy(shoulder); S.delt.quaternion.copy(torso.quaternion); S.delt.scale.set(1, 1.05, 0.95);
        orient(S.ua, shoulder, el, FWD);
        S.el.position.copy(el);
        const faLen = orient(S.fa, el, hd, FWD);
        const dirH = hd.clone().sub(el).divideScalar(faLen);
        orient(S.hand, hd.clone().addScaledVector(dirH, 0.035), hd.clone().addScaledVector(dirH, 0.1), FWD, 0.7, 1, false);
        S.hand.scale.set(0.62, 1.35, 1);
        orient(S.th, hipJ, kn, FWD);
        S.kn.position.copy(kn);
        orient(S.sn, kn, ft, FWD);
        // foot: points forward along the floor
        const fwdFoot = front ? V(0, 0, 1) : V(1, 0, 0);
        const fp = ft.clone().addScaledVector(fwdFoot, 0.07).add(V(0, -0.025, 0));
        orient(S.ft, fp, fp.clone().add(V(0, 1, 0)), fwdFoot, 2.3, 1.05, false);
        S.ft.scale.set(2.3, 0.62, 1.05);
        S.hd = hd;
      });

      if (bar) {
        const c = L1.hd.clone().lerp(L2.hd, 0.5);
        bar.position.copy(c); bar.rotation.set(Math.PI / 2, 0, 0);
        plates[0].position.set(c.x, c.y, c.z + 0.58); plates[1].position.set(c.x, c.y, c.z - 0.58);
        plates.forEach((p) => p.rotation.set(Math.PI / 2, 0, 0));
      }
      if (eq === 'goblet' && bells[0]) {
        bells[0].position.copy(L1.hd.clone().lerp(L2.hd, 0.5)).addScaledVector(FWD, 0.07);
        bells[0].rotation.set(Math.PI / 2, 0, 0);
      } else bells.forEach((g, j) => { g.position.copy((j ? L2 : L1).hd); });
    }

    // Camera framing: fit both poses
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    const fitBox = new THREE.Box3();
    [0, 1].forEach((t) => { apply(pose(t)); scene.updateMatrixWorld(true); parts.concat(gearAll).forEach((m) => fitBox.expandByObject(m)); });
    const center = fitBox.getCenter(V(0, 0, 0));
    const size = fitBox.getSize(V(0, 0, 0));

    let aspect = 1;
    function frame(angle) {
      const span = Math.max(size.y * 1.12, (Math.max(size.x, size.z) * 1.08) / aspect, 1.5);
      const dist = span / (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.position.set(center.x + Math.sin(angle) * dist, center.y + dist * 0.26, center.z + Math.cos(angle) * dist);
      camera.lookAt(center.x, center.y - size.y * 0.05, center.z);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pw = 0, ph2 = 0;
    function resize() {
      const w = host.clientWidth || 300, h = host.clientHeight || 220;
      aspect = w / h;
      pw = Math.max(1, Math.round(w * dpr)); ph2 = Math.max(1, Math.round(h * dpr));
      canvas.width = pw; canvas.height = ph2;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    const still = reduced();
    const base = front ? 0.28 : 0.5;
    const t0 = performance.now();
    function draw(now) {
      const t = (now - t0) / 1000;
      const ph = still ? 1 : (1 - Math.cos((2 * Math.PI * t) / dur)) / 2;
      apply(pose(ph));
      frame(still ? base : base + Math.sin(t * 0.32) * 0.36);
      blit(R, scene, camera, ctx2d, pw, ph2);
    }

    resize();
    let ro = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => resize()); ro.observe(host); }

    const inst = {
      host, canvas, draw, still, drawn: false,
      dispose() {
        if (ro) ro.disconnect();
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        mats.forEach((m) => m.dispose());
        [key, rim].forEach((l) => { if (l.shadow && l.shadow.map) l.shadow.map.dispose(); });
        live.delete(inst);
      }
    };
    return inst;
  }

  function loop(now) {
    rafId = 0;
    live.forEach((inst) => {
      if (!inst.canvas.isConnected) { inst.dispose(); return; }
      if (inst.still && inst.drawn) return;
      try { inst.draw(now); inst.drawn = true; } catch (e) { console.error(e); inst.dispose(); }
    });
    if (live.size) rafId = requestAnimationFrame(loop);
  }

  function mount(THREE, host) {
    if (host.getAttribute('data-b3d-on')) return;
    host.setAttribute('data-b3d-on', '1');
    let inst;
    try { inst = build(THREE, host); } catch (e) { console.error(e); host.removeAttribute('data-b3d-on'); return; }
    host.appendChild(inst.canvas);
    live.add(inst);
    inst.draw(performance.now());
    host.classList.add('on');
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  /** Upgrade every .b3d slot under root to a live 3D figure. */
  function hydrate(root) {
    const slots = Array.from((root || document).querySelectorAll('.b3d:not([data-b3d-on])'));
    if (!slots.length || !webgl() || (LIME.store && LIME.store.state.settings.body3d === false)) return;
    // Automated test browsers render WebGL in software (very slow); they keep
    // the flat drawings unless a test opts in with localStorage 'lime.force3d'.
    if (navigator.webdriver) { let f = null; try { f = localStorage.getItem('lime.force3d'); } catch (e) { /* ignore */ } if (f !== '1') return; }
    if (window.THREE) { slots.forEach((h) => mount(window.THREE, h)); return; }
    load().then((THREE) => slots.forEach((h) => { if (h.isConnected) mount(THREE, h); })).catch(() => { /* keep SVG */ });
  }

  LIME.body3d = {
    hydrate,
    get supported() { return webgl(); },
    get count() { return live.size; },
    disposeAll() { Array.from(live).forEach((i) => i.dispose()); }
  };
})();
