# Exercise clips

Optional. Without a clip, each exercise shows its moving SVG illustration.

To add one:

1. Make a short, silent, looping clip: 3–6 s, portrait or 4:3, H.264 MP4,
   about 300–800 KB. Dark background suits the theme.
2. Save it here as `<exercise-id>.mp4` (e.g. `goblet-squat.mp4`).
3. In `js/data/exercises.js`, add `video: 'media/goblet-squat.mp4'` to that exercise.
4. Only use clips you recorded yourself or have a licence for.

Clips are cached by the service worker the first time they play, not
downloaded up front, to keep iPhone storage use low.
