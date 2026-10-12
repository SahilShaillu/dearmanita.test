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

  /* ---------- Custom cursor (desktop only) ---------- */
  if (!isTouch && !prefersReducedMotion) {
    document.body.classList.add("has-fine-pointer");
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    let ringX = 0, ringY = 0, dotX = 0, dotY = 0;

    window.addEventListener("pointermove", (e) => {
      dotX = e.clientX; dotY = e.clientY;
    }, { passive: true });

    function animateCursor() {
      ringX += (dotX - ringX) * 0.18;
      ringY += (dotY - ringY) * 0.18;
      if (dot) { dot.style.left = dotX + "px"; dot.style.top = dotY + "px"; }
      if (ring) { ring.style.left = ringX + "px"; ring.style.top = ringY + "px"; }
      requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

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

  /* ---------- Hero particle field ---------- */
  const heroCanvas = document.getElementById("heroParticles");
  if (heroCanvas) {
    const ctx = heroCanvas.getContext("2d");
    let particles = [];
    let w, h, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = heroCanvas.clientWidth;
      h = heroCanvas.clientHeight;
      heroCanvas.width = w * dpr;
      heroCanvas.height = h * dpr;
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
      if (!prefersReducedMotion) requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();
    window.addEventListener("resize", () => { resize(); createParticles(); });
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
