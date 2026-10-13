/* =========================================================
   effects.js
   Visual effects: hero particles, custom cursor, finale burst,
   reduced-motion + low-power detection.
   ========================================================= */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const isLowPower = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isTouch;

  window.VishiiEffects = {
    prefersReducedMotion,
    isTouch,
    isLowPower
  };

  /* ---------- Custom cursor (desktop only) ----------
     The animation loop now runs only while the ring is still catching up with
     the pointer, instead of every frame forever. */
  if (!isTouch && !prefersReducedMotion) {
    document.body.classList.add("has-fine-pointer");
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    let ringX = 0, ringY = 0, dotX = 0, dotY = 0, cursorRunning = false;

    function animateCursor() {
      ringX += (dotX - ringX) * 0.18;
      ringY += (dotY - ringY) * 0.18;
      if (dot) { dot.style.left = dotX + "px"; dot.style.top = dotY + "px"; }
      if (ring) { ring.style.left = ringX + "px"; ring.style.top = ringY + "px"; }
      if (Math.abs(dotX - ringX) + Math.abs(dotY - ringY) > 0.3) {
        requestAnimationFrame(animateCursor);
      } else {
        cursorRunning = false;
      }
    }

    window.addEventListener("pointermove", (e) => {
      dotX = e.clientX; dotY = e.clientY;
      if (!cursorRunning) { cursorRunning = true; requestAnimationFrame(animateCursor); }
    }, { passive: true });

    document.addEventListener("pointerover", (e) => {
      if (e.target.closest("a, button, .gallery-item, .star, input")) {
        ring && ring.classList.add("is-active");
      }
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest("a, button, .gallery-item, .star, input")) {
        ring && ring.classList.remove("is-active");
      }
    });
  }

  /* ---------- Hero particle field ----------
     Draws only while the hero is on screen and the tab is visible, and the
     resize handler is debounced (phones fire "resize" constantly while the
     browser toolbar slides in and out, which used to rebuild everything). */
  const heroCanvas = document.getElementById("heroParticles");
  if (heroCanvas) {
    const ctx = heroCanvas.getContext("2d");
    let particles = [];
    let w = 0, h = 0, dpr = 1;
    let rafId = null;
    let heroVisible = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = heroCanvas.clientWidth;
      h = heroCanvas.clientHeight;
      heroCanvas.width = Math.max(1, Math.round(w * dpr));
      heroCanvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticles() {
      const count = isLowPower ? 40 : 90;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        vy: Math.random() * 0.15 + 0.03,
        vx: (Math.random() - 0.5) * 0.08,
        alpha: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      }));
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      t += 1;
      for (const p of particles) {
        p.y -= p.vy;
        p.x += p.vx;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        const flicker = 0.5 + 0.5 * Math.sin(t * p.twinkleSpeed + p.x);
        ctx.beginPath();
        ctx.fillStyle = `rgba(230, 200, 210, ${p.alpha * flicker})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      rafId = null;
      if (!heroVisible || document.hidden) return;
      draw();
      if (!prefersReducedMotion) rafId = requestAnimationFrame(loop);
    }
    function startLoop() { if (rafId === null) rafId = requestAnimationFrame(loop); }

    resize();
    createParticles();
    draw();
    if (!prefersReducedMotion) startLoop();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => { heroVisible = entry.isIntersecting; });
        if (heroVisible && !prefersReducedMotion) startLoop();
      }).observe(heroCanvas);
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !prefersReducedMotion) startLoop();
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const widthChanged = heroCanvas.clientWidth !== w;
        resize();
        if (widthChanged) createParticles();
        if (prefersReducedMotion) draw();
      }, 150);
    }, { passive: true });
  }

  /* ---------- Finale celebration sparkles ---------- */
  /* Lightweight, GPU-friendly replacement for the old canvas particle
     burst: a small, capped number of DOM elements animated purely
     with CSS transform/opacity, each removing itself when its
     animation ends. No rAF loop, no per-frame canvas redraw, no
     unbounded particle growth — this is what keeps finaleHeart clicks
     smooth even on low-power mobile devices. Reused for the
     "Important Question" reveal too, via a different target layer. */
  const sparkleEmoji = ["❤️", "✨", "💫", "🎉"];
  const MAX_ON_SCREEN = 24;

  function spawnSparkles(layerEl, count) {
    if (!layerEl) return;
    const existing = layerEl.children.length;
    const toSpawn = Math.min(count, Math.max(0, MAX_ON_SCREEN - existing));

    for (let i = 0; i < toSpawn; i++) {
      const el = document.createElement("span");
      el.className = "finale__sparkle";
      el.textContent = sparkleEmoji[Math.floor(Math.random() * sparkleEmoji.length)];
      const startX = 30 + Math.random() * 40; // cluster near the center, in %
      const drift = (Math.random() - 0.5) * 120; // px
      const size = 14 + Math.random() * 14;
      const duration = prefersReducedMotion ? 0.01 : 1.8 + Math.random() * 1.2;
      const rotate = (Math.random() - 0.5) * 100;
      el.style.setProperty("--sx", startX + "%");
      el.style.setProperty("--sx-drift", drift + "px");
      el.style.setProperty("--sf", size + "px");
      el.style.setProperty("--sd", duration + "s");
      el.style.setProperty("--sr", rotate + "deg");
      el.addEventListener("animationend", () => el.remove(), { once: true });
      layerEl.appendChild(el);
    }
  }

  const finaleSparkleLayer = document.getElementById("finaleSparkleLayer");
  if (finaleSparkleLayer) {
    window.VishiiEffects.fireFinaleBurst = function () {
      spawnSparkles(finaleSparkleLayer, isLowPower ? 8 : 12);
    };
  }

  window.VishiiEffects.spawnSparkles = spawnSparkles;
})();
