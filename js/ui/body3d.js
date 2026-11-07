/* 3D body figures (three.js, self-hosted in vendor/, loaded only when needed).
   A lit mannequin built from rounded segments, posed from the same key poses
   as the SVG figures (figures.js), moving between them, with the worked
   muscles glowing in the accent colour. The camera sways slowly so the depth
   reads. Falls back to the SVG figure when WebGL or the library is missing.

   Markup: <div class="b3d" data-fig data-eq data-muscles>svg fallback</div>
   Call LIME.body3d.hydrate(root) after rendering; the router, sheets and the
   player already do. Instances whose canvas leaves the page are disposed. */
(function () {
  'use strict';

  const SRC = 'vendor/three.min.js';
  let loading = null;
  let glOK = null;
  const live = new Set();
  let rafId = 0;

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

  // ---------- Muscle → body part map ----------
  const MAP = {
    quads: ['thigh'], hamstrings: ['thigh'], glutes: ['pelvis', 'thigh'], calves: ['shin'],
    legs: ['thigh', 'shin'], 'hip flexors': ['pelvis', 'thigh'],
    chest: ['chest'], 'upper back': ['chest', 'shoulder'], back: ['chest', 'abdomen'], lats: ['chest'],
    'lower back': ['abdomen', 'pelvis'], core: ['abdomen'], abs: ['abdomen'], obliques: ['abdomen'],
    shoulders: ['shoulder', 'upperarm'], triceps: ['upperarm'], biceps: ['upperarm'],
    'full body': ['chest', 'abdomen', 'thigh', 'shin', 'upperarm', 'shoulder', 'pelvis']
  };
  function worked(muscles) {
    const out = new Set();
    muscles.forEach((m) => (MAP[m.toLowerCase()] || []).forEach((p) => out.add(p)));
    return out;
  }

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssColor = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  // ---------- One figure ----------
  function build(THREE, host) {
    const fig = host.getAttribute('data-fig') || 'squat';
    const eq = host.getAttribute('data-eq') || 'none';
    const muscles = (host.getAttribute('data-muscles') || '').split('|').filter(Boolean);
    const lit = worked(muscles);
    const POSES = LIME.POSES;
    const pat = POSES.patterns[fig] || POSES.patterns.squat;
    const front = POSES.front.includes(fig);
    const A = Object.assign({}, POSES.stand, pat.a);
    const B = Object.assign({}, A, pat.b);
    const dur = pat.dur || 2.4;

    const canvas = document.createElement('canvas');
    canvas.className = 'b3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const accent = new THREE.Color(cssColor('--accent', '#D9F20F'));

    // Lights: soft sky, warm key with shadow, accent rim from behind
    scene.add(new THREE.HemisphereLight(0xf4f6ee, 0x1a1c18, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5; key.shadow.camera.top = 3.5; key.shadow.camera.bottom = -1;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(accent, 0.9);
    rim.position.set(-3, 2, -2.5);
    scene.add(rim);

    // Materials
    const skin = new THREE.MeshStandardMaterial({ color: 0xd8dbd3, roughness: 0.62, metalness: 0.04 });
    const joint = new THREE.MeshStandardMaterial({ color: 0xb9bcb4, roughness: 0.55, metalness: 0.06 });
    const muscle = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.28, roughness: 0.42, metalness: 0.05 });
    const gear = new THREE.MeshStandardMaterial({ color: 0x2b2f2c, roughness: 0.38, metalness: 0.65 });
    const gearAccent = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.3, emissive: accent, emissiveIntensity: 0.15 });
    const pick = (part) => (lit.has(part) ? muscle : skin);

    // Floor: dark disc that catches the shadow, with a faint accent ring
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.ShadowMaterial({ opacity: 0.45 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const showRing = host.getAttribute('data-ring') !== '0';
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.3, 64), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.35 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; if (showRing) scene.add(ring);

    const UP = new THREE.Vector3(0, 1, 0);
    const segs = [];
    const balls = [];
    function seg(r1, r2, mat) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, 1, 18, 1), mat);
      m.castShadow = true; scene.add(m); segs.push(m); return m;
    }
    function ball(r, mat) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
      m.castShadow = true; scene.add(m); balls.push(m); return m;
    }
    const tmp = new THREE.Vector3();
    function place(mesh, p, q) {
      tmp.subVectors(q, p);
      const len = Math.max(0.001, tmp.length());
      mesh.position.copy(p).addScaledVector(tmp, 0.5);
      mesh.scale.set(1, len, 1);
      mesh.quaternion.setFromUnitVectors(UP, tmp.normalize());
    }

    // Body parts
    const P = {
      head: ball(0.19, skin),
      neckS: seg(0.075, 0.07, skin),
      chest: seg(0.2, 0.17, pick('chest')),
      abdomen: seg(0.15, 0.18, pick('abdomen')),
      chestBall: ball(0.2, pick('chest')),
      pelvis: ball(0.16, pick('pelvis')),
      sh1: ball(0.095, pick('shoulder')), sh2: ball(0.095, pick('shoulder')),
      ua1: seg(0.08, 0.06, pick('upperarm')), ua2: seg(0.08, 0.06, pick('upperarm')),
      el1: ball(0.058, joint), el2: ball(0.058, joint),
      fa1: seg(0.06, 0.045, skin), fa2: seg(0.06, 0.045, skin),
      hd1: ball(0.055, joint), hd2: ball(0.055, joint),
      hp1: ball(0.1, pick('thigh')), hp2: ball(0.1, pick('thigh')),
      th1: seg(0.11, 0.075, pick('thigh')), th2: seg(0.11, 0.075, pick('thigh')),
      kn1: ball(0.072, joint), kn2: ball(0.072, joint),
      sn1: seg(0.075, 0.05, pick('shin')), sn2: seg(0.075, 0.05, pick('shin')),
      ft1: seg(0.05, 0.045, joint), ft2: seg(0.05, 0.045, joint)
    };

    // Equipment
    const eqMeshes = [];
    function addGear(m) { m.castShadow = true; scene.add(m); eqMeshes.push(m); return m; }
    let bar = null, plates = [], bells = [];
    if (eq === 'barbell' && !front) {
      bar = addGear(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 12), gear));
      plates = [0, 1].map(() => addGear(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 32), gearAccent)));
    } else if (eq === 'dumbbell' || eq === 'goblet') {
      bells = [0, 1].slice(0, eq === 'goblet' ? 1 : 2).map(() => {
        const g = new THREE.Group();
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 10), gear);
        const pa = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 20), gearAccent);
        const pb = pa.clone();
        h.rotation.x = Math.PI / 2; pa.rotation.x = Math.PI / 2; pb.rotation.x = Math.PI / 2;
        pa.position.z = 0.12; pb.position.z = -0.12;
        [h, pa, pb].forEach((m) => { m.castShadow = true; g.add(m); });
        scene.add(g); eqMeshes.push(g); return g;
      });
    } else if (eq === 'kettlebell') {
      const g = new THREE.Group();
      const bodyK = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), gearAccent);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 24, Math.PI), gear);
      bodyK.position.y = -0.17; handle.position.y = -0.04; handle.rotation.y = Math.PI / 2;
      [bodyK, handle].forEach((m) => { m.castShadow = true; g.add(m); });
      scene.add(g); eqMeshes.push(g); bells = [g];
    }
    if (pat.bench) {
      const top = addGear(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.42), new THREE.MeshStandardMaterial({ color: 0x232624, roughness: 0.7 })));
      top.position.set(0.16, 0.7, 0); top.receiveShadow = true;
      [-0.6, 0.92].forEach((x) => {
        const leg = addGear(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.64, 0.3), gear));
        leg.position.set(x, 0.32, 0);
      });
    }
    if (pat.bar) {
      const pb = addGear(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2, 12), gear));
      pb.rotation.z = Math.PI / 2; pb.position.set(0, (137 - 12) / 50, 0);
    }

    // 2D pose point → 3D. Side views: near limbs toward the camera (+z).
    const v = (pt, z) => new THREE.Vector3((pt[0] - 100) / 50, (137 - pt[1]) / 50, z || 0);
    const Z = front ? 0 : 1;
    function pose(t) {
      const L = {};
      Object.keys(A).forEach((k) => {
        const a = A[k], b = B[k] || a;
        L[k] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      });
      return L;
    }

    function apply(L) {
      const head = v(L.head), neck = v(L.neck), hip = v(L.hip);
      const mid = neck.clone().lerp(hip, 0.45);
      P.head.position.copy(head);
      place(P.neckS, neck, head.clone().lerp(neck, 0.45));
      place(P.chest, mid, neck);
      place(P.abdomen, hip, mid);
      P.chestBall.position.copy(neck.clone().lerp(mid, 0.35));
      P.pelvis.position.copy(hip);

      // Shoulders / hips sit either side of the spine
      const sides = [1, 2].map((i) => {
        const near = i === 1;
        const zs = (near ? 1 : -1) * 0.21 * Z;
        const xs = front ? Math.sign(L['e' + i][0] - L.neck[0]) * 0.2 : 0;
        const sh = neck.clone().add(new THREE.Vector3(xs, -0.05, zs));
        const hz = (near ? 1 : -1) * 0.11 * Z;
        const hx = front ? Math.sign(L['k' + i][0] - L.hip[0] || (near ? 1 : -1)) * 0.1 : 0;
        const hp = hip.clone().add(new THREE.Vector3(hx, 0, hz));
        const z1 = zs * 1.05, z2 = hz * 1.05;
        const el = v(L['e' + i], z1), hd = v(L['h' + i], z1);
        const kn = v(L['k' + i], z2), ft = v(L['f' + i], z2);
        return { sh, hp, el, hd, kn, ft };
      });
      sides.forEach((s, j) => {
        const n = j + 1;
        P['sh' + n].position.copy(s.sh);
        place(P['ua' + n], s.sh, s.el); P['el' + n].position.copy(s.el);
        place(P['fa' + n], s.el, s.hd); P['hd' + n].position.copy(s.hd);
        P['hp' + n].position.copy(s.hp);
        place(P['th' + n], s.hp, s.kn); P['kn' + n].position.copy(s.kn);
        place(P['sn' + n], s.kn, s.ft);
        // foot points forward (+x side view, +z front view)
        const toe = s.ft.clone().add(front ? new THREE.Vector3(0, -0.01, 0.2) : new THREE.Vector3(0.2, -0.01, 0));
        place(P['ft' + n], s.ft.clone().add(new THREE.Vector3(0, 0.02, 0)), toe);
      });

      if (bar) {
        const c = sides[0].hd.clone().lerp(sides[1].hd, 0.5);
        bar.position.copy(c); bar.rotation.set(Math.PI / 2, 0, 0);
        plates[0].position.set(c.x, c.y, c.z + 0.6); plates[1].position.set(c.x, c.y, c.z - 0.6);
        plates.forEach((p) => p.rotation.set(Math.PI / 2, 0, 0));
      }
      if (eq === 'goblet' && bells[0]) {
        bells[0].position.copy(sides[0].hd.clone().lerp(sides[1].hd, 0.5)).add(new THREE.Vector3(-0.04, 0.02, 0));
        bells[0].rotation.set(Math.PI / 2, 0, 0);
      } else bells.forEach((g, j) => { g.position.copy(sides[j].hd); });
    }

    // Camera framing: fit both poses
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const fitBox = new THREE.Box3();
    [0, 1].forEach((t) => { apply(pose(t)); Object.values(P).forEach((m) => fitBox.expandByObject(m)); });
    eqMeshes.forEach((m) => fitBox.expandByObject(m));
    const center = fitBox.getCenter(new THREE.Vector3());
    const size = fitBox.getSize(new THREE.Vector3());

    let aspect = 1;
    function frame(angle) {
      const span = Math.max(size.y * 1.12, (Math.max(size.x, size.z) * 1.1) / aspect, 1.5);
      const dist = span / (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.position.set(center.x + Math.sin(angle) * dist, center.y + dist * 0.3, center.z + Math.cos(angle) * dist);
      camera.lookAt(center.x, center.y - size.y * 0.04, center.z);
    }

    function resize() {
      const w = host.clientWidth || 300, h = host.clientHeight || 220;
      aspect = w / h;
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    const still = reduced();
    const base = front ? 0.25 : 0.42;
    const t0 = performance.now();
    function draw(now) {
      const t = (now - t0) / 1000;
      const ph = still ? 1 : (1 - Math.cos((2 * Math.PI * t) / dur)) / 2;
      apply(pose(ph));
      frame(still ? base : base + Math.sin(t * 0.35) * 0.38);
      renderer.render(scene, camera);
    }

    resize();
    let ro = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => resize()); ro.observe(host); }

    const inst = {
      host, canvas, draw, still,
      drawn: false,
      dispose() {
        if (ro) ro.disconnect();
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        [skin, joint, muscle, gear, gearAccent, ring.material, floor.material].forEach((m) => m.dispose());
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
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
