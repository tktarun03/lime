---
name: ui-change
description: Change or add a LIME screen without breaking mobile layout, the theme, or the module structure.
---

# UI change in LIME

1. Find the screen in `js/features/` (map in `AGENTS.md`). New screen →
   new file, a route in `js/app.js`, a script tag in `index.html` (in the
   features block), and an `ASSETS` entry in `sw.js`.
2. Use tokens from the top of `css/app.css`. Lime (`--accent`) only for the
   main action, active timers, records and progress. Display font + `.slant`
   only for titles and big numbers.
3. Poster texture (`.tex`) only on intro, player, rest, done and hero cards.
4. Mobile rules: inputs ≥16px, tap targets ≥44px, no text under 11px,
   safe-area insets, no `100vh` stacks — let content scroll inside flex.
5. Escape user text with `LIME.U.esc()`.
6. Data changes → `LIME.toast(...)`, with `undo` when safely reversible.
7. Re-render only the part that changed when an input has focus (re-rendering
   the whole screen loses focus on iPhone).
8. Add or update a Playwright flow in `tests/flows.spec.mjs`; run all three
   phone sizes. Look at a screenshot before calling it done.
