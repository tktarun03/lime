/* Builds a weekly plan from the profile (goal, level, equipment, days, minutes).
   Pure function of the profile, so it can be rebuilt any time from Settings. */
(function () {
  'use strict';

  // Preference lists: hardest/most effective first; the first one the user can do wins.
  const SLOTS = {
    warm: ['jacks', 'high-knees'],
    squat: ['back-squat', 'goblet-squat', 'squat', 'box-squat'],
    hinge: ['deadlift', 'rdl', 'kb-swing', 'glute-bridge'],
    hinge2: ['kb-swing', 'glute-bridge', 'rdl'],
    lunge: ['db-lunge', 'lunge'],
    hpush: ['bench-press', 'db-bench', 'pushup', 'band-press', 'knee-pushup'],
    vpush: ['ohp', 'db-press', 'pike-pushup', 'pushup'],
    hpull: ['bb-row', 'db-row', 'band-row', 'superman'],
    vpull: ['pullup', 'neg-pullup', 'band-row', 'superman'],
    arms: ['db-curl', 'band-row', 'superman'],
    calf: ['calf-raise'],
    core: ['plank', 'crunch', 'russian-twist'],
    core2: ['russian-twist', 'crunch', 'plank'],
    cardio: ['climber', 'high-knees', 'jacks'],
    mob: ['ham-stretch', 'hip-flexor'],
    mob2: ['hip-flexor', 'ham-stretch']
  };

  const DAYS = {
    fullA: { title: 'Full Body A', focus: 'Squat · Push · Pull', slots: ['squat', 'hpush', 'hpull', 'hinge', 'core', 'cardio', 'lunge'] },
    fullB: { title: 'Full Body B', focus: 'Lunge · Press · Pull', slots: ['lunge', 'vpush', 'vpull', 'hinge2', 'core2', 'calf', 'cardio'] },
    fullC: { title: 'Full Body C', focus: 'Strength · Core', slots: ['squat', 'hpush', 'vpull', 'hinge', 'core', 'cardio', 'arms'] },
    upper: { title: 'Upper Body', focus: 'Chest · Back · Shoulders', slots: ['hpush', 'hpull', 'vpush', 'vpull', 'arms', 'core'] },
    lower: { title: 'Lower Body', focus: 'Legs · Glutes · Core', slots: ['squat', 'hinge', 'lunge', 'calf', 'core2', 'hinge2'] },
    push: { title: 'Push', focus: 'Chest · Shoulders · Triceps', slots: ['hpush', 'vpush', 'core', 'cardio', 'calf'] },
    pull: { title: 'Pull', focus: 'Back · Biceps', slots: ['hpull', 'vpull', 'arms', 'core2', 'hinge2'] },
    legs: { title: 'Legs', focus: 'Quads · Glutes · Hamstrings', slots: ['squat', 'hinge', 'lunge', 'calf', 'core'] },
    conditioning: { title: 'Conditioning', focus: 'Cardio · Core', slots: ['cardio', 'core', 'squat', 'core2', 'lunge'] },
    mobility: { title: 'Mobility Flow', focus: 'Stretch · Core', slots: ['mob', 'core', 'hinge2', 'mob2', 'core2'] }
  };

  const SPLITS = {
    2: ['fullA', 'fullB'],
    3: ['fullA', 'fullB', 'fullC'],
    4: ['upper', 'lower', 'upper', 'lower'],
    5: ['push', 'pull', 'legs', 'upper', 'conditioning'],
    6: ['push', 'pull', 'legs', 'push', 'pull', 'legs']
  };

  // goal → how sets look
  const GOALS = {
    strength: { reps: 6, bwMult: 1, sets: 1, rest: 120, label: 'Get stronger' },
    muscle: { reps: 10, bwMult: 1, sets: 1, rest: 75, label: 'Build muscle' },
    fatloss: { reps: 14, bwMult: 1.2, sets: 0, rest: 40, label: 'Lose fat' },
    general: { reps: null, bwMult: 1, sets: 0, rest: 60, label: 'Get fit & healthy' },
    mobility: { reps: null, bwMult: 0.8, sets: -1, rest: 30, label: 'Move better' }
  };

  // minutes → number of exercises and base sets
  const SIZE = { 20: [4, 2], 30: [5, 3], 45: [6, 3], 60: [7, 3] };

  function canDo(ex, equip, levelCap) {
    if (ex.level > levelCap) return false;
    return ex.needs.every((n) => equip.includes(n));
  }

  function pick(slot, equip, levelCap, used) {
    const list = SLOTS[slot] || [];
    for (const id of list) {
      const ex = LIME.ex(id);
      if (ex && !used.has(id) && canDo(ex, equip, levelCap)) return ex;
    }
    // fall back: anything allowed in the same group
    const first = LIME.ex(list[0]);
    if (!first) return null;
    return LIME.EXERCISES.find((e) => e.group === first.group && !used.has(e.id) && canDo(e, equip, levelCap)) || null;
  }

  function targetFor(ex, goal, level) {
    const g = GOALS[goal] || GOALS.general;
    const lvl = level === 'beginner' ? 0.8 : level === 'advanced' ? 1.2 : 1;
    if (ex.type === 'time') return { secs: Math.round(((ex.secs || 30) * lvl) / 5) * 5 };
    if (ex.weighted && g.reps) return { reps: g.reps };
    const base = (ex.reps || 10) * g.bwMult * lvl;
    return { reps: Math.max(4, Math.round(base)) };
  }

  function build(profile) {
    const days = LIME.U.clamp(Number(profile.days) || 3, 2, 6);
    const equip = (profile.equipment || ['none']).filter((e) => e !== 'none');
    const levelCap = profile.level === 'beginner' ? 2 : 3;
    const g = GOALS[profile.goal] || GOALS.general;
    const size = SIZE[profile.minutes] || SIZE[30];
    const nEx = size[0];
    let sets = size[1] + g.sets + (profile.level === 'advanced' ? 1 : 0);
    sets = LIME.U.clamp(sets, 1, 5);

    let split = SPLITS[days].slice();
    if (profile.goal === 'mobility') split = split.map((k, i) => (i % 2 ? 'mobility' : k));
    if (profile.goal === 'fatloss' && days >= 4) split[split.length - 1] = 'conditioning';

    const out = split.map((key, i) => {
      const tpl = DAYS[key];
      const used = new Set();
      const items = [];
      // warm-up
      const warm = pick('warm', equip, levelCap, used);
      if (warm) { used.add(warm.id); items.push({ exId: warm.id, sets: 1, secs: 40, rest: 20, warmup: true }); }
      for (const slot of tpl.slots) {
        if (items.filter((x) => !x.warmup && !x.cooldown).length >= nEx) break;
        const ex = pick(slot, equip, levelCap, used);
        if (!ex) continue;
        used.add(ex.id);
        const t = targetFor(ex, profile.goal, profile.level);
        const rest = ex.weighted ? g.rest : Math.min(g.rest, 60);
        items.push(Object.assign({ exId: ex.id, sets: ex.group === 'cardio' ? Math.max(1, sets - 1) : sets, rest }, t));
      }
      // cool-down
      if (profile.minutes >= 30 || profile.goal === 'mobility') {
        const cd = pick('mob', equip, levelCap, used);
        if (cd) items.push({ exId: cd.id, sets: 1, secs: 40, rest: 0, cooldown: true });
      }
      return { id: 'd' + (i + 1), key, title: tpl.title, focus: tpl.focus, items };
    });

    return { createdAt: Date.now(), days: out, next: 0 };
  }

  /** Rough duration in seconds: ~3 s per rep, plus rests, plus set-up time. */
  function estimate(day) {
    let s = 0;
    day.items.forEach((it) => {
      const work = it.secs ? it.secs : (it.reps || 10) * 3;
      s += it.sets * (work + 15) + (it.sets - 1) * it.rest + it.rest;
    });
    return s;
  }

  /** Alternatives for swapping during a workout (same group, user can do it). */
  function alternatives(exId, profile) {
    const ex = LIME.ex(exId);
    if (!ex) return [];
    const equip = (profile.equipment || []).filter((e) => e !== 'none');
    const ok = (e) => e && e.id !== exId && e.needs.every((n) => equip.includes(n));
    const list = [];
    [ex.easier, ex.harder].forEach((id) => { const e = LIME.ex(id); if (ok(e)) list.push(e); });
    LIME.EXERCISES.forEach((e) => { if (e.group === ex.group && ok(e) && !list.includes(e)) list.push(e); });
    return list.slice(0, 6);
  }

  LIME.planner = { build, estimate, alternatives, GOALS, canDo };
})();
