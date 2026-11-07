/* Beeps (Web Audio) and spoken cues (speech synthesis). Both optional and
   controlled from Settings. iPhone only allows sound after a tap, so unlock()
   is called on the first touch. iPhone Safari cannot vibrate. */
(function () {
  'use strict';

  let ctx = null;

  function unlock() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      // A silent blip primes iOS
      const o = ctx.createOscillator(), g = ctx.createGain();
      g.gain.value = 0; o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.01);
    } catch (e) { /* ignore */ }
  }

  function tone(freq, dur, vol) {
    const s = LIME.store.state.settings;
    if (!s.sound || !ctx) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  function say(text) {
    const s = LIME.store.state.settings;
    if (!s.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.lang = 'en-US';
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  LIME.audio = {
    unlock,
    tick() { tone(880, 0.12); },
    go() { tone(1320, 0.35, 0.3); LIME.U.vibrate(200); },
    done() { tone(660, 0.15); setTimeout(() => tone(990, 0.3), 160); LIME.U.vibrate([100, 60, 160]); },
    say
  };

  ['touchstart', 'pointerdown', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, unlock, { once: true, passive: true, capture: true }));
})();
