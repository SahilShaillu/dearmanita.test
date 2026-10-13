/* =========================================================
   game.js
   "Save the Birthday Hearts" — a custom canvas mini-game.
   Catch falling love/cake/sparkle items, avoid gussa bombs,
   nakhre clouds and "3 months salary" warnings.
   Supports mouse, keyboard, and touch/drag controls.
   The game starts as soon as "Start Game" is pressed (no name entry,
   no high-score record).

   Notes on this version
   - Every element lookup is null-safe: if a piece of markup is
     missing, that one feature is skipped instead of the whole
     script crashing (a crash is what used to leave the Start
     button dead).
   - Movement is time-based (not per-frame), so the game runs at
     the same speed on 60Hz, 90Hz and 120Hz (iPhone ProMotion)
     screens.
   - The loop pauses when the tab is hidden or the game is
     scrolled out of view, and emoji are drawn from cached
     sprites, which keeps Safari smooth.
   ========================================================= */

(function () {
  "use strict";

  const stage = document.getElementById("gameStage");
  const canvas = document.getElementById("gameCanvas");
  if (!stage || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const basket = document.getElementById("gameBasket");
  const scoreEl = document.getElementById("gameScore");
  const comboEl = document.getElementById("gameCombo");
  const livesEl = document.getElementById("gameLives");
  const toastEl = document.getElementById("gameToast");
  const overlayStart = document.getElementById("gameOverlay");
  const overlayEnd = document.getElementById("gameOverOverlay");
  const overlayEndText = document.getElementById("gameOverText");
  const startBtn = document.getElementById("gameStartBtn");
  const restartBtn = document.getElementById("gameRestartBtn");
  const codeBox = document.getElementById("gameCode");

  function setText(el, value) { if (el) el.textContent = value; }
  function setHidden(el, value) { if (el) el.hidden = value; }

  const GOOD = [
    { emoji: "❤️", points: 10, message: "+1 Love ❤️" },
    { emoji: "💗", points: 10, message: "+1 Love 💗" },
    { emoji: "🎂", points: 15, message: "Birthday calories don't count today. 🎂" },
    { emoji: "✨", points: 5, message: "+Sparkle ✨" }
  ];
  const BAD = [
    { emoji: "😂", message: "OH NO. RUN. 😂", type: "gussa" },
    { emoji: "😤", message: "Nakhre incoming... 😤", type: "nakhre" },
    { emoji: "💢", message: "3 MONTHS SALARY 💢", type: "salary" }
  ];

  const lowPower = window.VishiiEffects && window.VishiiEffects.isLowPower;
  const FRAME_MS = 1000 / 60; // all speeds below are "per 60Hz frame"

  let w = 0, h = 0, dpr = 1;
  let items = [];
  let basketX = 0.5; // 0..1 fraction of width
  let score = 0;
  let combo = 1;
  let lives = 3;
  let level = 1;
  let spawnTimer = 0;
  let spawnInterval = 70; // frames
  let running = false;
  let ending = false;
  let paused = false;
  let rafId = null;
  let lastTime = 0;
  let keysDown = {};
  let typedBuffer = "";
  let eggUnlocked = false;

  /* ---------- Cached emoji sprites (much cheaper than fillText each frame) ---------- */
  const SPRITE_BOX = 64;
  const SPRITE_FONT_PX = 48;
  const sprites = new Map();

  function getSprite(emoji) {
    let sprite = sprites.get(emoji);
    if (sprite) return sprite;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = SPRITE_BOX * scale;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      sctx.scale(scale, scale);
      sctx.font = SPRITE_FONT_PX + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      sctx.textAlign = "center";
      sctx.textBaseline = "middle";
      sctx.fillText(emoji, SPRITE_BOX / 2, SPRITE_BOX / 2 + 2);
    }
    sprites.set(emoji, sprite);
    return sprite;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = stage.clientWidth;
    h = stage.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    placeBasket();
    if (!running) draw();
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }, { passive: true });

  function placeBasket() {
    if (!basket) return;
    // transform only (no layout): the basket's CSS keeps left:50%, we offset from there
    const offset = (basketX - 0.5) * w;
    basket.style.transform = "translate3d(calc(-50% + " + offset.toFixed(1) + "px),0,0)";
  }

  function resetState() {
    items = [];
    score = 0;
    combo = 1;
    lives = 3;
    level = 1;
    spawnTimer = 0;
    spawnInterval = 70;
    basketX = 0.5;
    placeBasket();
    updateHUD();
  }

  function updateHUD() {
    setText(scoreEl, score);
    setText(comboEl, "x" + combo);
    setText(livesEl, lives);
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 900);
  }

  function spawnItem() {
    const isBad = Math.random() < Math.min(0.2 + level * 0.03, 0.4);
    const pool = isBad ? BAD : GOOD;
    const def = pool[Math.floor(Math.random() * pool.length)];
    items.push({
      x: Math.random() * (w - 40) + 20,
      y: -30,
      vy: (1.4 + level * 0.18) * (lowPower ? 0.85 : 1),
      size: 30 + Math.random() * 10,
      def,
      isBad,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 4
    });
  }

  function collide(item) {
    const bx = basketX * w;
    const by = h * 0.92;
    const dx = item.x - bx;
    const dy = item.y - by;
    return Math.sqrt(dx * dx + dy * dy) < item.size * 0.6 + 26;
  }

  function screenShake() {
    stage.style.transform = "translateX(-6px)";
    setTimeout(() => (stage.style.transform = "translateX(6px)"), 60);
    setTimeout(() => (stage.style.transform = ""), 120);
  }

  // dt = elapsed time in "60Hz frames" (1 = one frame at 60fps)
  function update(dt) {
    if (keysDown.left) basketX = Math.max(0, basketX - 0.015 * dt);
    if (keysDown.right) basketX = Math.min(1, basketX + 0.015 * dt);

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnItem();
    }

    let hudDirty = false;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy * dt;
      it.rotation += it.rotSpeed * dt;

      if (collide(it)) {
        items.splice(i, 1);
        if (it.isBad) {
          lives--;
          combo = 1;
          screenShake();
          showToast(it.def.message);
          if (lives <= 0) {
            updateHUD();
            endGame();
            return;
          }
        } else {
          score += it.def.points * combo;
          combo = Math.min(combo + 1, 9);
          showToast(it.def.message);
        }
        hudDirty = true;
        continue;
      }

      if (it.y > h + 40) {
        items.splice(i, 1);
        if (!it.isBad && combo !== 1) { combo = 1; hudDirty = true; } // missed love item resets combo
      }
    }
    if (hudDirty) updateHUD();

    // difficulty ramps with score
    level = 1 + Math.floor(score / 120);
    spawnInterval = Math.max(28, 70 - level * 4);

    placeBasket();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sprite = getSprite(it.def.emoji);
      const size = (it.size / SPRITE_FONT_PX) * SPRITE_BOX;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate((it.rotation * Math.PI) / 180);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function frame(now) {
    rafId = null;
    if (!running || paused) return;
    // Clamp dt so a long stall (tab switch, GC) never teleports items.
    const dt = lastTime ? Math.min(2.5, (now - lastTime) / FRAME_MS) : 1;
    lastTime = now;
    update(dt);
    if (!running) return; // update() may have ended the game
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function kick() {
    if (running && !paused && rafId === null) {
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }
  }

  function setPaused(value) {
    if (paused === value) return;
    paused = value;
    if (paused) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      lastTime = 0;
    } else {
      kick();
    }
  }

  // Pause when the tab is hidden or the game has been scrolled out of view.
  let inView = true;
  function syncPause() { setPaused(document.hidden || !inView); }
  document.addEventListener("visibilitychange", syncPause);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => { inView = entry.isIntersecting; });
      syncPause();
    }, { threshold: 0.1 }).observe(stage);
  }

  function startGame() {
    resetState();
    ending = false;
    setHidden(overlayStart, true);
    setHidden(overlayEnd, true);
    setHidden(codeBox, true);
    running = true;
    paused = document.hidden || !inView;
    keysDown = {};
    lastTime = 0;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    kick();
  }

  function endGame() {
    if (ending) return;
    ending = true;
    running = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    draw();
    const finalScore = score;
    const enoughLove = finalScore >= 150;
    setText(overlayEndText, enoughLove
      ? "Congratulations! You have successfully collected enough love for MANITA. \u2764\uFE0F  Score: " + finalScore
      : "Hmm... clearly you need more practice loving the birthday girl. \ud83d\ude02  Score: " + finalScore);
    setHidden(overlayEnd, false);
  }

  /* ---------- Start / restart wiring ---------- */
  if (startBtn) startBtn.addEventListener("click", startGame);
  if (restartBtn) restartBtn.addEventListener("click", startGame);

  /* ---------- Controls: mouse ---------- */
  stage.addEventListener("mousemove", (e) => {
    if (!running) return;
    const rect = stage.getBoundingClientRect();
    basketX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }, { passive: true });

  /* ---------- Controls: touch / drag ---------- */
  stage.addEventListener("touchmove", (e) => {
    if (!running) return;
    const rect = stage.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    basketX = Math.min(1, Math.max(0, (touch.clientX - rect.left) / rect.width));
    e.preventDefault(); // stop the page from scrolling while dragging the basket
  }, { passive: false });

  stage.addEventListener("touchstart", (e) => {
    if (!running) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = stage.getBoundingClientRect();
    basketX = Math.min(1, Math.max(0, (touch.clientX - rect.left) / rect.width));
  }, { passive: true });

  /* ---------- Controls: keyboard ---------- */
  window.addEventListener("keydown", (e) => {
    // ignore keys typed into any form field (e.g. the secret-code inputs)
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") keysDown.left = true;
    if (e.key === "ArrowRight") keysDown.right = true;

    // Easter egg: typing the birthday code anywhere unlocks an animation
    if (/^[0-9]$/.test(e.key)) {
      typedBuffer = (typedBuffer + e.key).slice(-8);
      if (typedBuffer === "13102003" && !eggUnlocked) {
        eggUnlocked = true;
        unlockBirthdayCode();
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") keysDown.left = false;
    if (e.key === "ArrowRight") keysDown.right = false;
  });
  window.addEventListener("blur", () => { keysDown = {}; });

  function unlockBirthdayCode() {
    setHidden(codeBox, false);
    if (window.showEggToast) {
      window.showEggToast("Birthday code accepted! 🎉");
    }
  }

  /* ---------- Init (after everything above is defined) ---------- */
  GOOD.concat(BAD).forEach((def) => getSprite(def.emoji)); // warm the sprite cache
  resize();
  updateHUD();
})();
