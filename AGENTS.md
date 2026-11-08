# AGENTS.md — LIME Workout

Read this first. It's the map for any person or AI changing this repo.

## What the app is

LIME is a mobile-first workout PWA. A short intro and step-by-step profile
set-up build a weekly plan from the user's goal, level, equipment, days and
session length. A full-screen player runs the workout (sets, kg/reps, timed
sets, rest timer, 3-2-1, screen kept on, voice and beeps). Progress shows
streak, weekly volume, a 12-week calendar, body weight and records.

**All data stays on the device** (IndexedDB, localStorage fallback). No
account, no server, no analytics. Backup/restore is a JSON file.

Look: dark only, neon-lime accent, thin type — Oswald 200–300 (display, slanted) + Inter 300 (body),
frosted glass surfaces (`.glass` and friends) over an ambient glow on `body::before`, speckle
texture on "poster moments" only (intro, player, rest, done screen).
All sizes are `rem`, so Settings → Text size (Auto = phone size, S/M/L/XL) scales everything.
Keep inputs at `max(16px, …)` so iPhone doesn't zoom.

## Repo map

```
index.html              shell: splash, #view, tab bar, script tags in load order
manifest.webmanifest    PWA manifest
sw.js                   service worker (page network-first, versioned assets cache-first)
css/app.css             all styles; tokens at the top
fonts/                  self-hosted variable Oswald + Inter (OFL) — no Google Fonts requests
vendor/three.min.js     three.js r149 (MIT), loaded only when a 3D body is shown
icons/                  app icons (svg + png); favicon.ico at root
media/ex/               exercise photos: <id>-a.webp (start), -b.webp (end), -t.webp (thumb)
media/                  optional exercise video clips (see media/README.md)
tools/build-art.py      turns 1200×1200 transparent PNGs into media/ex/*.webp + js/data/art.js
js/core/                version, util, store (storage + migrate), timer (+ wake lock), audio
js/data/                exercises, figures (key poses + SVG fallback drawings), planner
js/ui/                  icons, toast, sheet, charts, body3d (anatomical 3D figures)
js/features/            stats, onboarding, home, library, player, plan (editor), progress, settings
js/app.js               boot, router, look, What's new, backup reminder, self-check
tests/                  structure.test.mjs (node) + flows.spec.mjs (Playwright)
.github/workflows/      CI: tests gate the Pages deploy
```

## Where things are

| I want to…                                   | Go to |
|----------------------------------------------|-------|
| Add or edit an exercise                      | `js/data/exercises.js` (fields documented at the top) |
| Add or replace exercise photos               | put `<id>-a.png` / `<id>-b.png` (1200×1200, transparent) in a folder, run `python3 tools/build-art.py <folder> media/ex js/data/art.js` |
| Add a video clip for an exercise             | put MP4 in `media/`, set `video: 'media/<id>.mp4'` |
| Draw a new movement illustration             | `js/data/figures.js` → add a pattern with poses `a` and `b` |
| Change how plans are built                   | `js/data/planner.js` (`SLOTS`, `DAYS`, `SPLITS`, `GOALS`, `SIZE`) |
| Add a saved field                            | `js/core/store.js` → `defaults()` **and** `migrate()` |
| Change the workout flow                      | `js/features/player.js` |
| Change the plan editor                       | `js/features/plan.js` (routes `#/plan`, `#/plan/<dayId>`) |
| Change weight-suggestion rules               | `js/features/stats.js` → `suggest()` (step sizes in `STEP`) |
| Change streak / PR / volume maths            | `js/features/stats.js` |
| Add a screen                                 | new file in `js/features/`, route in `js/app.js` `ROUTES`, script tag in `index.html`, asset in `sw.js` |
| Show a notice                                | `LIME.toast(title, { body, kind, undo, action })` |
| Colours / fonts / spacing                    | tokens at the top of `css/app.css` |

## Golden rules

1. **Plain scripts, no build step.** One global, `LIME`, defined in
   `js/core/version.js`. Every other file is an IIFE that attaches to it.
   A test enforces this.
2. **Escape all user text** with `LIME.U.esc()` before it goes into HTML.
3. **Every new saved field gets a default in `migrate()`.** Never rename or
   remove a field without a migration step.
4. **Nothing leaves the device** unless the user chooses it (share sheet,
   backup file). Pin any CDN version if one is ever added (there are none now).
5. **Every data change shows a notice**; offer Undo when it can be safely
   reversed, and the Undo must re-check current state first.
6. **Mobile Safari first:** inputs ≥16px, tap targets ≥44px, text ≥11px,
   safe areas via `env(safe-area-inset-*)`, no `100vh` stacks.
7. **Timers use clock time** (`LIME.timer.countdown`), never tick counting —
   iPhone pauses JS when the screen locks.
8. **Versions move together** — see "Release" below.

## Test

```
npm install                 # once: Playwright test runner
npm run test:structure      # versions, load order, globals, SW assets, exercise data, 1,200 plan combos
npx playwright test         # browser flows at 375×667, 390×844, 430×932
```

The app's own self-check runs on the phone: Settings → Self-check.

## Release

Use the playbook in `.claude/skills/release/SKILL.md`. Short form:
bump `LIME.VERSION` + add a `RELEASES` entry → `CHANGELOG.md` → every `?v=`
in `index.html` → `VERSION` in `sw.js` → `package.json` → tests → commit →
push → confirm both "Tests" and "Deploy" runs succeed. Report flaws first.

## Deploy

GitHub Pages via Actions (`.github/workflows/deploy.yml`). Pages source must
be set to **GitHub Actions**. The deploy job only runs after tests pass.

## Known sharp edges

- **iPhone Home Screen storage is separate from Safari.** Users must back up in
  Safari and restore inside the installed app if they set up in Safari first.
- **Safari may delete site data after ~7 days without a visit.** Hence the
  backup reminder and the Add to Home Screen item in the checklist.
- **No health data.** A web app cannot read Apple Health / Health Connect.
  That needs a native wrapper (Capacitor) — roadmap phase 3.
- **No alerts while closed.** No server means no push; rest timers only alert
  while the app is open (screen is kept on during workouts).
- **iPhone can't vibrate** from the web; beeps need one tap first to unlock audio.
- IndexedDB writes are async; `store.flushSync()` mirrors state to
  localStorage on `pagehide` so a closed app doesn't lose the last set.
  `load()` takes whichever copy has the newer `savedAt`.
- **Edited plans:** any editor change sets `plan.edited`; profile changes then
  keep the plan instead of rebuilding it. `planner.build()` returns `edited: false`.
- **Demo order:** video → photos (`LIME.ART`, if Settings → Exercise demos is
  Photos) → 3D body (if 3D) → SVG drawing. `LIME.media(ex, opts)` decides.
- Exercise photos are AI-generated prototypes supplied by the owner; four had a
  sportswear logo retouched out. Re-check new batches for logos before adding.
  All 35 now show the same athlete. Open photo issues: high-knees and climber
  start/end are nearly identical (same knee up), so their loop barely moves —
  need an end photo with the other knee. russian-twist-b was supplied mirrored
  and is flipped back during import.
- SMIL animations in figures: fine in Safari/Chrome; turned off for
  `prefers-reduced-motion`.
