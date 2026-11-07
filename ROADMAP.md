# Roadmap

## Phase 1 — v0.1 (done)

Intro, profile set-up, plan builder, workout player, library with moving
illustrations, progress, settings, backup/restore, demo mode, PWA offline.

## Phase 2 — next

- [ ] Test on a real iPhone (Home Screen install, wake lock, audio unlock, safe areas) and get 3–5 real users before adding more
- [ ] Real exercise video clips (short, silent, 300–800 KB loops) — record or license
- [ ] Custom plan editor (reorder, add/remove exercises, change sets/reps/rest)
- [ ] Progression suggestions ("you hit all reps last time — add 2.5 kg")
- [ ] Weekly recap share card (image)
- [ ] Optional PIN screen lock (labelled as a lock, not encryption)
- [ ] Body measurements and progress photos (stored locally)
- [ ] Arabic translation + right-to-left layout, if wanted
- [ ] GitHub issue forms for feedback/ratings, prefilled from the app

## Phase 3 — needs a native wrapper (Capacitor)

- [ ] Apple Health / Google Health Connect: steps, heart rate, workouts written back
- [ ] Local notifications for reminders and rest-over when the phone is locked

## Experiments

- [ ] Camera rep counting (on-device pose model) for squats and push-ups
- [ ] Bluetooth heart-rate straps (Android Chrome only)

## Decisions log

| Date | Decision | Why |
|------|----------|-----|
| 2026-11-07 | Name "LIME" (working name) | Matches the neon-lime theme; easy to change (`index.html`, manifest, `AGENTS.md`). |
| 2026-11-07 | Dark-only theme | Lime on white fails contrast; the poster look is built for dark. |
| 2026-11-07 | IndexedDB + localStorage mirror, not cookies | Cookies hold ~4 KB and are sent with every request. |
| 2026-11-07 | **No password / encryption in v0.1** (house rule 8 skipped) | Workout logs are low-sensitivity, and a password adds friction and a lost-password risk. Revisit if injury/health notes or photos are added. |
| 2026-11-07 | SVG stick-figure animations instead of videos for v0.1 | Videos need recording/licensing and storage; figures are ~2 KB each and work offline. A `video` field is ready per exercise. |
| 2026-11-07 | Self-hosted fonts | No requests to Google; works offline. |
| 2026-11-07 | Week streak, not day streak | A 3×/week plan would break a daily streak by design. |
| 2026-11-07 | English only for v0.1 | Translation table to be added with the first second language. |
| 2026-11-07 | No health-data integration | Not possible from a web app; planned for a native wrapper. |
