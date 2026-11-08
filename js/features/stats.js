/* Numbers worked out from saved sessions: weekly count, streak, volume,
   personal records, heat-map and the "Get started" checklist. Pure reads
   except recordPRs(), which updates state.prs. */
(function () {
  'use strict';

  const U = LIME.U;
  const st = () => LIME.store.state;

  function sessionsBetween(from, to) {
    return st().sessions.filter((s) => s.end >= from.getTime() && s.end < to.getTime());
  }

  function thisWeek() {
    const ws = U.weekStart();
    return sessionsBetween(ws, U.addDays(ws, 7));
  }

  function weeklyGoal() { return (st().profile && st().profile.days) || 3; }

  /** Weeks in a row the weekly goal was met. This week counts once met; an unfinished week doesn't break it. */
  function weekStreak() {
    const goal = weeklyGoal();
    let ws = U.weekStart();
    let n = 0;
    const cur = sessionsBetween(ws, U.addDays(ws, 7)).length;
    if (cur >= goal) n++;
    for (let i = 0; i < 520; i++) {
      ws = U.addDays(ws, -7);
      const c = sessionsBetween(ws, U.addDays(ws, 7)).length;
      if (c >= goal) n++; else break;
    }
    return n;
  }

  function daysThisWeek() {
    const ws = U.weekStart();
    const keys = new Set(thisWeek().map((s) => U.dayKey(s.end)));
    return Array.from({ length: 7 }, (_, i) => {
      const d = U.addDays(ws, i);
      return { label: 'MTWTFSS'[i], done: keys.has(U.dayKey(d)), today: U.dayKey(d) === U.dayKey() };
    });
  }

  function totals() {
    const s = st().sessions;
    return {
      workouts: s.length,
      seconds: s.reduce((a, x) => a + (x.durationSec || 0), 0),
      volumeKg: s.reduce((a, x) => a + (x.volumeKg || 0), 0),
      sets: s.reduce((a, x) => a + (x.sets || []).filter((y) => y.done).length, 0)
    };
  }

  /** Last n weeks of volume (kg) or session count. */
  function weekly(n, metric) {
    const out = [];
    let ws = U.addDays(U.weekStart(), -7 * (n - 1));
    for (let i = 0; i < n; i++) {
      const list = sessionsBetween(ws, U.addDays(ws, 7));
      const v = metric === 'count' ? list.length
        : metric === 'minutes' ? Math.round(list.reduce((a, x) => a + (x.durationSec || 0), 0) / 60)
          : list.reduce((a, x) => a + (x.volumeKg || 0), 0);
      out.push({ label: U.fmtDate(ws, { day: 'numeric', month: 'numeric' }).replace(/\//g, '/'), value: v, hi: i === n - 1 });
      ws = U.addDays(ws, 7);
    }
    return out;
  }

  /** 12×7 grid of minutes trained per day, oldest first, column = week. */
  function heat(weeks) {
    weeks = weeks || 12;
    const byDay = {};
    st().sessions.forEach((s) => { const k = U.dayKey(s.end); byDay[k] = (byDay[k] || 0) + (s.durationSec || 0); });
    const start = U.addDays(U.weekStart(), -7 * (weeks - 1));
    const today = U.dayKey();
    const cells = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = U.addDays(start, i);
      const k = U.dayKey(d);
      const sec = byDay[k] || 0;
      const lvl = sec === 0 ? 0 : sec < 20 * 60 ? 1 : sec < 40 * 60 ? 2 : 3;
      cells.push({ key: k, lvl, future: k > today });
    }
    return cells;
  }

  const e1rm = (kg, reps) => kg * (1 + reps / 30);

  /** Compare a finished session against stored bests. Updates state.prs. Returns new PRs. */
  function recordPRs(session) {
    const prs = st().prs;
    const found = [];
    (session.sets || []).filter((x) => x.done).forEach((x) => {
      const ex = LIME.ex(x.exId);
      if (!ex) return;
      const cur = prs[x.exId] || {};
      const next = Object.assign({}, cur);
      if (ex.weighted && x.kg > 0 && x.reps > 0) {
        const est = e1rm(x.kg, x.reps);
        if (!cur.e1rm || est > cur.e1rm + 0.01) {
          next.e1rm = est; next.kg = x.kg; next.reps = x.reps; next.date = session.end;
          if (cur.e1rm) found.push({ exId: x.exId, text: `${U.fmtNum(x.kg, 1)} kg × ${x.reps}` });
        }
      } else if (ex.type === 'time' && x.secs > 0) {
        if (!cur.maxSecs || x.secs > cur.maxSecs) {
          next.maxSecs = x.secs; next.date = session.end;
          if (cur.maxSecs) found.push({ exId: x.exId, text: `${x.secs} s` });
        }
      } else if (x.reps > 0) {
        if (!cur.maxReps || x.reps > cur.maxReps) {
          next.maxReps = x.reps; next.date = session.end;
          if (cur.maxReps) found.push({ exId: x.exId, text: `${x.reps} reps` });
        }
      }
      prs[x.exId] = next;
    });
    // one PR per exercise (the best set already wins above)
    const seen = new Set();
    return found.filter((f) => (seen.has(f.exId) ? false : seen.add(f.exId)));
  }

  /** Last logged weight for an exercise (for pre-filling the next workout). */
  function lastKg(exId) {
    const s = st().sessions;
    for (let i = s.length - 1; i >= 0; i--) {
      const sets = (s[i].sets || []).filter((x) => x.exId === exId && x.done && x.kg > 0);
      if (sets.length) return sets[sets.length - 1].kg;
    }
    return 0;
  }

  /** The sets done for an exercise in the most recent workout that had it. */
  function lastSets(exId) {
    const s = st().sessions;
    for (let i = s.length - 1; i >= 0; i--) {
      const sets = (s[i].sets || []).filter((x) => x.exId === exId && x.done);
      if (sets.length) return { sets, date: s[i].end };
    }
    return null;
  }

  // Smallest sensible jump per equipment: [kg, lb]
  const STEP = { barbell: [2.5, 5], dumbbell: [2, 5], kettlebell: [4, 10] };

  /**
   * Next weight for a weighted exercise, from the last workout's heaviest sets.
   * up   — every top set reached the target reps: add one step.
   * down — most top sets fell well short (under 70% of target): drop one step.
   * hold — otherwise: same weight, aim for every rep.
   * Returns null for bodyweight/timed moves or with no history.
   */
  function suggest(exId, targetReps, units) {
    const ex = LIME.ex(exId);
    if (!ex || !ex.weighted || !targetReps) return null;
    const last = lastSets(exId);
    if (!last) return null;
    const work = last.sets.filter((x) => x.kg > 0 && x.reps > 0);
    if (!work.length) return null;
    const kg = Math.max(...work.map((x) => x.kg));
    const top = work.filter((x) => Math.abs(x.kg - kg) < 0.01);
    const reps = top.map((x) => x.reps);
    const step = STEP[ex.equipment] || STEP.dumbbell;
    const stepShown = units === 'lb' ? step[1] : step[0];
    const stepKg = units === 'lb' ? U.toKg(step[1], 'lb') : step[0];
    const r2 = (n) => Math.round(n * 100) / 100;
    if (reps.every((r) => r >= targetReps)) {
      return { kind: 'up', kg: r2(kg + stepKg), from: kg, step: stepShown, reps, why: `You hit ${targetReps} reps on every set last time.` };
    }
    const short = reps.filter((r) => r < targetReps * 0.7).length;
    if (short > reps.length / 2 && kg - stepKg > 0) {
      return { kind: 'down', kg: r2(kg - stepKg), from: kg, step: stepShown, reps, why: `Last time: ${reps.join(', ')} reps. A little lighter to hit ${targetReps}.` };
    }
    return { kind: 'hold', kg, from: kg, step: 0, reps, why: `Last time: ${reps.join(', ')} reps. Hit ${targetReps} on every set to go up.` };
  }

  function checklist() {
    const s = st();
    return [
      { id: 'profile', label: 'Set up your profile', done: !!s.profile, href: '#/settings/profile' },
      { id: 'first', label: 'Finish your first workout', done: s.sessions.length > 0, href: '#/start' },
      { id: 'weight', label: 'Log your body weight', done: s.bodyLog.length > 0, href: '#/progress/weight' },
      { id: 'home', label: 'Add LIME to your Home Screen', done: U.isStandalone(), href: '#/settings/install' },
      { id: 'backup', label: 'Save a backup file', done: !!s.ui.lastBackup, href: '#/settings/backup' }
    ];
  }

  LIME.stats = { thisWeek, weeklyGoal, weekStreak, daysThisWeek, totals, weekly, heat, recordPRs, lastKg, lastSets, suggest, checklist, e1rm };
})();
