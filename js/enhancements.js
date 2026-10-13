/* =========================================================
   enhancements.js
   Additive polish layer. Does not modify or depend on the other
   site scripts; every feature checks for what it needs and quietly
   does nothing if it isn't on the page.

   1. Floating petals in the hero, bridge and finale sections
   2. Soft pointer-following glow (desktop)
   3. Tap ripple + tiny heart burst (touch: only on a real tap, never while scrolling)
   4. Magnetic buttons (desktop)
   5. Haptic buzz on the heart-hold / correct code (Android)
   (The silk wave between the cream and burgundy sections lives in
   style.css as .silk-bridge — it is intentionally not duplicated here.)
   ========================================================= */

(function () {
  "use strict";
  if (window.__vishiiEnhanced) return;
  window.__vishiiEnhanced = true;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;

  function onVisible(el, cb) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { cb(e.isIntersecting); });
    }, { threshold: 0.01 }).observe(el);
  }

  /* ---------- 1. Floating petals ---------- */
  function initPetals() {
    if (reduced) return;
    const targets = document.querySelectorAll("#hero, .section--bridge, .section--finale");
    targets.forEach(function (host) {
      if (host.querySelector(".fx-petals")) return;
      const layer = document.createElement("div");
      layer.className = "fx-petals";
      layer.setAttribute("aria-hidden", "true");
      const count = isTouch ? 6 : 10;
      for (let i = 0; i < count; i++) {
        const p = document.createElement("span");
        p.className = "fx-petal";
        p.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
        p.style.setProperty("--s", (9 + Math.random() * 10).toFixed(1) + "px");
        p.style.setProperty("--d", (13 + Math.random() * 11).toFixed(1) + "s");
        p.style.setProperty("--dl", (-Math.random() * 20).toFixed(1) + "s");
        p.style.top = "-24px";
        p.style.setProperty("--dx", ((Math.random() - 0.5) * 120).toFixed(0) + "px");
        layer.appendChild(p);
      }
      host.insertBefore(layer, host.firstChild);
      // Fall distance in px (not vh), so the iOS address-bar collapsing never restarts / jolts the motion.
      let lastW = 0, lastH = 0;
      const setFall = function () {
        const w = host.clientWidth, h = host.clientHeight;
        if (lastH && w === lastW && Math.abs(h - lastH) < 140) return;
        lastW = w; lastH = h;
        layer.style.setProperty("--fall", (h + 40) + "px");
      };
      setFall();
      window.addEventListener("resize", setFall, { passive: true });
      onVisible(host, function (vis) { layer.classList.toggle("is-on", vis); });
    });
  }

  /* ---------- 3. Pointer glow (desktop) ---------- */
  function initGlow() {
    if (reduced || !finePointer) return;
    const glow = document.createElement("div");
    glow.className = "fx-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
    let tx = 0, ty = 0, x = 0, y = 0, running = false;
    function loop() {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      glow.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) requestAnimationFrame(loop);
      else running = false;
    }
    window.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!glow.classList.contains("is-on")) { x = tx; y = ty; glow.classList.add("is-on"); }
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () { glow.classList.remove("is-on"); });
  }

  /* ---------- 4. Tap ripple + heart burst ---------- */
  function initRipples() {
    if (reduced) return;
    const layer = document.createElement("div");
    layer.className = "fx-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);

    function burst(x, y, target) {
      if (layer.children.length > 16) return;
      const r = document.createElement("span");
      r.className = "fx-ripple";
      r.style.left = x + "px";
      r.style.top = y + "px";
      r.addEventListener("animationend", function () { r.remove(); }, { once: true });
      layer.appendChild(r);
      if (target.closest(".btn, button")) {
        for (let i = 0; i < 5; i++) {
          const h = document.createElement("span");
          h.className = "fx-heart";
          h.textContent = "\u2665\uFE0E"; // text-style heart: never swapped for a colour emoji on iOS
          h.style.left = x + "px";
          h.style.top = y + "px";
          h.style.setProperty("--hx", ((i - 2) * 16 + (Math.random() - 0.5) * 10).toFixed(0) + "px");
          h.style.setProperty("--hy", (-34 - Math.random() * 30).toFixed(0) + "px");
          h.addEventListener("animationend", function () { h.remove(); }, { once: true });
          layer.appendChild(h);
        }
      }
    }
    function skip(t) {
      return !t || !t.closest || t.closest("#gameStage, .bgm-intro, input, textarea");
    }

    let down = null;
    document.addEventListener("pointerdown", function (e) {
      if (skip(e.target)) { down = null; return; }
      if (e.pointerType === "mouse") { burst(e.clientX, e.clientY, e.target); down = null; return; }
      // touch / pen: wait to see whether it is a tap or the start of a scroll
      down = { x: e.clientX, y: e.clientY, t: performance.now(), target: e.target };
    }, { passive: true });
    document.addEventListener("pointerup", function (e) {
      if (!down) return;
      const d = down; down = null;
      if (Math.abs(e.clientX - d.x) < 10 && Math.abs(e.clientY - d.y) < 10 && performance.now() - d.t < 450) {
        burst(e.clientX, e.clientY, d.target);
      }
    }, { passive: true });
    document.addEventListener("pointercancel", function () { down = null; }, { passive: true });
  }

  /* ---------- 5. Magnetic buttons (desktop) ---------- */
  function initMagnetic() {
    if (reduced || !finePointer || !Element.prototype.animate) return;
    let current = null, ox = 0, oy = 0;
    function release(el) {
      if (!el) return;
      const from = ox.toFixed(1) + "px " + oy.toFixed(1) + "px";
      el.style.translate = "";
      ox = 0; oy = 0;
      el.animate([{ translate: from }, { translate: "0px 0px" }], { duration: 320, easing: "cubic-bezier(.22,.9,.32,1)" });
    }
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const btn = e.target && e.target.closest ? e.target.closest(".btn") : null;
      if (btn !== current) { release(current); current = btn; }
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      // the rect already includes our own offset: subtract it so the target doesn't feed back into itself
      const cx = r.left - ox + r.width / 2, cy = r.top - oy + r.height / 2;
      ox = Math.max(-10, Math.min(10, ((e.clientX - cx) / r.width) * 10));
      oy = Math.max(-8, Math.min(8, ((e.clientY - cy) / r.height) * 8));
      btn.style.translate = ox.toFixed(1) + "px " + oy.toFixed(1) + "px";
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () { release(current); current = null; });
  }

  /* ---------- 6. Haptic buzz (Android; iPhone Safari ignores it) ---------- */
  function initHaptics() {
    if (!navigator.vibrate) return;
    function watch(id, cls, pattern) {
      const el = document.getElementById(id);
      if (!el || !("MutationObserver" in window)) return;
      let fired = false;
      new MutationObserver(function () {
        const on = el.classList.contains(cls);
        if (on && !fired) { fired = true; try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
        if (!on) fired = false;
      }).observe(el, { attributes: true, attributeFilter: ["class"] });
    }
    watch("bridgeHeart", "is-complete", [40, 60, 90]);
    watch("bridgeGateLockIcon", "is-unlocked", [30, 40, 30]);
    watch("pageGateLockIcon", "is-unlocked", [30, 40, 30]);
  }

  function init() {
    try { initPetals(); } catch (e) { console.warn("[enhancements] petals", e); }
    try { initGlow(); } catch (e) { console.warn("[enhancements] glow", e); }
    try { initRipples(); } catch (e) { console.warn("[enhancements] ripples", e); }
    try { initMagnetic(); } catch (e) { console.warn("[enhancements] magnetic", e); }
    try { initHaptics(); } catch (e) { console.warn("[enhancements] haptics", e); }
  }

  // This file is loaded after the page has been parsed (see the site loader),
  // so the DOM is ready; the check below also covers a normal <script> load.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
