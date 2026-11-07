---
name: release
description: Ship a new LIME version — bump every version marker, changelog, tests, push, confirm deploy.
---

# Release LIME

1. Pick the version (patch for fixes, minor for features).
2. `js/core/version.js`: set `VERSION`, add a new entry at the **top** of
   `RELEASES` with today's date and 2–5 plain-English notes (user-facing,
   past tense, no jargon). The first note is shown in the "Updated" notice.
3. `CHANGELOG.md`: add the same notes as `## X.Y.Z — YYYY-MM-DD` at the top.
4. `index.html`: replace every `?v=OLD` with `?v=NEW`.
5. `sw.js`: set `VERSION`. If you added a JS/CSS file, add it to `ASSETS`.
6. `package.json`: set `version`.
7. Run `node tests/structure.test.mjs` and `npx playwright test`. Fix, don't skip.
8. Commit (`Release vX.Y.Z: <headline>`), push to `main`.
9. Confirm both runs succeed:
   `gh api repos/<owner>/<repo>/actions/runs?head_sha=<sha>` until
   "Tests" and "Deploy" are `success`.
10. Report briefly, **flaws first**, with [Certain]/[Likely]/[Guessing] tags,
    and say what was tested in a simulator vs on a real phone.
