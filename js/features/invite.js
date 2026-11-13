/* Share LIME with friends: a sheet with a QR code to scan, the phone's
   share sheet, WhatsApp and Copy link. LIME.invite.open() from anywhere.
   The link comes from LIME.BRAND.appUrl (js/data/brand.js). Nothing is
   sent anywhere unless the user taps a share option. */
(function () {
  'use strict';

  const U = LIME.U;

  function appUrl() {
    const u = LIME.BRAND.appUrl;
    if (u) return u;
    try { return new URL('./', location.href).href; } catch (e) { return location.href; }
  }

  function message() {
    return "I'm training with LIME, a free workout app. No account, no ads, and everything stays on your phone. Try it:";
  }

  async function copy(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      LIME.toast('Link copied', { kind: 'good', body: 'Paste it into any chat.' });
      return;
    } catch (e) { /* fall through */ }
    if (field) { field.focus(); field.select(); }
    LIME.toast('Copy the selected link', { body: 'Your browser blocked automatic copying.' });
  }

  function open() {
    const url = appUrl();
    const text = message();
    const full = `${text} ${url}`;
    const canShare = typeof navigator.share === 'function';

    const sheet = LIME.sheet.open({
      title: 'Share LIME',
      body: `
        <p class="muted small" style="margin:0 0 14px">Friends next to you can scan this with their phone camera.</p>
        <div class="qr-box" data-qr aria-busy="true"></div>
        <label class="tiny muted" for="invite-link" style="display:block;margin:16px 0 6px">App link</label>
        <input class="input invite-link" id="invite-link" type="text" readonly value="${U.esc(url)}">
        <div class="stack" style="margin-top:14px">
          ${canShare ? `<button type="button" class="btn btn-primary btn-block btn-lg" data-native>${LIME.icon('share')} Share link</button>` : ''}
          <a class="btn ${canShare ? '' : 'btn-primary'} btn-block btn-lg" data-wa href="https://wa.me/?text=${encodeURIComponent(full)}" target="_blank" rel="noopener noreferrer">${LIME.icon('chat')} Send on WhatsApp</a>
          <button type="button" class="btn btn-block btn-lg" data-copy>${LIME.icon('copy')} Copy link</button>
        </div>
        <p class="tiny muted" style="margin:14px 0 0;text-align:center">LIME is free. Your friend's workouts stay on their own phone, and yours stay on yours.</p>`
    });
    const el = sheet.el;
    const field = U.$('#invite-link', el);

    const box = U.$('[data-qr]', el);
    LIME.qr.svg(url, 'QR code for the LIME app link').then((svg) => {
      box.innerHTML = svg;
      box.removeAttribute('aria-busy');
    }).catch(() => { box.remove(); });

    field.addEventListener('focus', () => field.select());
    U.$('[data-copy]', el).onclick = () => copy(full, field);
    const nat = U.$('[data-native]', el);
    if (nat) nat.onclick = async () => {
      try { await navigator.share({ title: 'LIME', text, url }); } catch (e) {
        if (e && e.name === 'AbortError') return;
        copy(full, field);
      }
    };
    return sheet;
  }

  LIME.invite = { open, appUrl, message };
})();
