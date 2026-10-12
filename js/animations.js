/* =========================================================
   animations.js
   Scroll reveals, hero cinematic sequence, love meter,
   research stat counters, cinematic story scroll,
   constellation stars, heartbeat line, timeline, word stack.
   ========================================================= */

(function () {
  "use strict";

  const reducedMotion = window.VishiiEffects && window.VishiiEffects.prefersReducedMotion;

  /* ---------- Generic scroll reveal helper ---------- */
  function observeReveal(selector, options = {}) {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;
    if (reducedMotion) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            if (!options.repeat) io.unobserve(entry.target);
          } else if (options.repeat) {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold: options.threshold || 0.35 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* Staggered reveal within a container */
  function observeStagger(containerSelector, itemSelector, staggerMs = 120) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const items = container.querySelectorAll(itemSelector);
    if (reducedMotion) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            items.forEach((el, i) => {
              setTimeout(() => el.classList.add("is-visible"), i * staggerMs);
            });
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(container);
  }

  document.addEventListener("DOMContentLoaded", () => {
    observeStagger("#wordStack", ".word-stack__item", 180);
    observeStagger("#timeline", ".timeline__item", 200);
    observeStagger("#loveList", ".love-list li", 140);
    observeStagger("#sideEffectsList", "li", 100);
    observeStagger("#badgeGrid", ".badge", 90);
    observeStagger("#museumGrid", ".museum-room", 130);
    initGalleryMotion();
    observeReveal(".heartbeat__line");
    initHeartbeatLength();
    observeReveal(".reveal-fade");

    initHeroSequence();
    initLoveMeter();
    initResearchStats();
    initStoryScroll();
    initConstellation();
    initScrollProgress();
  });

  /* ---------- Hero cinematic intro sequence ---------- */
  function initHeroSequence() {
    const line1 = document.getElementById("heroLine1");
    const heartWrap = document.getElementById("heroHeartWrap");
    const heart = document.getElementById("heroHeart");
    const title = document.getElementById("heroTitle");
    const sub = document.getElementById("heroSub");
    const cta = document.getElementById("heroCtaWrap");
    if (!line1) return;

    // heroDate is intentionally left out of this timing chain — it now
    // has its own fully self-contained cinematic sequence, handled by
    // initHeroDateCinematic() in main.js.
    const timings = reducedMotion
      ? { showLine1: 0, hideLine1: 100, showHeart: 150, showTitle: 250, showSub: 350, showCta: 450 }
      : { showLine1: 300, hideLine1: 2600, showHeart: 3000, showTitle: 4200, showSub: 5000, showCta: 6200 };

    setTimeout(() => line1.classList.add("is-visible"), timings.showLine1);
    setTimeout(() => line1.classList.add("is-hidden"), timings.hideLine1);
    setTimeout(() => {
      heartWrap.classList.add("is-visible");
      heart.classList.add("is-pulsing");
    }, timings.showHeart);
    setTimeout(() => title.classList.add("is-visible"), timings.showTitle);
    setTimeout(() => sub.classList.add("is-visible"), timings.showSub);
    setTimeout(() => cta.classList.add("is-visible"), timings.showCta);
  }

  /* ---------- Love meter (SVG circle, animates past 100%) ---------- */
  function initLoveMeter() {
    const section = document.querySelector(".section--love-meter");
    const progress = document.getElementById("loveMeterProgress");
    const valueEl = document.getElementById("loveMeterValue");
    const errorEl = document.getElementById("loveMeterError");
    if (!section || !progress) return;

    const circumference = 2 * Math.PI * 85;
    progress.style.strokeDasharray = circumference;
    progress.style.strokeDashoffset = circumference;

    let played = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !played) {
          played = true;
          playMeter();
          io.disconnect();
        }
      });
    }, { threshold: 0.5 });
    io.observe(section);

    function playMeter() {
      // Animate the ring fully closing (looks "full") while counting past 100 to infinity
      progress.style.transition = reducedMotion ? "none" : "stroke-dashoffset 2.4s cubic-bezier(.22,.9,.32,1)";
      requestAnimationFrame(() => { progress.style.strokeDashoffset = 0; });

      const duration = reducedMotion ? 10 : 2400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const displayValue = Math.round(eased * 130); // overshoot past 100
        if (displayValue <= 100) {
          valueEl.textContent = displayValue + "%";
        } else {
          valueEl.textContent = "\u221E%"; // infinity
        }
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          valueEl.textContent = "\u221E%";
          setTimeout(() => errorEl.classList.add("is-visible"), 300);
        }
      }
      requestAnimationFrame(tick);
    }
  }

  /* ---------- Research stat bars ---------- */
  function initResearchStats() {
    const stats = document.querySelectorAll(".research-stat");
    if (!stats.length) return;

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateStat(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    stats.forEach((s) => io.observe(s));

    function animateStat(el) {
      const fill = el.querySelector(".research-stat__fill");
      const valueEl = el.querySelector(".research-stat__value");

      // Some stats (e.g. the Personality Report) use a plain text
      // result instead of an animated number — just fade it in.
      if (el.dataset.text) {
        fill.style.width = "100%";
        const duration = reducedMotion ? 10 : 700;
        setTimeout(() => { valueEl.textContent = el.dataset.text; }, reducedMotion ? 0 : 500);
        return;
      }

      const target = parseFloat(el.dataset.value);
      const suffix = el.dataset.suffix || "";
      const isInfinity = el.dataset.infinity === "true";
      const fillPct = Math.min(target, 120);
      fill.style.width = fillPct + "%";

      const duration = reducedMotion ? 10 : 1600;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const current = target * eased;
        if (isInfinity && p > 0.85) {
          valueEl.textContent = "\u221E";
        } else {
          valueEl.textContent = (Math.round(current * 10) / 10) + suffix;
        }
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }

  /* ---------- Cinematic scroll story (single active scene, no overlap) ---------- */
  function initStoryScroll() {
    const track = document.getElementById("storyTrack");
    const scenes = document.querySelectorAll(".story__scene");
    if (!track || !scenes.length) return;

    // Give the track enough scroll room for every scene to get its own
    // full-viewport "turn" — set here so it always matches scene count.
    track.style.height = (scenes.length * 100) + "vh";

    let ticking = false;

    function update() {
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      let progress = scrollable > 0 ? -rect.top / scrollable : 0;
      progress = Math.min(1, Math.max(0, progress));
      // Exactly one scene is active at any moment — this is what
      // guarantees scenes can never visually overlap.
      const activeIndex = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
      scenes.forEach((scene, i) => {
        scene.classList.toggle("is-active", i === activeIndex);
      });
      ticking = false;
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Constellation stars ---------- */
  function initConstellation() {
    const container = document.getElementById("constellation");
    if (!container) return;

    const reasons = [
      "You make people feel cared for.",
      "You make boring days interesting.",
      "You have a smile that is impossible to ignore.",
      "You are completely yourself.",
      "You are precious.",
      "Your laugh is contagious.",
      "You notice the little things.",
      "You make everyone around you feel safe.",
      "Your heart is bigger than your nakhre.",
      "You turn ordinary days into memories."
    ];

    // Evenly spaced grid with gentle per-star jitter, so stars stay
    // well-distributed at any container width/height instead of
    // clustering. Positions are clamped away from the edges so each
    // star's popover card stays fully on screen.
    const columns = 5;
    const rows = Math.ceil(reasons.length / columns);
    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

    reasons.forEach((text, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const cellW = 100 / columns;
      const cellH = 100 / rows;
      const jitterX = (Math.random() - 0.5) * cellW * 0.55;
      const jitterY = (Math.random() - 0.5) * cellH * 0.55;
      const x = clamp(cellW * col + cellW / 2 + jitterX, 10, 90);
      const y = clamp(cellH * row + cellH / 2 + jitterY, 12, 88);

      const star = document.createElement("button");
      star.className = "star";
      star.type = "button";
      star.style.left = x + "%";
      star.style.top = y + "%";
      star.style.animationDelay = (Math.random() * 2) + "s";
      star.setAttribute("aria-label", "Reveal a reason: " + (i + 1));
      star.setAttribute("aria-expanded", "false");

      // Flip the popover card so it always stays fully on screen,
      // regardless of where the star sits in the constellation.
      if (x < 22) star.classList.add("star--align-left");
      else if (x > 78) star.classList.add("star--align-right");
      if (y > 58) star.classList.add("star--flip-up");

      const card = document.createElement("span");
      card.className = "star__card";
      card.textContent = text;
      star.appendChild(card);

      star.addEventListener("click", () => {
        const isOpen = star.classList.contains("is-open");
        document.querySelectorAll(".star.is-open").forEach((s) => {
          s.classList.remove("is-open");
          s.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          star.classList.add("is-open");
          star.setAttribute("aria-expanded", "true");
        }
      });

      container.appendChild(star);
    });
  }

  /* ---------- Scroll progress bar ---------- */
  function initScrollProgress() {
    const fill = document.getElementById("scrollProgressFill");
    if (!fill) return;
    let ticking = false;
    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      fill.style.width = pct + "%";
      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ---------- Gallery motion: reveal once, then float continuously ---------- */
  function initGalleryMotion() {
    const items = document.querySelectorAll(".gallery-item");
    if (!items.length) return;
    if (reducedMotion) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            el.classList.add("is-visible");
            // Wait for the one-time reveal transition (0.8s) to fully
            // settle before starting the continuous float, so there's
            // no visual jump between the two.
            setTimeout(() => el.classList.add("is-floating"), 850);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.35 }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Heartbeat: measure the real path length so the draw
     animation always matches exactly, regardless of path shape ---------- */
  function initHeartbeatLength() {
    const path = document.getElementById("heartbeatPath");
    if (!path || typeof path.getTotalLength !== "function") return;
    try {
      const length = Math.ceil(path.getTotalLength());
      path.style.setProperty("--hb-length", length);
    } catch (e) {
      // Leave the CSS fallback value in place if measurement fails for
      // any reason (e.g. the path isn't rendered yet in some edge case).
    }
  }
})();
