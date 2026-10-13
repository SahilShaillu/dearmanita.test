/* =========================================================
   intro-music.js
   Background music for the site — one central player, no player interface.

   WHAT IT DOES
   1. When a page opens, the page content is held back and a dialog
      asks the visitor to turn up the volume ("Turn up your volume").
   2. "Okay, I'm ready" starts the music and shows the page.
   3. Songs play from  assets/audio/  in this order:
        one.mp3 -> two.mp3 -> three.mp3 -> one.mp3 -> ... (forever)
   4. index.html opens manita.html as a full-screen layer on top of itself
      (VishiiNav.openManita), so the page that owns the audio is never
      unloaded and the music never stops. The address bar changes to
      manita.html and the browser Back / Forward buttons close / reopen
      the layer. Opening manita.html directly (typed address, refresh)
      works as a normal page: the song, position and volume carried over
      in this tab are restored and the volume dialog is not shown again.
   5. If the browser blocks the sound, the next tap / key press starts it,
      and a small "Play music" button is shown meanwhile.

   SONG FILES
     assets/audio/one.mp3   assets/audio/two.mp3   assets/audio/three.mp3
   Need other names or more songs? Edit NAMES below.

   Works together with the small snippet in each page's <head>, which
   holds the content back (class "vmp-gate-active" on <html>) and provides
   window.VishiiSiteLoader. If this file can't run, that snippet shows
   the page by itself a few seconds after it loads.
   ========================================================= */

(function () {
  "use strict";

  /* manita.html can be opened as a full-screen layer (iframe) above index.html so
     the one player in the top page never stops. A page running inside such a layer
     must NOT create a second player: it only shows its own content. */
  let inLayer = false;
  try { inLayer = window.top !== window; } catch (e) { inLayer = true; }
  if (inLayer) {
    window.VishiiIntroGate = { active: true }; // keeps the head snippet's safety net out of the way
    const show = function () { if (window.VishiiSiteLoader) window.VishiiSiteLoader.start(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show, { once: true });
    else show();
    return;
  }

  if (window.VishiiBgMusic) return; // never start twice
  window.VishiiBgMusic = true;

  /* ---------- Configuration ---------- */
  const CONFIG = {
    dir: "assets/audio/",
    ext: "mp3",
    storageKey: "bgm:state",        // carries the song from page to page (this tab only)
    resumeMaxAgeMs: 15 * 60 * 1000  // ignore carried-over state older than this
  };
  const NAMES = ["one", "two", "three"]; // the playlist: one -> two -> three -> one ...

  /* ---------- State ---------- */
  let audio = null;
  let index = 0;            // which song is loaded
  let count = NAMES.length; // how many songs are in the playlist
  let advancing = false;    // true while moving on to the next song after one finished
  let wantPlay = false;     // the music should be playing
  let introDone = false;    // the volume dialog has been answered in this tab
  let started = false;
  let lastSaveAt = 0;
  let gestureArmed = false;
  let introEl = null;
  let playBtn = null;
  let layerEl = null;

  function trackUrl(i) {
    return new URL(CONFIG.dir + NAMES[i] + "." + CONFIG.ext, document.baseURI).href;
  }

  /* =======================================================
     PLAYBACK
     ======================================================= */
  function load(i, seekTo) {
    index = i;
    audio.src = trackUrl(i);
    if (seekTo > 0.5) {
      audio.addEventListener("loadedmetadata", function () {
        try { audio.currentTime = seekTo; } catch (e) { /* not seekable */ }
      }, { once: true });
    }
  }

  function play() {
    wantPlay = true;
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(function (err) {
        if (err && err.name === "NotAllowedError") { armGesture(); showPlayButton(); } // browser wants a touch first
      });
    }
  }

  /* Small "play" button, only shown while the browser is blocking the sound. */
  function showPlayButton() {
    if (playBtn || !document.body) return;
    playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.setAttribute("aria-label", "Play music");
    playBtn.textContent = "\u25B6 Play music";
    playBtn.style.cssText =
      "position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(120px + env(safe-area-inset-bottom,0px));z-index:2147483001;min-height:44px;padding:0 18px;" +
      "border:1px solid rgba(198,161,91,.5);border-radius:999px;background:var(--burgundy,#6b1e2e);" +
      "color:var(--white,#fff);font:inherit;cursor:pointer;box-shadow:0 10px 30px -10px rgba(0,0,0,.6)";
    playBtn.addEventListener("click", function () { if (audio && audio.paused) play(); });
    document.body.appendChild(playBtn);
  }

  function hidePlayButton() {
    if (playBtn && playBtn.parentNode) playBtn.parentNode.removeChild(playBtn);
    playBtn = null;
  }

  /* Safari / some browsers refuse sound on a freshly opened page until the
     visitor touches it. If that happens, the next tap or key press anywhere
     continues the music. */
  function armGesture() {
    if (gestureArmed) return;
    gestureArmed = true;
    const names = ["pointerdown", "touchend", "keydown", "click"];
    const go = function () {
      names.forEach(function (n) { document.removeEventListener(n, go, true); });
      gestureArmed = false;
      if (wantPlay && audio && audio.paused) play();
    };
    names.forEach(function (n) { document.addEventListener(n, go, true); });
  }

  /* Next song; after the last one, back to the first. */
  function advance() {
    const n = count || NAMES.length;
    if (n <= 1) { // a single song: just start it again
      audio.currentTime = 0;
      play();
      return;
    }
    advancing = true;
    load((index + 1) % n);
    play();
  }

  function bindAudio() {
    audio.addEventListener("ended", function () {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return; // stray event
      advance();
      saveSession(true);
    });
    audio.addEventListener("playing", function () {
      advancing = false;
      hidePlayButton();
      saveSession(true);
    });
    audio.addEventListener("timeupdate", function () { saveSession(false); });
    audio.addEventListener("volumechange", function () { saveSession(true); });
    audio.addEventListener("error", function () {
      if (audio.error && audio.error.code === 1) return; // aborted by a newer load
      if (index > 0) {
        // A song file is missing: shorten the playlist to the songs before it and start over.
        if (advancing) count = index;
        advancing = false;
        load(0);
        play();
      } else {
        advancing = false;
        console.warn("[music] Couldn't play " + trackUrl(0) + " — put your first song at assets/audio/one.mp3");
      }
    });
  }

  /* =======================================================
     KEEPING THE MUSIC GOING WHEN A PAGE IS RELOADED / OPENED DIRECTLY
     A reload or a direct address creates a brand-new document, and the
     browser stops the old audio. Just before that we note the song, position
     and volume (sessionStorage); the next page load picks the song up at the same spot.
     ======================================================= */
  function readSession() {
    let raw = null;
    try { raw = window.sessionStorage.getItem(CONFIG.storageKey); } catch (e) { raw = null; }
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (!s || typeof s !== "object" || !Number.isFinite(s.at)) return null;
      if (Date.now() - s.at > CONFIG.resumeMaxAgeMs) return null;
      return s;
    } catch (e) { return null; }
  }

  function saveSession(force) {
    if (!audio || !introDone) return;
    const now = Date.now();
    if (!force && now - lastSaveAt < 1000) return;
    lastSaveAt = now;
    const raw = JSON.stringify({
      at: now,
      intro: true,
      i: index,
      t: Math.round((audio.currentTime || 0) * 10) / 10,
      v: audio.volume,
      m: audio.muted,
      play: wantPlay
    });
    try { window.sessionStorage.setItem(CONFIG.storageKey, raw); } catch (e) { /* storage blocked */ }
  }

  function restore(s) {
    let i = Number(s.i);
    if (!Number.isInteger(i) || i < 0 || i >= NAMES.length) i = 0;
    if (Number.isFinite(s.v) && s.v >= 0 && s.v <= 1) audio.volume = s.v;
    audio.muted = s.m === true;
    load(i, Number(s.t) || 0);
    if (s.play !== false) play();
  }

  /* =======================================================
     OPENING manita.html WITHOUT STOPPING THE MUSIC
     main.js calls VishiiNav.openManita() after the secret code. manita.html then
     opens as a full-screen layer above index.html, so this page (which owns the
     one audio player) stays alive. The address bar changes to manita.html, and
     the browser Back / Forward buttons close / reopen the layer. The layer is
     told once that the code was just entered (via its window name), so it does
     not ask again; Forward reopens it as a fresh visit.
     ======================================================= */
  function openLayer(opts) {
    if (layerEl) return;
    opts = opts || {};
    const f = document.createElement("iframe");
    f.title = "MANITA";
    if (opts.unlocked) f.name = "vmp-unlocked";
    f.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147482000;background:#260710";
    f.addEventListener("load", function () {
      if (typeof opts.onShown === "function") { try { opts.onShown(); } catch (e) { /* ignore */ } }
    }, { once: true });
    f.src = "manita.html";
    document.body.appendChild(f);
    document.documentElement.style.overflow = "hidden";
    layerEl = f;
  }

  function closeLayer() {
    if (!layerEl) return;
    layerEl.remove();
    layerEl = null;
    document.documentElement.style.overflow = "";
  }

  window.VishiiNav = {
    openManita: function (opts) {
      opts = opts || {};
      try { history.pushState({ vmpLayer: "manita" }, "", "manita.html"); }
      catch (e) { window.location.href = "manita.html"; return; } // history unavailable: normal page load
      openLayer({ unlocked: true, onShown: opts.onShown });
    }
  };

  window.addEventListener("popstate", function (e) {
    if (e.state && e.state.vmpLayer === "manita") openLayer({ unlocked: false }); // Forward
    else closeLayer();                                                            // Back
  });

  /* =======================================================
     THE "TURN UP YOUR VOLUME" DIALOG
     ======================================================= */
  const ICON_VOLUME =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';

  const INTRO_CSS =
    ".bgm-intro{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;" +
      "padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));" +
      "background:rgba(26,4,10,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);overflow:auto;" +
      "font-family:var(--font-body,system-ui,sans-serif)}" +
    ".bgm-intro__panel{box-sizing:border-box;width:min(100%,420px);margin:auto;padding:2rem 1.5rem 1.75rem;" +
      "border:1px solid rgba(198,161,91,.4);border-radius:var(--radius-lg,22px);" +
      "background:radial-gradient(ellipse at 20% 0%,var(--burgundy,#6b1e2e) 0%,var(--wine,#4a1220) 55%,var(--wine-deep,#260710) 100%);" +
      "color:var(--white,#fff);text-align:center;box-shadow:0 40px 80px -20px rgba(0,0,0,.6);" +
      "animation:bgm-intro-in .45s var(--ease-soft,ease) both}" +
    ".bgm-intro__icon{display:grid;place-items:center;width:64px;height:64px;margin:0 auto 1rem;border-radius:50%;" +
      "background:rgba(198,161,91,.14);color:var(--gold,#c6a15b)}" +
    ".bgm-intro__icon svg{width:32px;height:32px}" +
    ".bgm-intro__title{margin:0 0 .6rem;font-family:var(--font-display,Georgia,serif);font-size:clamp(1.4rem,5vw,1.8rem);line-height:1.2;color:var(--white,#fff)}" +
    ".bgm-intro__text{margin:0 0 1.4rem;font-size:1rem;line-height:1.55;color:var(--blush,#f0d4da)}" +
    ".bgm-intro__btn{justify-content:center;min-height:48px;width:100%}" +
    "@keyframes bgm-intro-in{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}" +
    "@media (max-height:430px){.bgm-intro__panel{padding:1rem 1.25rem}.bgm-intro__icon{width:44px;height:44px;margin-bottom:.5rem}" +
      ".bgm-intro__icon svg{width:24px;height:24px}.bgm-intro__text{margin-bottom:.8rem}}" +
    "@media (prefers-reduced-motion:reduce){.bgm-intro__panel{animation:none}}";

  function releaseSite() {
    if (window.VishiiSiteLoader) window.VishiiSiteLoader.start();
  }

  function begin() {
    if (started) return;
    started = true;
    introDone = true;
    // Started right inside the tap/click, so every browser allows the sound.
    load(0);
    play();
    if (introEl && introEl.parentNode) introEl.parentNode.removeChild(introEl);
    introEl = null;
    document.removeEventListener("keydown", onIntroKey, true);
    saveSession(true);
    releaseSite();
  }

  function onIntroKey(e) {
    if (e.key === "Escape") { e.preventDefault(); begin(); }
    else if (e.key === "Tab" && introEl) { e.preventDefault(); const b = introEl.querySelector("button"); if (b) b.focus(); }
  }

  function showIntro() {
    if (!document.getElementById("bgmIntroStyle")) {
      const st = document.createElement("style");
      st.id = "bgmIntroStyle";
      st.textContent = INTRO_CSS;
      document.head.appendChild(st);
    }
    const wrap = document.createElement("div");
    wrap.className = "bgm-intro";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "bgmIntroTitle");
    wrap.setAttribute("aria-describedby", "bgmIntroText");
    wrap.innerHTML =
      '<div class="bgm-intro__panel">' +
        '<div class="bgm-intro__icon" aria-hidden="true">' + ICON_VOLUME + "</div>" +
        '<h2 class="bgm-intro__title" id="bgmIntroTitle">Turn up your volume</h2>' +
        '<p class="bgm-intro__text" id="bgmIntroText">For the best experience, please increase your device\u2019s volume before you begin.</p>' +
        '<button class="btn btn--primary bgm-intro__btn" type="button"><span>Okay, I\u2019m ready</span></button>' +
      "</div>";
    document.body.appendChild(wrap);
    introEl = wrap;
    const btn = wrap.querySelector("button");
    btn.addEventListener("click", begin);
    document.addEventListener("keydown", onIntroKey, true);
    try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }
  }

  /* =======================================================
     START
     ======================================================= */
  function init() {
    if (audio) return;
    audio = new Audio();
    audio.preload = "auto";
    try { audio.setAttribute("playsinline", ""); } catch (e) { /* ignore */ }
    bindAudio();

    window.VishiiIntroGate = { active: true }; // tells the head snippet's safety net not to step in

    window.addEventListener("pagehide", function () { saveSession(true); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) saveSession(true); });
    // "Back" to a page the browser kept in memory: carry on with the current song.
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      const s = readSession();
      if (s && s.intro) restore(s);
    });

    const saved = readSession();
    if (saved && saved.intro) {
      // Reload or direct address in the same tab: the volume dialog was already
      // answered, so show the page straight away and carry the music on.
      started = true;
      introDone = true;
      releaseSite();
      restore(saved);
    } else {
      showIntro();
    }

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
