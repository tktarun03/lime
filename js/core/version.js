/* The single global. Every other file attaches to LIME inside an IIFE.
   VERSION must match ?v= on every asset link in index.html, sw.js VERSION
   and the newest CHANGELOG.md entry (checked by tests/structure.test.mjs). */
var LIME = {
  VERSION: '0.4.4',
  RELEASES: [
    {
      version: '0.4.4',
      date: '2026-11-08',
      notes: [
        'Every exercise photo now shows the same athlete: new photos for Russian twist, mountain climber, high knees, hamstring stretch and hip flexor stretch.'
      ]
    },
    {
      version: '0.4.3',
      date: '2026-11-08',
      notes: [
        'New Refresh button on Home and in Settings: reloads the app and gets the latest version. Your data stays.'
      ]
    },
    {
      version: '0.4.2',
      date: '2026-11-08',
      notes: [
        'New photos for back squat, bench press, overhead press, calf raise and superman, with the same athlete as the other moves.'
      ]
    },
    {
      version: '0.4.1',
      date: '2026-11-08',
      notes: [
        'Five exercises renamed and rewritten to match their photos: Tempo Squat, Dumbbell Deadlift, Seated Dumbbell Press, One-Arm Dumbbell Row and Seated Band Row.'
      ]
    },
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
