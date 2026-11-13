/* About page (#/about): the app, the story and the creator.
   All text and links come from js/data/brand.js. */
(function () {
  'use strict';

  const U = LIME.U;

  function linkBtn(href, icon, label, primary) {
    if (!href) return '';
    return `<a class="btn ${primary ? 'btn-primary' : ''} btn-block btn-lg" href="${U.esc(href)}" target="_blank" rel="noopener noreferrer">${LIME.icon(icon)} ${U.esc(label)}</a>`;
  }

  function render(view) {
    const B = LIME.BRAND;
    view.innerHTML = `
      <header class="sub-hd">
        <a href="#/settings" class="icon-btn" aria-label="Back">${LIME.icon('back')}</a>
        <div class="grow"><h1 class="disp slant">About</h1></div>
      </header>

      <section class="hero tex about-hero">
        <img class="about-logo" src="icons/icon-192.png?v=${U.esc(LIME.VERSION)}" alt="LIME logo" width="72" height="72">
        <div class="grow">
          <div class="disp slant about-name">LIME</div>
          <div class="small muted">Version ${U.esc(LIME.VERSION)}</div>
          <div class="eyebrow hl" style="margin-top:8px">${U.esc(B.tagline)}</div>
        </div>
      </section>

      <div class="section-title"><h2>The story</h2></div>
      <div class="card about-text">${B.story.map((p) => `<p>${U.esc(p)}</p>`).join('')}
        <button type="button" class="btn btn-block btn-lg" data-invite style="margin-top:14px">${LIME.icon('share')} Share LIME with friends</button>
      </div>

      <div class="section-title"><h2>About me</h2></div>
      <div class="card">
        <div class="row" style="gap:14px">
          ${B.photo ? `<img class="about-avatar photo-av" src="${U.esc(B.photo)}" alt="${U.esc(B.creator)}" width="72" height="72">` : `<span class="about-avatar" aria-hidden="true">${U.esc(B.initials)}</span>`}
          <span class="grow"><strong class="about-creator">${U.esc(B.creator)}</strong><br><span class="small muted">${U.esc(B.role)}</span></span>
        </div>
        ${B.motto ? `<p class="about-motto disp slant">${U.esc(B.motto)}</p>` : ''}
        <div class="about-text" style="margin-top:12px">${B.about.map((p) => `<p>${U.esc(p)}</p>`).join('')}</div>
        <div class="stack" style="margin-top:14px">
          ${linkBtn(B.links.youtube, 'youtube', 'Follow on YouTube', true)}
          ${linkBtn(B.links.instagram, 'instagram', 'Follow on Instagram', !B.links.youtube)}
          ${linkBtn(B.links.linkedin, 'linkedin', 'Connect on LinkedIn', false)}
          ${linkBtn(B.links.github, 'github', 'See my work on GitHub', false)}
        </div>
      </div>

      <p class="credit">© ${U.esc(B.year)} ${U.esc(B.creator)}. ${U.esc(B.tagline)}.</p>`;
    U.$('[data-invite]', view).onclick = () => LIME.invite.open();
  }

  LIME.about = { render };
})();
