# Architecture

## Boot

`index.html` loads plain scripts in order: core → data → ui → features →
`app.js`. `app.js` runs `boot()`: load state → apply look → route → hide
splash → (600 ms later) What's new / resume / backup reminder.

## Routing

Hash routes, handled in `app.js` `ROUTES`:

| Route | Screen | Tab bar |
|---|---|---|
| `#/onboarding` | intro tour, then set-up steps | no |
| `#/home` | home | yes |
| `#/library`, `#/library/<exerciseId>` | library (+ detail sheet) | yes |
| `#/progress`, `#/progress/weight` | progress (+ log weight) | yes |
| `#/settings`, `#/settings/<profile\|plan\|install\|sensors\|versions\|check\|backup>` | settings (+ sheet) | yes |
| `#/start` | starts the next plan day | no |
| `#/workout` | player (needs `state.active`) | no |

No profile → always `#/onboarding`. A screen can register a cleanup with
`LIME.app.setCleanup(fn)`; the router runs it before the next screen.

## Data shape (state, schema 1)

```js
{
  schema: 1,
  savedAt: 1730990000000,                // set on every save
  profile: {
    name, photo /* 192px JPEG data URL or null */,
    goal: 'strength'|'muscle'|'fatloss'|'general'|'mobility',
    level: 'beginner'|'intermediate'|'advanced',
    equipment: ['none'] | ['dumbbell','bench',…],
    days: 2–6, minutes: 20|30|45|60, units: 'kg'|'lb',
    bodyWeight /* kg or null */, notes, createdAt
  },
  plan: {
    createdAt, next /* index of next day */,
    days: [{ id:'d1', key:'fullA', title, focus,
             items: [{ exId, sets, reps? , secs?, rest, warmup?, cooldown? }] }]
  },
  sessions: [{ id, dayId, title, start, end, durationSec,
               sets: [{ exId, setNo, reps, secs, kg, done }],
               volumeKg, prs: [{ exId, text }] }],   // oldest first
  bodyLog: [{ date:'YYYY-MM-DD', kg }],
  prs: { [exId]: { e1rm?, kg?, reps?, maxReps?, maxSecs?, date } },
  active: null | {                                    // workout in progress
    dayId, title, startedAt, items /* copy of the day */, idx, setIdx,
    log: [{ exId, itemIdx, setNo, reps, secs, kg, done, at }],
    phase: 'work'|'rest', restEndAt, restTotal, needsCountdown
  },
  settings: { sound, voice, countdown, keepAwake, accent, text, restDefault },
  ui: { introSeen, checklistHidden, lastVersionSeen, lastBackup, lastBackupNag, demo }
}
```

All weights are stored in **kg**; converted for display with `U.kgTo()`.

## Storage

`store.save()` queues an IndexedDB write (in order). On `pagehide` /
hidden, `flushSync()` mirrors to localStorage. `load()` uses the copy with
the newer `savedAt`. `migrate()` fills defaults for anything missing — it
also runs on restored backups.

## Records

`stats.recordPRs(session)`: weighted moves compare estimated 1-rep max
(Epley: kg × (1 + reps/30)); bodyweight moves compare max reps; timed moves
compare max seconds. The first time an exercise is done sets the baseline
silently; later improvements are reported as new records. Deleting a
session rebuilds all records from history.

## Plans

`planner.build(profile)`: days → split (`SPLITS`), each day has ordered
slots (`DAYS`), each slot has a preference list (`SLOTS`, hardest first).
The first exercise the user's equipment and level allow wins. Goal sets
reps and rest; minutes set the number of exercises and base sets.
