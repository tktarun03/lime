/* Inline SVG icons (stroke style, currentColor). icon('name') → markup.
   Elements with data-icon="name" are filled in by LIME.icons.hydrate(). */
(function () {
  'use strict';

  const S = (d, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ''}>${d}</svg>`;

  const I = {
    home: S('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    library: S('<rect x="3" y="4" width="7" height="7" rx="2"/><rect x="14" y="4" width="7" height="7" rx="2"/><rect x="3" y="15" width="7" height="6" rx="2"/><rect x="14" y="15" width="7" height="6" rx="2"/>'),
    chart: S('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
    gear: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    play: S('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
    pause: S('<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    minus: S('<path d="M5 12h14"/>'),
    x: S('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: S('<path d="M5 12l5 5 9-10"/>', ' stroke-width="3"'),
    chev: S('<path d="M9 6l6 6-6 6"/>'),
    back: S('<path d="M15 6l-6 6 6 6"/>'),
    search: S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    flame: S('<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-2-6-1 4-5 7-5 12 0 4 4 7 8 7z"/>'),
    trophy: S('<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    bolt: S('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    body: S('<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M12 14l-3 7M12 14l3 7M6 10l6-2 6 2"/>'),
    dumbbell: S('<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>'),
    kettlebell: S('<path d="M8 8a4 4 0 0 1 8 0"/><path d="M6 13a6 6 0 0 1 12 0c0 3-1 6-2 7H8c-1-1-2-4-2-7z"/>'),
    band: S('<path d="M4 8c4-4 12-4 16 0M4 16c4 4 12 4 16 0M4 8v8M20 8v8"/>'),
    pullup: S('<path d="M3 4h18"/><path d="M8 4v4a4 4 0 0 0 8 0V4"/><circle cx="12" cy="14" r="2"/><path d="M12 16v5"/>'),
    bench: S('<path d="M3 11h18M6 11v8M18 11v8M9 7h6"/>'),
    barbell: S('<path d="M2 12h20M5 8v8M8 6v12M16 6v12M19 8v8"/>'),
    swap: S('<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/>'),
    skip: S('<path d="M5 4l10 8-10 8z"/><path d="M19 5v14"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    download: S('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>'),
    upload: S('<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>'),
    refresh: S('<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 21v-5h-5"/>'),
    up: S('<path d="M12 19V5M6 11l6-6 6 6"/>'),
    down: S('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    equal: S('<path d="M5 9h14M5 15h14"/>'),
    grip: S('<path d="M5 9h14M5 15h14"/>'),
    edit: S('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
    youtube: S('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>'),
    instagram: S('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>'),
    linkedin: S('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>'),
    github: S('<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.3c3-.3 6.1-1.5 6.1-6.6a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.8 12.8 0 0 0-6.8 0C5.6 1.1 4.5 1.4 4.5 1.4a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 3 8.6c0 5.1 3.1 6.3 6.1 6.6A3 3 0 0 0 8.3 17.5V21"/>'),
    share: S('<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/>'),
    target: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    sound: S('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'),
    user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    heart: S('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
    scale: S('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9a5 5 0 0 1 8 0l-3 3"/>'),
    calendar: S('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    sparkle: S('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'),
    trash: S('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    lock: S('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    phone: S('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
    stretch: S('<circle cx="13" cy="4.5" r="2"/><path d="M13 7l-2 6 4 3v5M11 13l-5 2M13 9l6-3"/>')
  };

  function icon(name) { return I[name] || ''; }
  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach((el) => {
      if (!el.firstChild) el.innerHTML = icon(el.getAttribute('data-icon'));
    });
  }

  LIME.icon = icon;
  LIME.icons = { hydrate, names: Object.keys(I) };
})();
