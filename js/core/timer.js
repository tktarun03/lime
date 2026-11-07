/* Timers based on real clock time, not on counting ticks.
   iPhone pauses web-app code when the screen locks; when the app comes back
   the timer shows the right value because it compares against an end time.
   Also: screen wake lock so the screen stays on during a workout. */
(function () {
  'use strict';

  /**
   * countdown({ seconds, onTick(remainingSec), onDone(), onSecond(remainingWholeSec) })
   * Returns { pause, resume, add(sec), stop, remaining(), endAt }
   */
  function countdown(opts) {
    let endAt = Date.now() + opts.seconds * 1000;
    let pausedLeft = null;
    let lastWhole = null;
    let done = false;
    let iv = null;

    function left() { return pausedLeft != null ? pausedLeft : Math.max(0, (endAt - Date.now()) / 1000); }

    function tick() {
      if (done) return;
      const r = left();
      const whole = Math.ceil(r);
      if (opts.onTick) opts.onTick(r);
      if (whole !== lastWhole) { lastWhole = whole; if (opts.onSecond) opts.onSecond(whole); }
      if (r <= 0 && pausedLeft == null) { done = true; clearInterval(iv); document.removeEventListener('visibilitychange', tick); if (opts.onDone) opts.onDone(); }
    }

    iv = setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick);
    setTimeout(tick, 0);

    return {
      get endAt() { return endAt; },
      remaining: left,
      pause() { if (pausedLeft == null) pausedLeft = left(); },
      resume() { if (pausedLeft != null) { endAt = Date.now() + pausedLeft * 1000; pausedLeft = null; } },
      get paused() { return pausedLeft != null; },
      add(sec) {
        if (pausedLeft != null) pausedLeft = Math.max(0, pausedLeft + sec);
        else endAt = Math.max(Date.now(), endAt + sec * 1000);
        tick();
      },
      stop() { done = true; clearInterval(iv); document.removeEventListener('visibilitychange', tick); }
    };
  }

  /** Stopwatch from a fixed start time (used for the total workout clock). */
  function elapsed(startAt, pausedMs) { return Math.max(0, (Date.now() - startAt - (pausedMs || 0)) / 1000); }

  // ---------- Wake lock ----------
  let sentinel = null;
  let wanted = false;
  async function acquire() {
    try {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return false;
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
      return true;
    } catch (e) { return false; }
  }
  document.addEventListener('visibilitychange', () => { if (wanted && !sentinel) acquire(); });

  const wake = {
    supported: 'wakeLock' in navigator,
    async on() { wanted = true; return acquire(); },
    async off() { wanted = false; try { if (sentinel) await sentinel.release(); } catch (e) { /* ignore */ } sentinel = null; },
    get active() { return !!sentinel; }
  };

  LIME.timer = { countdown, elapsed };
  LIME.wake = wake;
})();
