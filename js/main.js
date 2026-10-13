/* =========================================================
   main.js
   Ties together interactions across the page: hero CTA,
   VISHII effect cards, survival guide, password-protected
   love letter, finale celebration, footer secret, and
   assorted Easter eggs.
   ========================================================= */

(function () {
  "use strict";

  const reducedMotion = window.VishiiEffects && window.VishiiEffects.prefersReducedMotion;

  /* ---------- Egg toast helper (shared) ---------- */
  const eggToast = document.getElementById("eggToast");
  let eggToastTimer;
  window.showEggToast = function (message) {
    if (!eggToast) return;
    eggToast.textContent = message;
    eggToast.classList.add("is-visible");
    clearTimeout(eggToastTimer);
    eggToastTimer = setTimeout(() => eggToast.classList.remove("is-visible"), 2600);
  };

  /* ---------- Hero CTA: scroll to next section + burst ---------- */
  const beginBtn = document.getElementById("beginJourneyBtn");
  const scrollIndicator = document.getElementById("scrollIndicator");
  const heroSection = document.getElementById("hero");

  function goToNextSection() {
    const next = heroSection.nextElementSibling;
    if (next) next.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }
  beginBtn && beginBtn.addEventListener("click", goToNextSection);
  scrollIndicator && scrollIndicator.addEventListener("click", goToNextSection);

  /* ---------- VISHII Effect cards (and Pampering Menu, which reuses
     the same component) — independent multi-toggle accordion. The
     Choose Your Birthday Surprise cards are excluded here since they
     use single-select behavior instead (see below). ---------- */
  document.querySelectorAll(".effect-card").forEach((card) => {
    if (card.closest("#choiceGrid")) return;
    card.addEventListener("click", () => {
      const wasOpen = card.classList.contains("is-open");
      card.classList.toggle("is-open");
      card.setAttribute("aria-expanded", String(!wasOpen));
    });
  });

  /* ---------- Achievement badges: tap to reveal ---------- */
  document.querySelectorAll(".badge").forEach((badge) => {
    badge.addEventListener("click", () => {
      const wasOpen = badge.classList.contains("is-open");
      badge.classList.toggle("is-open");
      badge.setAttribute("aria-expanded", String(!wasOpen));
    });
  });

  /* ---------- Choose Your Birthday Surprise: single-select ----------
     Picking one option closes any other that was open, like a radio
     button — only one answer is ever revealed at a time. */
  const choiceGrid = document.getElementById("choiceGrid");
  if (choiceGrid) {
    const choiceCards = choiceGrid.querySelectorAll(".effect-card");
    choiceCards.forEach((card) => {
      card.addEventListener("click", () => {
        choiceCards.forEach((c) => {
          c.classList.remove("is-open");
          c.setAttribute("aria-checked", "false");
        });
        card.classList.add("is-open");
        card.setAttribute("aria-checked", "true");
      });
    });
  }

  /* ---------- Boyfriend Survival Guide: emergency button ---------- */
  const emergencyBtn = document.getElementById("emergencyBtn");
  const emergencySteps = document.getElementById("emergencySteps");
  emergencyBtn && emergencyBtn.addEventListener("click", () => {
    const isHidden = emergencySteps.hidden;
    emergencySteps.hidden = !isHidden;
    emergencyBtn.setAttribute("aria-expanded", String(isHidden));
    if (isHidden) {
      emergencySteps.querySelectorAll("li").forEach((li) => {
        li.style.animation = "none";
        void li.offsetWidth; // restart animation
        li.style.animation = "";
      });
    }
  });

  /* Magnetic buttons: handled once, by enhancements.js (the old copy here stacked a
     second offset on top of it and ran getBoundingClientRect on every mouse move). */

  /* ---------- Private love letter modal ----------
     The password step that used to gate this letter has been removed:
     the whole private page it now lives on is already gated by its
     own page-level lock (see private-gate.js on manita.html), so a
     second password prompt here would just be redundant. Tapping the
     button opens the letter directly. */
  const openLetterBtn = document.getElementById("openLetterBtn");
  const letterModal = document.getElementById("letterModal");
  const letterModalClose = document.getElementById("letterModalClose");
  const letterPaper = document.getElementById("letterPaper");
  const letterProgress = document.getElementById("letterProgress");
  const letterEnd = document.getElementById("letterEnd");

  let lastFocusedBeforeModal = null;

  function openModal(modalEl, focusTarget) {
    lastFocusedBeforeModal = document.activeElement;
    modalEl.hidden = false;
    if (focusTarget) focusTarget.focus();
    document.addEventListener("keydown", handleModalEscape);
  }
  function closeModal(modalEl) {
    modalEl.hidden = true;
    document.removeEventListener("keydown", handleModalEscape);
    if (lastFocusedBeforeModal) lastFocusedBeforeModal.focus();
  }
  function handleModalEscape(e) {
    if (e.key === "Escape" && letterModal && !letterModal.hidden) {
      closeModal(letterModal);
    }
  }

  function openLetter() {
    letterEnd.hidden = true;
    letterProgress.hidden = false;
    // Re-trigger paragraph reveal animation with stagger
    const paragraphs = letterPaper.querySelectorAll("p");
    paragraphs.forEach((p, i) => {
      p.style.animation = "none";
      void p.offsetWidth;
      p.style.animationDelay = (i * 0.25) + "s";
      p.style.animation = "";
    });
    openModal(letterModal, letterModalClose);
  }

  openLetterBtn && openLetterBtn.addEventListener("click", openLetter);
  letterModalClose && letterModalClose.addEventListener("click", () => closeModal(letterModal));
  letterModal && letterModal.querySelector(".modal__backdrop").addEventListener("click", () => closeModal(letterModal));

  /* Track scroll within the letter to show "end of note" */
  letterPaper && letterPaper.addEventListener("scroll", () => {
    const scrolledToEnd = letterPaper.scrollTop + letterPaper.clientHeight >= letterPaper.scrollHeight - 20;
    if (scrolledToEnd) {
      letterProgress.hidden = true;
      letterEnd.hidden = false;
    } else {
      letterProgress.hidden = false;
      letterEnd.hidden = true;
    }
  });

  /* ---------- Finale heart + celebration ---------- */
  const finaleHeart = document.getElementById("finaleHeart");
  const finaleSection = document.getElementById("finaleSection");
  let finaleClickCount = 0;
  let finaleAutoFired = false;

  if (finaleSection) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !finaleAutoFired) {
          finaleAutoFired = true;
          setTimeout(() => {
            fireFinaleBurstThrottled();
          }, 500);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    io.observe(finaleSection);
  }

  finaleHeart && finaleHeart.addEventListener("click", () => {
    fireFinaleBurstThrottled();
    finaleClickCount++;
    if (finaleClickCount === 6) {
      window.showEggToast("Okay okay... you really like clicking hearts. 😂❤️");
    }
  });

  // A cooldown stops rapid repeated clicks from stacking up multiple
  // bursts at once, which is what caused the animation to lag.
  let finaleBurstOnCooldown = false;
  function fireFinaleBurstThrottled() {
    if (finaleBurstOnCooldown) return;
    if (window.VishiiEffects && window.VishiiEffects.fireFinaleBurst) {
      window.VishiiEffects.fireFinaleBurst();
    }
    finaleBurstOnCooldown = true;
    setTimeout(() => { finaleBurstOnCooldown = false; }, 900);
  }

  /* ---------- Replay button ---------- */
  const replayBtn = document.getElementById("replayBtn");
  replayBtn && replayBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  /* ---------- Let's Celebrate: avatar, cake-cutting, confetti cannon ---------- */
  const avatarStage = document.getElementById("avatarStage");
  const avatarFigure = document.getElementById("avatarFigure");
  const avatarCake = document.getElementById("avatarCake");
  const avatarPartyBtn = document.getElementById("avatarPartyBtn");
  const avatarMessage = document.getElementById("avatarMessage");
  const avatarConfettiLayer = document.getElementById("avatarConfettiLayer");

  if (avatarStage && avatarFigure && avatarCake && avatarPartyBtn) {
    const confettiColors = ["var(--gold)", "var(--rose)", "var(--burgundy)", "var(--cream)", "var(--blush)"];
    const avatarParticleLayer = document.getElementById("avatarParticleLayer");
    let avatarBusy = false;

    function fireConfettiCannon() {
      if (!avatarConfettiLayer || reducedMotion) return;
      const stageRect = avatarStage.getBoundingClientRect();
      // Two cannon origins roughly at the avatar's raised hands, one
      // on each side, so the blast reads as coming from her cheer pose.
      const origins = [
        { xPct: 30, sign: -1 },
        { xPct: 70, sign: 1 }
      ];
      const count = (window.VishiiEffects && window.VishiiEffects.isLowPower) ? 12 : 20;

      for (let i = 0; i < count; i++) {
        const origin = origins[i % origins.length];
        const piece = document.createElement("span");
        piece.className = "avatar-confetti";
        const spread = origin.sign * (30 + Math.random() * 90);
        const spreadEnd = origin.sign * (10 + Math.random() * 50);
        piece.style.setProperty("--cx", origin.xPct + "%");
        piece.style.setProperty("--cy", (20 + Math.random() * 15) + "%");
        piece.style.setProperty("--cw", (5 + Math.random() * 4) + "px");
        piece.style.setProperty("--ch", (10 + Math.random() * 8) + "px");
        piece.style.setProperty("--cc", confettiColors[Math.floor(Math.random() * confettiColors.length)]);
        piece.style.setProperty("--ctx", spread + "px");
        piece.style.setProperty("--ctx-end", spreadEnd + "px");
        piece.style.setProperty("--cpeak", (60 + Math.random() * 60) + "px");
        piece.style.setProperty("--cfall", (Math.max(stageRect.height, 160) * 0.7 + Math.random() * 60) + "px");
        piece.style.setProperty("--crot", (Math.random() * 360) + "deg");
        piece.style.setProperty("--crot2", (720 + Math.random() * 360) + "deg");
        piece.style.setProperty("--cdur", (1.4 + Math.random() * 0.6) + "s");
        piece.style.setProperty("--cdelay", (Math.random() * 0.2) + "s");
        piece.addEventListener("animationend", () => piece.remove(), { once: true });
        avatarConfettiLayer.appendChild(piece);
      }
    }

    // Tiny floating hearts and soft glowing sparkle particles, rising
    // gently from around the cake at the moment it's cut — a quieter,
    // warmer companion to the confetti cannon above.
    function fireAvatarParticles() {
      if (!avatarParticleLayer || reducedMotion) return;
      const lowPower = window.VishiiEffects && window.VishiiEffects.isLowPower;
      const heartCount = lowPower ? 4 : 7;
      const glowCount = lowPower ? 6 : 10;

      for (let i = 0; i < heartCount; i++) {
        const heart = document.createElement("span");
        heart.className = "avatar-heart";
        heart.textContent = Math.random() > 0.5 ? "❤️" : "💗";
        heart.style.setProperty("--ahx", (38 + Math.random() * 24) + "%");
        heart.style.setProperty("--ahy", (45 + Math.random() * 15) + "%");
        heart.style.setProperty("--ahs", (12 + Math.random() * 8) + "px");
        heart.style.setProperty("--ahdx", ((Math.random() - 0.5) * 60) + "px");
        heart.style.setProperty("--ahdur", (2 + Math.random() * 1.2) + "s");
        heart.style.setProperty("--ahdelay", (Math.random() * 0.6) + "s");
        heart.addEventListener("animationend", () => heart.remove(), { once: true });
        avatarParticleLayer.appendChild(heart);
      }

      for (let i = 0; i < glowCount; i++) {
        const glow = document.createElement("span");
        glow.className = "avatar-glow-particle";
        glow.style.setProperty("--agx", (30 + Math.random() * 40) + "%");
        glow.style.setProperty("--agy", (40 + Math.random() * 20) + "%");
        glow.style.setProperty("--ags", (4 + Math.random() * 5) + "px");
        glow.style.setProperty("--agdx", ((Math.random() - 0.5) * 50) + "px");
        glow.style.setProperty("--agdur", (1.6 + Math.random() * 1) + "s");
        glow.style.setProperty("--agdelay", (Math.random() * 0.5) + "s");
        glow.addEventListener("animationend", () => glow.remove(), { once: true });
        avatarParticleLayer.appendChild(glow);
      }
    }

    function playCelebration() {
      if (avatarBusy) return;
      avatarBusy = true;
      avatarCake.classList.remove("is-cutting");
      avatarMessage.classList.remove("is-visible");
      avatarPartyBtn.disabled = true;

      // 1) light the candles
      avatarCake.classList.add("is-lit");

      // 2) a beat later, cut the cake, cheer, and blast confetti + particles
      setTimeout(() => {
        avatarCake.classList.add("is-cutting");
        if (!reducedMotion) {
          avatarFigure.classList.remove("is-celebrating");
          void avatarFigure.offsetWidth;
          avatarFigure.classList.add("is-celebrating");
        }
        fireConfettiCannon();
        fireAvatarParticles();
        avatarMessage.classList.add("is-visible");
        avatarPartyBtn.textContent = "Replay the celebration ";
        const sparkleIcon = document.createElement("span");
        sparkleIcon.setAttribute("aria-hidden", "true");
        sparkleIcon.textContent = "✨";
        avatarPartyBtn.appendChild(sparkleIcon);
        avatarPartyBtn.disabled = false;
        avatarBusy = false;
      }, reducedMotion ? 50 : 1100);
    }

    avatarPartyBtn.addEventListener("click", playCelebration);
  }

  /* ---------- Important Question: dodging button + reveal ---------- */
  const iqStage = document.getElementById("iqStage");
  const iqBtnA = document.getElementById("iqBtnA");
  const iqBtnB = document.getElementById("iqBtnB");
  const iqResult = document.getElementById("iqResult");
  const iqHeartLayer = document.getElementById("iqHeartLayer");
  const isTouchDevice = window.VishiiEffects && window.VishiiEffects.isTouch;

  if (iqStage && iqBtnA && iqBtnB && iqResult) {
    let resolved = false;
    let dodgeCooldownUntil = 0;

    function revealIqResult() {
      if (resolved) return;
      resolved = true;
      iqStage.setAttribute("aria-hidden", "true");
      iqBtnA.disabled = true;
      iqBtnB.disabled = true;
      iqResult.hidden = false;
      requestAnimationFrame(() => iqResult.classList.add("is-visible"));
      if (window.VishiiEffects && window.VishiiEffects.spawnSparkles) {
        window.VishiiEffects.spawnSparkles(iqHeartLayer, window.VishiiEffects.isLowPower ? 6 : 9);
      }
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh, margin) {
      return !(ax + aw + margin < bx || bx + bw + margin < ax || ay + ah + margin < by || by + bh + margin < ay);
    }

    // Tries several random spots inside the stage and picks one that
    // is both clear of Button A (plus a safety margin) and far enough
    // from the pointer/finger — so the two buttons can never overlap,
    // and the dodge always actually escapes the cursor rather than
    // relying on luck.
    function pickSafeSpot(stageW, stageH, btnW, btnH, avoidRect, pointer, minDistFromPointer) {
      const PAD = 10; // keeps the float animation (-6px) and shadow inside the stage
      const maxLeft = Math.max(PAD, stageW - btnW - PAD);
      const maxTop = Math.max(PAD, stageH - btnH - PAD);
      let fallback = null;
      let fallbackDist = -1;
      for (let i = 0; i < 30; i++) {
        const x = PAD + Math.random() * (maxLeft - PAD);
        const y = PAD + Math.random() * (maxTop - PAD);
        if (avoidRect && rectsOverlap(x, y, btnW, btnH, avoidRect.x, avoidRect.y, avoidRect.w, avoidRect.h, 18)) {
          continue;
        }
        if (!pointer) return { x, y };
        const dist = Math.hypot(x + btnW / 2 - pointer.x, y + btnH / 2 - pointer.y);
        if (dist >= minDistFromPointer) return { x, y };
        if (dist > fallbackDist) { fallbackDist = dist; fallback = { x, y }; }
      }
      // Every candidate was too close to the pointer (or the stage is tiny):
      // use the farthest valid spot, else the bottom-right corner, which is
      // always inside the stage.
      return fallback || { x: maxLeft, y: maxTop };
    }

    // Button B is a permanent, playful dead end — it always dodges, on
    // hover, tap, or click, and can never actually be caught by a
    // pointer. Button A is the real (and only) way to reach the
    // result. The one exception is prefers-reduced-motion, where it
    // resolves normally rather than trapping a motion-sensitive user.
    // `force` is used for re-placing it after a resize/layout change,
    // where it must still land inside the stage even with reduced motion.
    function dodgeIqButton(pointer, force) {
      if (resolved || (reducedMotion && !force)) return false;

      const stageRect = iqStage.getBoundingClientRect();
      const stageW = iqStage.clientWidth;
      const stageH = iqStage.clientHeight;
      if (!stageW || !stageH) return false; // not laid out yet; the observers below retry
      const aRect = iqBtnA.getBoundingClientRect();
      const avoidRect = {
        x: aRect.left - stageRect.left,
        y: aRect.top - stageRect.top,
        w: aRect.width,
        h: aRect.height
      };
      const relPointer = pointer ? { x: pointer.x - stageRect.left, y: pointer.y - stageRect.top } : null;
      const spot = pickSafeSpot(stageW, stageH, iqBtnB.offsetWidth, iqBtnB.offsetHeight, avoidRect, relPointer, 90);

      iqBtnB.style.left = spot.x + "px";
      iqBtnB.style.top = spot.y + "px";

      if (!reducedMotion) {
        iqBtnB.classList.remove("iq__btn--wiggle");
        void iqBtnB.offsetWidth;
        iqBtnB.classList.add("iq__btn--wiggle");
      }
      return true;
    }

    // Dodges proactively once the pointer/finger gets within a danger
    // radius of the button's CURRENT position — this is what makes it
    // feel like it senses the cursor coming, rather than only reacting
    // after already being touched.
    function handlePointerProximity(clientX, clientY, dangerRadius) {
      if (resolved || reducedMotion) return;
      const now = performance.now();
      if (now < dodgeCooldownUntil) return;
      const btnRect = iqBtnB.getBoundingClientRect();
      const cx = btnRect.left + btnRect.width / 2;
      const cy = btnRect.top + btnRect.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist < dangerRadius) {
        dodgeIqButton({ x: clientX, y: clientY });
        dodgeCooldownUntil = now + 220;
      }
    }

    // Place it safely (clear of Button A) as soon as layout is ready,
    // rather than starting from its CSS fallback position.
    requestAnimationFrame(() => dodgeIqButton(null, true));

    // Keep Button B inside the stage whenever the stage changes size
    // (phone rotation, window resize, split-screen, web fonts finishing
    // loading, section becoming visible for the first time). Without this
    // the px position chosen for an old size can end up outside the
    // stage, where its overflow:hidden hides the button completely.
    // ResizeObserver only fires on a real size change, so Safari's
    // address-bar show/hide does not make the button jump while scrolling.
    let iqKeepTimer = null;
    let iqLastW = 0, iqLastH = 0;
    function keepIqInside() {
      clearTimeout(iqKeepTimer);
      iqKeepTimer = setTimeout(() => {
        const w = iqStage.clientWidth, h = iqStage.clientHeight;
        if (!w || !h) return;
        if (w === iqLastW && h === iqLastH) return;
        iqLastW = w; iqLastH = h;
        dodgeIqButton(null, true);
      }, 120);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(keepIqInside).observe(iqStage);
    } else {
      window.addEventListener("resize", keepIqInside, { passive: true });
      window.addEventListener("orientationchange", keepIqInside);
    }
    if ("IntersectionObserver" in window) {
      const iqSeen = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          iqSeen.disconnect();
          dodgeIqButton(null, true);
        }
      }, { threshold: 0.2 });
      iqSeen.observe(iqStage);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => dodgeIqButton(null, true)).catch(() => {});
    }

    iqBtnA.addEventListener("click", revealIqResult);

    if (!isTouchDevice) {
      iqStage.addEventListener("mousemove", (e) => {
        handlePointerProximity(e.clientX, e.clientY, 75);
      });
      iqBtnB.addEventListener("click", (e) => {
        if (reducedMotion) { revealIqResult(); return; }
        e.preventDefault();
        dodgeIqButton({ x: e.clientX, y: e.clientY });
      });
    } else {
      iqStage.addEventListener("touchstart", (e) => {
        const t = e.touches[0];
        if (t) handlePointerProximity(t.clientX, t.clientY, 60);
      }, { passive: true });
      iqStage.addEventListener("touchmove", (e) => {
        const t = e.touches[0];
        if (t) handlePointerProximity(t.clientX, t.clientY, 60);
      }, { passive: true });
      iqBtnB.addEventListener("click", (e) => {
        if (reducedMotion) { revealIqResult(); return; }
        e.preventDefault();
        dodgeIqButton(null);
      });
    }
  }

  /* ---------- Hero chronicle: date + caption, in three beats ----------
     13 . 10 . 2003  The Beginning
     13 . 10 . 2026  The Journey
     13 . 10 . 3026  The Beyond
     The date fades up, a gold rule draws from the centre, and the caption's
     letters bloom out of it. Before each new date the caption lifts away, the
     rule retracts, the year counts up under a stronger glow, and the next
     caption lands when the year does. Only opacity/transform are animated
     (see animations.css), and the year text is touched only when its number
     changes, so it stays smooth in Safari. */
  const heroChrono = document.getElementById("heroDate");
  const heroYearEl = document.getElementById("heroYear");
  const heroCaptionEl = document.getElementById("heroCaption");
  if (heroChrono && heroYearEl && heroCaptionEl) {
    const PHASES = [
      { year: 2003, text: "The Beginning", order: "centre" },
      { year: 2026, text: "The Journey", order: "ltr" },
      { year: 3026, text: "The Beyond", order: "centre" }
    ];
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const COUNT_MS = reducedMotion ? 1 : 5200;
    
    function buildCaption(phase) {
      heroCaptionEl.className = "hero-chrono__caption";
      heroCaptionEl.textContent = "";
      const chars = Array.from(phase.text);
      const mid = (chars.length - 1) / 2;
      chars.forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "chrono-letter" + (ch === " " ? " chrono-letter--space" : "");
        span.textContent = ch === " " ? "\u00a0" : ch;
        const inDelay = phase.order === "ltr" ? i * 35 : Math.abs(i - mid) * 28;
        span.style.setProperty("--ld", Math.round(inDelay) + "ms");
        span.style.setProperty("--ld-out", Math.round(i * 20) + "ms");
        span.style.setProperty("--tw", (i * 0.17).toFixed(2) + "s");
        heroCaptionEl.appendChild(span);
      });
    }

    function enterPhase(index) {
      const phase = PHASES[index];
      heroChrono.setAttribute("data-phase", String(index + 1));
      heroChrono.setAttribute("aria-label", "13 10 " + phase.year + ", " + phase.text);
      buildCaption(phase);
      heroChrono.classList.add("has-rule");
      void heroCaptionEl.offsetWidth; // flush so the letters transition in from their hidden state
      heroCaptionEl.classList.add("is-in");
    }

    // The caption leaves at the very moment the year starts counting,
    // so text and date always change together.
    function leavePhase() {
      heroCaptionEl.classList.remove("is-in");
      heroCaptionEl.classList.add("is-out");
      heroChrono.classList.remove("has-rule");
    }

    function countYear(from, to, done) {
      heroChrono.classList.add("is-counting");
      const startAt = performance.now();
      let shown = from;
      function tick(now) {
        const p = Math.min(1, (now - startAt) / COUNT_MS);
        const year = Math.round(from + (to - from) * easeInOut(p));
        if (year !== shown) { shown = year; heroYearEl.textContent = year; }
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          heroYearEl.textContent = to;
          heroChrono.classList.remove("is-counting");
          if (done) done();
        }
      }
      requestAnimationFrame(tick);
    }

    heroYearEl.textContent = PHASES[0].year;
    const START_DELAY = reducedMotion ? 300 : 3000;
    const HOLD_FIRST = reducedMotion ? 1500 : 3600;
    const HOLD_SECOND = reducedMotion ? 1500 : 3400;

    setTimeout(() => {
      heroChrono.classList.add("is-on");
      enterPhase(0);
      setTimeout(() => {
        leavePhase();
        countYear(PHASES[0].year, PHASES[1].year, () => {
          enterPhase(1);
          setTimeout(() => {
            leavePhase();
            countYear(PHASES[1].year, PHASES[2].year, () => enterPhase(2));
          }, HOLD_SECOND);
        });
      }, HOLD_FIRST);
    }, START_DELAY);
  }

  /* ---------- Bridge heart: press-and-hold for 4s, then the gate ----------
     Uses Pointer Events so mouse and touch share one code path.
     Releasing early (pointerup/cancel/leave) resets it. Holding
     Enter/Space on the focused button works the same way, for
     keyboard users who can't perform a pointer "hold" gesture. On a
     completed hold, the password window below opens — it no longer
     navigates straight to manita.html. */
  const bridgeHeart = document.getElementById("bridgeHeart");
  if (bridgeHeart) {
    const HOLD_DURATION = 4000;
    let holdStart = null;
    let rafId = null;
    let completed = false;
    let keyHolding = false;

    function resetProgress() {
      holdStart = null;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      bridgeHeart.classList.remove("is-pressing");
    }

    function tick(now) {
      if (holdStart === null) return;
      const progress = Math.min(1, (now - holdStart) / HOLD_DURATION);
      if (progress >= 1) {
        completed = true;
        bridgeHeart.classList.remove("is-pressing");
        bridgeHeart.classList.add("is-complete");
        setTimeout(() => {
          if (window.__openBridgeGate) window.__openBridgeGate();
        }, 350);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function startHold() {
      if (completed || holdStart !== null) return;
      bridgeHeart.classList.add("is-pressing");
      holdStart = performance.now();
      rafId = requestAnimationFrame(tick);
    }

    function cancelHold() {
      if (completed) return;
      resetProgress();
    }

    bridgeHeart.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startHold();
    });
    bridgeHeart.addEventListener("pointerup", cancelHold);
    bridgeHeart.addEventListener("pointercancel", cancelHold);
    bridgeHeart.addEventListener("pointerleave", cancelHold);
    // A click can still fire after a very quick tap; it should never
    // open the gate on its own — only a completed 4s hold does that.
    bridgeHeart.addEventListener("click", (e) => e.preventDefault());

    bridgeHeart.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !keyHolding) {
        e.preventDefault();
        keyHolding = true;
        startHold();
      }
    });
    bridgeHeart.addEventListener("keyup", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        keyHolding = false;
        cancelHold();
      }
    });

    function resetHeart() {
      completed = false;
      bridgeHeart.classList.remove("is-complete");
    }
    bridgeHeart.addEventListener("blur", () => {
      keyHolding = false;
      cancelHold();
    });

    /* ---------- Password window opened by the hold above ---------- */
    const bridgeGate = document.getElementById("bridgeGate");
    const bridgeGateClose = document.getElementById("bridgeGateClose");
    const bridgeGateBackdrop = document.getElementById("bridgeGateBackdrop");
    const bridgeGateForm = document.getElementById("bridgeGateForm");
    const bridgeGateInput = document.getElementById("bridgeGateInput");
    const bridgeGateFeedback = document.getElementById("bridgeGateFeedback");
    const bridgeGateLockIcon = document.getElementById("bridgeGateLockIcon");
    const bridgeGatePanel = bridgeGate ? bridgeGate.querySelector(".page-gate__panel") : null;
    const GATE_CODE = "0520"; // same code as manita.html's own gate

    if (bridgeGate && bridgeGateForm && bridgeGateInput) {
      const gateIncorrectResponses = ["Nope 😂 Try again.", "Nice try, detective. ❤️", "Almost... but not quite. 😉"];
      let gateIncorrectIndex = 0;
      let lastFocusedBeforeGate = null;

      function openBridgeGate() {
        lastFocusedBeforeGate = document.activeElement;
        bridgeGateFeedback.textContent = "";
        bridgeGateInput.value = "";
        if (bridgeGateLockIcon) bridgeGateLockIcon.classList.remove("is-unlocked");
        bridgeGate.hidden = false;
        bridgeGateInput.focus();
        document.addEventListener("keydown", handleBridgeGateEscape);
      }

      function closeBridgeGate() {
        bridgeGate.hidden = true;
        document.removeEventListener("keydown", handleBridgeGateEscape);
        resetHeart(); // closing without success lets her try the hold again
        if (lastFocusedBeforeGate) lastFocusedBeforeGate.focus();
      }

      // Closes this code window after manita.html has opened over the page, so it is
      // not still sitting open when the visitor comes Back to this page.
      function dismissBridgeGate() {
        bridgeGate.hidden = true;
        document.removeEventListener("keydown", handleBridgeGateEscape);
        bridgeGateInput.value = "";
        bridgeGateFeedback.textContent = "";
        if (bridgeGateLockIcon) bridgeGateLockIcon.classList.remove("is-unlocked");
        resetHeart();
      }

      function handleBridgeGateEscape(e) {
        if (e.key === "Escape") closeBridgeGate();
      }

      // Exposed so the hold-completion code above (tick()) can call it.
      window.__openBridgeGate = openBridgeGate;

      bridgeGateClose && bridgeGateClose.addEventListener("click", closeBridgeGate);
      bridgeGateBackdrop && bridgeGateBackdrop.addEventListener("click", closeBridgeGate);

      bridgeGateForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const value = bridgeGateInput.value.trim();
        if (value === GATE_CODE) {
          if (bridgeGateLockIcon) bridgeGateLockIcon.classList.add("is-unlocked");
          bridgeGateFeedback.textContent = "";
          bridgeGateInput.blur();
          // manita.html opens as a layer on top of this page (see js/intro-music.js),
          // so the music keeps playing without a break. That layer is told, once, that
          // the code was just entered, so it doesn't ask for it a second time. If the
          // layer isn't available, fall back to a normal page load (which asks again).
          setTimeout(() => {
            if (window.VishiiNav && typeof window.VishiiNav.openManita === "function") {
              window.VishiiNav.openManita({ onShown: dismissBridgeGate });
            } else {
              window.location.href = "manita.html";
            }
          }, 650);
        } else {
          if (bridgeGatePanel) {
            bridgeGatePanel.classList.add("modal--shake");
            setTimeout(() => bridgeGatePanel.classList.remove("modal--shake"), 400);
          }
          bridgeGateFeedback.textContent = gateIncorrectResponses[gateIncorrectIndex % gateIncorrectResponses.length];
          gateIncorrectIndex++;
          bridgeGateInput.value = "";
          bridgeGateInput.focus();
        }
      });
    }
  }

  /* ---------- Easter egg: typing "MANITA" anywhere ---------- */
  let typedName = "";
  window.addEventListener("keydown", (e) => {
    if (/^[a-zA-Z]$/.test(e.key)) {
      typedName = (typedName + e.key.toUpperCase()).slice(-6);
      if (typedName === "MANITA") {
        window.showEggToast("You typed your own name. That's very you. 😂❤️");
      }
    }
  });
})();
