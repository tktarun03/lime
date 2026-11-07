/* Service worker: page network-first, versioned assets cache-first.
   VERSION must equal LIME.VERSION (checked by tests). */
const VERSION = '0.3.0';
const CACHE = 'lime-' + VERSION;
const V = '?v=' + VERSION;

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest' + V,
  'css/app.css' + V,
  'fonts/oswald-var.woff2',
  'fonts/inter-var.woff2',
  'vendor/three.min.js',
  'icons/icon.svg' + V,
  'icons/apple-touch-icon.png' + V,
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/core/version.js' + V,
  'js/core/util.js' + V,
  'js/core/store.js' + V,
  'js/core/timer.js' + V,
  'js/core/audio.js' + V,
  'js/data/exercises.js' + V,
  'js/data/figures.js' + V,
  'js/data/planner.js' + V,
  'js/ui/icons.js' + V,
  'js/ui/toast.js' + V,
  'js/ui/sheet.js' + V,
  'js/ui/charts.js' + V,
  'js/ui/body3d.js' + V,
  'js/features/stats.js' + V,
  'js/features/onboarding.js' + V,
  'js/features/home.js' + V,
  'js/features/library.js' + V,
  'js/features/player.js' + V,
  'js/features/progress.js' + V,
  'js/features/settings.js' + V,
  'js/app.js' + V
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('lime-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  if (isPage) {
    // network-first so a new release shows up; cache when offline
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }
  // versioned assets: cache-first
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (req.url.includes('?v=') || req.url.includes('/fonts/') || req.url.includes('/media/'))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
