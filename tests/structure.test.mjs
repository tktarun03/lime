// Structure checks — no browser needed. Run: node tests/structure.test.mjs
// 1. Versions match: LIME.VERSION = sw.js VERSION = every ?v= in index.html = newest CHANGELOG entry = package.json
// 2. Every script in index.html exists, and every JS file is loaded exactly once
// 3. Only one top-level global (LIME); every other file is wrapped in an IIFE
// 4. Every service-worker asset exists
// 5. Every exercise has valid fields, figure and variation links
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
let failed = 0;
const ok = (cond, msg) => { if (cond) console.log('  ✓ ' + msg); else { failed++; console.log('  ✗ ' + msg); } };

console.log('Versions');
const version = read('js/core/version.js').match(/VERSION:\s*'([^']+)'/)[1];
const swVersion = read('sw.js').match(/const VERSION = '([^']+)'/)[1];
const html = read('index.html');
const vParams = [...html.matchAll(/\?v=([0-9.]+)/g)].map((m) => m[1]);
const changelogTop = read('CHANGELOG.md').match(/^## \[?v?([0-9.]+)/m)[1];
const pkg = JSON.parse(read('package.json')).version;
const releasesTop = read('js/core/version.js').match(/version:\s*'([^']+)'/)[1];
ok(swVersion === version, `sw.js VERSION ${swVersion} = ${version}`);
ok(vParams.length > 10 && vParams.every((v) => v === version), `all ${vParams.length} ?v= links = ${version}`);
ok(changelogTop === version, `CHANGELOG newest entry ${changelogTop} = ${version}`);
ok(pkg === version, `package.json ${pkg} = ${version}`);
ok(releasesTop === version, `RELEASES[0] ${releasesTop} = ${version}`);

console.log('Scripts and load order');
const scripts = [...html.matchAll(/<script src="([^"?]+)\?v=/g)].map((m) => m[1]);
scripts.forEach((s) => ok(existsSync(join(ROOT, s)), `exists: ${s}`));
const walk = (d) => readdirSync(join(ROOT, d)).flatMap((f) => {
  const p = join(d, f);
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
});
const allJs = walk('js');
allJs.forEach((f) => ok(scripts.filter((s) => s === f).length === 1, `loaded once: ${f}`));
ok(scripts[0] === 'js/core/version.js', 'version.js loads first (defines LIME)');
ok(scripts[scripts.length - 1] === 'js/app.js', 'app.js loads last');
const order = ['core', 'data', 'ui', 'features'];
const ranks = scripts.slice(0, -1).map((s) => order.indexOf(s.split('/')[1]));
ok(ranks.every((r, i) => i === 0 || r >= ranks[i - 1]), 'order: core → data → ui → features → app');

console.log('Globals');
const tops = [];
allJs.forEach((f) => {
  const src = read(f);
  src.split('\n').forEach((line) => {
    const m = line.match(/^(?:var|let|const|function|class)\s+([A-Za-z_$][\w$]*)/);
    if (m) tops.push({ name: m[1], file: f });
  });
  if (f !== 'js/core/version.js') ok(/^\s*(\/\*[\s\S]*?\*\/\s*)?\(function \(\) \{/.test(src), `IIFE-wrapped: ${f}`);
});
const names = tops.map((t) => t.name);
ok(new Set(names).size === names.length, 'top-level names are unique');
ok(names.length === 1 && names[0] === 'LIME', `only global is LIME (found: ${names.join(', ') || 'none'})`);

console.log('Service worker assets');
const swAssets = [...read('sw.js').matchAll(/'([^']+?)'(?: \+ V)?,?\n/g)].map((m) => m[1]).filter((a) => /\.(js|css|png|svg|woff2|webmanifest|html)$/.test(a));
swAssets.forEach((a) => ok(existsSync(join(ROOT, a)), `sw asset exists: ${a}`));
scripts.forEach((s) => ok(read('sw.js').includes(`'${s}' + V`), `sw caches ${s}`));

console.log('Exercise data');
const ctx = { LIME: {}, console };
vm.createContext(ctx);
['js/core/version.js', 'js/core/util.js', 'js/data/exercises.js', 'js/data/figures.js', 'js/data/planner.js'].forEach((f) => {
  vm.runInContext(read(f).replace(/^var LIME =/m, 'LIME ='), ctx, { filename: f });
});
const L = ctx.LIME;
const ids = new Set();
L.EXERCISES.forEach((e) => {
  const errs = [];
  if (ids.has(e.id)) errs.push('duplicate id'); ids.add(e.id);
  ['id', 'name', 'group', 'equipment', 'fig', 'cue'].forEach((k) => { if (!e[k]) errs.push('missing ' + k); });
  if (!L.FIGURES.includes(e.fig)) errs.push('unknown figure ' + e.fig);
  if (!(e.steps && e.steps.length >= 2)) errs.push('needs 2+ steps');
  if (!(e.mistakes && e.mistakes.length >= 1)) errs.push('needs mistakes');
  if (e.type === 'time' ? !e.secs : !e.reps) errs.push('no default target');
  if (errs.length) ok(false, `${e.id}: ${errs.join(', ')}`);
});
ok(true, `${L.EXERCISES.length} exercises checked`);
L.EXERCISES.forEach((e) => ['easier', 'harder'].forEach((k) => { if (e[k]) ok(!!L.ex(e[k]), `${e.id}.${k} → ${e[k]} exists`); }));

console.log('Planner');
let planErr = 0;
for (const goal of Object.keys(L.planner.GOALS)) for (const level of ['beginner', 'intermediate', 'advanced'])
  for (const days of [2, 3, 4, 5, 6]) for (const minutes of [20, 30, 45, 60])
    for (const equipment of [['none'], ['dumbbell'], ['dumbbell', 'bench', 'pullup'], ['barbell', 'bench', 'dumbbell', 'kettlebell', 'band', 'pullup']]) {
      const p = L.planner.build({ goal, level, days, minutes, equipment });
      const bad = p.days.length !== days || p.days.some((d) => d.items.filter((i) => !i.warmup && !i.cooldown).length < 3 ||
        d.items.some((i) => { const e = L.ex(i.exId); return !e || !e.needs.every((n) => equipment.includes(n)) || (level === 'beginner' && e.level > 2); }));
      if (bad) { planErr++; if (planErr < 5) console.log('    bad plan', goal, level, days, minutes, equipment.join('+')); }
    }
ok(planErr === 0, 'plans valid for 1,200 profile combinations (equipment and level respected, 3+ moves a day)');

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll structure checks passed');
process.exit(failed ? 1 : 0);
