/* Local-only storage. One state object kept in IndexedDB (localStorage fallback).
   Nothing is sent anywhere. Saves are queued so they land in order.
   RULE: every new saved field gets a default in migrate(). Never rename or
   remove a field without a migration step. */
(function () {
  'use strict';

  const SCHEMA = 1;
  const DB_NAME = 'lime';
  const KV = 'kv';
  const KEY = 'state';
  const LS_KEY = 'lime.state';

  function defaults() {
    return {
      schema: SCHEMA,
      profile: null,            // set by onboarding
      plan: null,               // built by LIME.planner
      sessions: [],             // finished workouts, oldest first
      bodyLog: [],              // [{ date: 'YYYY-MM-DD', kg }]
      prs: {},                  // exId → { kg, reps, maxReps, maxSecs, date }
      active: null,             // workout in progress (survives reload/crash)
      settings: {
        sound: true,
        voice: false,
        countdown: true,
        keepAwake: true,
        body3d: true,         // kept for old backups; superseded by demo
        demo: 'photo',        // photo | 3d | flat
        suggest: true,        // weight suggestions in the player
        accent: 'lime',
        text: 'm',            // system | s | m | l | xl
        restDefault: 60
      },
      ui: {
        introSeen: false,
        checklistHidden: false,
        lastVersionSeen: null,
        lastBackup: null,
        lastBackupNag: null,
        demo: false
      }
    };
  }

  /** Bring any saved state (old version, partial, or from a backup) up to the current shape. */
  function migrate(raw) {
    const d = defaults();
    const s = raw && typeof raw === 'object' ? raw : {};
    const out = Object.assign({}, d, s);
    out.settings = Object.assign({}, d.settings, s.settings || {});
    out.ui = Object.assign({}, d.ui, s.ui || {});
    // v0.5: plans can be edited; edited plans are not rebuilt by profile changes
    if (out.plan && typeof out.plan.edited !== 'boolean') out.plan.edited = false;
    // v0.4: demo style replaces the 3D on/off switch
    if (!(s.settings && s.settings.demo)) out.settings.demo = out.settings.body3d === false ? 'flat' : 'photo';
    if (!['photo', '3d', 'flat'].includes(out.settings.demo)) out.settings.demo = 'photo';
    // v0.3: text sizes renamed (normal/large/xlarge → m/l/xl), new system option
    out.settings.text = ({ normal: 'm', large: 'l', xlarge: 'xl' })[out.settings.text] || out.settings.text;
    if (!['system', 's', 'm', 'l', 'xl'].includes(out.settings.text)) out.settings.text = 'm';
    if (!Array.isArray(out.sessions)) out.sessions = [];
    if (!Array.isArray(out.bodyLog)) out.bodyLog = [];
    if (!out.prs || typeof out.prs !== 'object') out.prs = {};
    if (out.profile) {
      out.profile = Object.assign({
        name: '', photo: null, goal: 'general', level: 'beginner', equipment: ['none'],
        days: 3, minutes: 30, units: 'kg', bodyWeight: null, notes: '', createdAt: Date.now()
      }, out.profile);
      if (!Array.isArray(out.profile.equipment) || !out.profile.equipment.length) out.profile.equipment = ['none'];
    }
    // Future: if (out.schema < 2) { ...; out.schema = 2; }
    out.schema = SCHEMA;
    return out;
  }

  // ---------- IndexedDB with localStorage fallback ----------
  let dbp = null;
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        if (!('indexedDB' in window)) return resolve(null);
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(KV);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbp;
  }

  async function idbGet() {
    const db = await openDB();
    if (!db) return undefined;
    return new Promise((resolve) => {
      try {
        const r = db.transaction(KV, 'readonly').objectStore(KV).get(KEY);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(undefined);
      } catch (e) { resolve(undefined); }
    });
  }

  async function idbPut(value) {
    const db = await openDB();
    if (!db) throw new Error('no-idb');
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KV, 'readwrite');
      tx.objectStore(KV).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('idb-write'));
      tx.onabort = () => reject(tx.error || new Error('idb-abort'));
    });
  }

  const store = {
    state: defaults(),
    backend: 'memory',
    onSaveError: null,  // set by app.js → shows "Couldn't save" + Back up

    async load() {
      let raw, ls;
      try { raw = await idbGet(); } catch (e) { raw = undefined; }
      try { const t = localStorage.getItem(LS_KEY); if (t) ls = JSON.parse(t); } catch (e) { /* private mode etc. */ }
      // The page-hide mirror in localStorage can be newer than IndexedDB if the
      // app was closed mid-save. Take whichever was saved last.
      if (ls && (!raw || (ls.savedAt || 0) > (raw.savedAt || 0))) raw = ls;
      this.backend = (await openDB()) ? 'indexeddb' : 'localstorage';
      this.state = migrate(raw);
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
      return this.state;
    },

    _chain: Promise.resolve(),
    /** Queue a save of the current state. Resolves when written. */
    save() {
      this.state.savedAt = Date.now();
      const snapshot = JSON.parse(JSON.stringify(this.state));
      this._chain = this._chain.then(async () => {
        try {
          if (this.backend === 'indexeddb') await idbPut(snapshot);
          else localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
        } catch (e) {
          try { localStorage.setItem(LS_KEY, JSON.stringify(snapshot)); this.backend = 'localstorage'; }
          catch (e2) { if (this.onSaveError) this.onSaveError(e2); }
        }
      });
      return this._chain;
    },

    /** Change state with a function, then save. */
    update(fn) { fn(this.state); return this.save(); },

    /** Synchronous mirror for when the page is being closed (IndexedDB writes are async). */
    flushSync() {
      try { this.state.savedAt = Date.now(); localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch (e) { /* full or blocked */ }
    },

    async reset() {
      this.state = defaults();
      try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
      await this.save();
      try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
    },

    exportJSON() {
      return JSON.stringify({ app: 'LIME', version: LIME.VERSION, exportedAt: new Date().toISOString(), state: this.state }, null, 2);
    },

    /** Validate and load a backup. Throws with a readable message on bad files. */
    async importJSON(text) {
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { throw new Error('That file isn\'t a LIME backup.'); }
      if (!parsed || parsed.app !== 'LIME' || !parsed.state) throw new Error('That file isn\'t a LIME backup.');
      this.state = migrate(parsed.state);
      this.state.active = null;
      await this.save();
    },

    migrate,
    defaults,
    SCHEMA
  };

  window.addEventListener('pagehide', () => store.flushSync());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.flushSync(); });

  LIME.store = store;
})();
