/* The single global. Every other file attaches to LIME inside an IIFE.
   VERSION must match ?v= on every asset link in index.html, sw.js VERSION
   and the newest CHANGELOG.md entry (checked by tests/structure.test.mjs). */
var LIME = {
  VERSION: '0.4.0',
  RELEASES: [
    {
      version: '0.4.0',
      date: '2026-11-08',
      notes: [
        'Every exercise now shows real photos of the start and end position.',
        'Choose Photos, 3D or Simple drawings in Settings → Look → Exercise demos.',
        'Library thumbnails use the photos too.'
      ]
    },
    {
      version: '0.3.0',
      date: '2026-11-07',
      notes: [
        'More lifelike 3D bodies: shaped muscles, real lighting and reflections.',
        'Frosted-glass look with a floating tab bar.',
        'Smaller text overall, plus Auto (your phone\'s size), S, M, L and XL in Settings.',
        'Goblet squat now holds the weight at the chest.'
      ]
    },
    {
      version: '0.2.0',
      date: '2026-11-07',
      notes: [
        'Exercise demos are now 3D bodies, with the worked muscles lit up.',
        'Thinner, lighter type throughout.',
        'Goblet squat shows one weight held at the chest.',
        'Turn 3D demos off in Settings to save battery.'
      ]
    },
    {
      version: '0.1.0',
      date: '2026-11-07',
      notes: [
        'First version: profile setup, a plan built from your goal, days and equipment.',
        'Workout player with sets, rest timer, 3-2-1 countdown and screen kept on.',
        'Exercise library with moving illustrations, steps and common mistakes.',
        'Progress: weekly volume, streak, personal records, body weight and a 12-week calendar.',
        'Backup and restore to a file. Everything stays on your phone.'
      ]
    }
  ]
};
